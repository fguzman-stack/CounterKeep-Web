# CounterKeep licensing backend

Project: `lqoyxisudmmhikrgdofg`, shared with DocuMind-AI by explicit user choice. Only `counterkeep_private.*` and `public.counterkeep_*` objects are created. Do not change DocuMind tables or `redeem-appsumo-code`.

## Trust boundaries

- Edge function `counterkeep-license`, `verify_jwt=false`; purchase-code possession authorizes redemption, not a client-supplied API key
- Private schema, RLS without client policies, no anon/authenticated grants
- Public RPCs are executable only by `service_role`
- 192-bit randomly generated customer codes; SHA-256 hashes stored in the database, never plaintext
- Ed25519 signing key generated inside the Edge runtime and held in the private signing table, readable only by the privileged signing RPC; only the public key is embedded in app and website
- Atomic code-row lock plus unique license/code relationship; retries with matching email and device recover the same license
- Global, IP-hash and device-hash rate counters, pruned after one day
- Raw Windows MachineGuid is hashed with a CounterKeep-specific context before sending
- No business records are transmitted to Supabase

The email is a contact/binding field, not proof of email ownership; the private purchase code is the credential. Hidden URLs and `noindex` are discoverability choices, not authorization controls. A local owner can modify their own computer or executable; this is not a claim of tamper-proof DRM.

## Offline operation and revocation

The release app verifies the device-bound signature in Rust, stores it in Windows Credential Manager and gates native database operations. On startup it makes a best-effort HTTPS status check (4-second timeout). Offline use of a valid license remains possible without an expiry or subscription. A known revocation is persisted locally.

Revocation cannot be immediate on a fully offline device. The Codes model does not automatically call a licensing webhook on refunds: process approved refund/revocation requests explicitly. Do not promise automated AppSumo refund synchronization.

## Administration

The 1,000 customer codes are batch `appsumo-232349-batch-01`; QA codes are in a separate `qa-20261014` batch and must not enter the AppSumo CSV. `private/` is ignored by git and protected with local Windows ACLs. Keep an independent encrypted backup of the original CSV and a secure Supabase database backup, including signing keys; replacing the signing key breaks verification in already distributed installers.

For an approved refund, identify the specific license privately and, in a transaction, update that CounterKeep license to `revoked` with a reason and timestamp and its matching code to `revoked`. Never issue broad updates by batch for a single refund. The direct redemption URL must not display an inventory of codes, licenses or signing keys.

A device transfer requires a reviewed support request and a new signed license bound to the new device, with explicit handling of the former one. No self-service transfer/reset is published; do not casually erase existing device bindings.

## Deployment

Apply the checked-in SQL migration first. Deploy the single function source and explicitly set `verify_jwt=false`. The function uses Supabase's built-in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` only inside the runtime; neither belongs in GitHub Pages or client code. Do not log request bodies, CSV contents, licenses or private key material.

`scripts/local-admin-bridge.mjs` is a temporary loopback-only MCP file transport. It rejects browser origins, requires a custom header and serves only whitelisted paths. Stop it immediately after provisioning/upload. Never bind it to a LAN/public address or run it in production.

## Checks

`scripts/test-backend.mjs` uses separate reserved QA codes, checks actual HTTPS redemption, signature verification, recovery, second-device/email rejection, concurrency, status, tampering, CORS and request size. `scripts/test-desktop.mjs` checks the release executable via a temporary local WebView debugging session; debugging flags are supplied by the QA process, not shipped in the installer.
