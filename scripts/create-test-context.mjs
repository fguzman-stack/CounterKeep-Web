import { randomBytes, createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
const hash=code=>createHash('sha256').update(code).digest('hex');
const codes=Object.fromEntries(['backend','race','web','native'].map(name=>[name,`CKQA-${randomBytes(24).toString('hex').toUpperCase()}`]));
await writeFile('private/test-context.json',JSON.stringify({codes,hashes:Object.values(codes).map(hash),batch:'qa-20261014',endpoint:'https://lqoyxisudmmhikrgdofg.supabase.co/functions/v1/counterkeep-license',publicKey:'F4Otp6KyYid54rfQ8BHHFrf1Pm9dvJCdFy8_L6m4J3Q'},null,2),{mode:0o600,flag:'wx'});
console.log('Created four private QA codes, separate from the 1000 customer codes.');
