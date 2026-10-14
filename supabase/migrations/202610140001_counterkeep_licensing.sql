-- CounterKeep-only objects. Does not alter DocuMind tables or functions.
begin;
create schema if not exists counterkeep_private;
revoke all on schema counterkeep_private from public, anon, authenticated;

create table if not exists counterkeep_private.signing_keys (
  kid text primary key,
  private_jwk jsonb not null,
  public_key text not null,
  created_at timestamptz not null default now()
);
create table if not exists counterkeep_private.codes (
  code_hash text primary key check (code_hash ~ '^[a-f0-9]{64}$'),
  batch text not null,
  state text not null default 'available' check (state in ('available','redeemed','revoked')),
  created_at timestamptz not null default now()
);
create table if not exists counterkeep_private.licenses (
  id uuid primary key default gen_random_uuid(),
  code_hash text unique not null references counterkeep_private.codes(code_hash),
  email text not null check (length(email) between 3 and 254),
  device_id text not null check (device_id ~ '^[a-f0-9]{64}$'),
  state text not null default 'active' check (state in ('active','revoked')),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revocation_reason text
);
create table if not exists counterkeep_private.rate_limits (
  bucket timestamptz not null,
  scope text not null,
  key_hash text not null,
  attempts integer not null default 1,
  primary key (bucket, scope, key_hash)
);
alter table counterkeep_private.signing_keys enable row level security;
alter table counterkeep_private.codes enable row level security;
alter table counterkeep_private.licenses enable row level security;
alter table counterkeep_private.rate_limits enable row level security;
revoke all on all tables in schema counterkeep_private from public, anon, authenticated;

-- Only the service-role Edge Function may read the signing key. No public RPC.
create or replace function public.counterkeep_signing_key(p_private_jwk jsonb default null, p_public_key text default null)
returns jsonb language plpgsql security definer set search_path = pg_catalog, counterkeep_private as $$
declare k counterkeep_private.signing_keys%rowtype;
begin
  if p_private_jwk is not null then
    if p_private_jwk->>'kty' <> 'OKP' or p_private_jwk->>'crv' <> 'Ed25519'
       or length(p_private_jwk->>'d') <> 43 or length(p_public_key) <> 43 then
      raise exception 'Invalid signing configuration';
    end if;
    insert into counterkeep_private.signing_keys(kid,private_jwk,public_key)
      values ('ck-ed25519-2026-01',p_private_jwk,p_public_key) on conflict (kid) do nothing;
  end if;
  select * into k from counterkeep_private.signing_keys where kid='ck-ed25519-2026-01';
  if not found then return null; end if;
  return jsonb_build_object('kid',k.kid,'privateJwk',k.private_jwk,'publicKey',k.public_key);
end $$;

-- Counters are bounded per minute globally, per IP hash and per device hash.
create or replace function public.counterkeep_rate_limit(p_ip_hash text, p_device_hash text)
returns boolean language plpgsql security definer set search_path = pg_catalog, counterkeep_private as $$
declare b timestamptz := date_trunc('minute',now()); n integer; allowed boolean := true;
begin
  delete from counterkeep_private.rate_limits where bucket < now()-interval '1 day';
  insert into counterkeep_private.rate_limits(bucket,scope,key_hash) values(b,'global','global')
    on conflict(bucket,scope,key_hash) do update set attempts=rate_limits.attempts+1 returning attempts into n;
  if n>300 then return false; end if;
  insert into counterkeep_private.rate_limits(bucket,scope,key_hash) values(b,'ip',p_ip_hash)
    on conflict(bucket,scope,key_hash) do update set attempts=rate_limits.attempts+1 returning attempts into n;
  if n>20 then allowed:=false; end if;
  insert into counterkeep_private.rate_limits(bucket,scope,key_hash) values(b,'device',p_device_hash)
    on conflict(bucket,scope,key_hash) do update set attempts=rate_limits.attempts+1 returning attempts into n;
  return allowed and n<=10;
end $$;

-- Row locks and a unique code_hash make simultaneous redemption atomic.
create or replace function public.counterkeep_redeem(p_code_hash text, p_email text, p_device_id text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, counterkeep_private as $$
declare c counterkeep_private.codes%rowtype; l counterkeep_private.licenses%rowtype;
begin
  if p_code_hash !~ '^[a-f0-9]{64}$' or p_device_id !~ '^[a-f0-9]{64}$'
     or length(p_email) not between 3 and 254 then return null; end if;
  select * into c from counterkeep_private.codes where code_hash=p_code_hash for update;
  if not found or c.state='revoked' then return null; end if;
  if c.state='available' then
    insert into counterkeep_private.licenses(code_hash,email,device_id)
      values(p_code_hash,p_email,p_device_id) returning * into l;
    update counterkeep_private.codes set state='redeemed' where code_hash=p_code_hash;
  else
    select * into l from counterkeep_private.licenses where code_hash=p_code_hash;
    if l.email is distinct from p_email or l.device_id is distinct from p_device_id or l.state<>'active' then return null; end if;
  end if;
  return jsonb_build_object('id',l.id,'email',l.email,'deviceId',l.device_id,'issuedAt',floor(extract(epoch from l.created_at))::bigint);
end $$;

create or replace function public.counterkeep_license_state(p_id uuid, p_device_id text)
returns text language sql security definer set search_path = pg_catalog, counterkeep_private as $$
  select state from counterkeep_private.licenses where id=p_id and device_id=p_device_id;
$$;

revoke all on function public.counterkeep_signing_key(jsonb,text) from public, anon, authenticated;
revoke all on function public.counterkeep_rate_limit(text,text) from public, anon, authenticated;
revoke all on function public.counterkeep_redeem(text,text,text) from public, anon, authenticated;
revoke all on function public.counterkeep_license_state(uuid,text) from public, anon, authenticated;
grant execute on function public.counterkeep_signing_key(jsonb,text) to service_role;
grant execute on function public.counterkeep_rate_limit(text,text) to service_role;
grant execute on function public.counterkeep_redeem(text,text,text) to service_role;
grant execute on function public.counterkeep_license_state(uuid,text) to service_role;
commit;
