/**
 * Owner auth gate, local scope claim, and the SQL that locks the database.
 * Run with `npm test`.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shouldShowSignIn, friendlyAuthError, createAuthOptions, interpretSignUp } from '../src/lib/authGate.js';
import { claimScopeOnce } from '../src/lib/claimScope.js';
import { HOUSEHOLD_OWNER_ID } from '../src/lib/household.js';
import {
  OWNER_BACKFILL_MESSAGE,
  OWNER_TABLES,
  interpretSyncReady,
} from '../src/lib/ownerSync.js';

let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  FAIL  ${name}`);
    console.error(`        ${err.message}`);
  }
}

function memoryStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null),
    setItem: (key, value) => {
      data[key] = String(value);
    },
  };
}

const lockSql = readFileSync(new URL('../supabase/lock-owner-rls.sql', import.meta.url), 'utf8');
const backfillSql = readFileSync(new URL('../supabase/backfill-owner.sql', import.meta.url), 'utf8');
const retiredSql = readFileSync(new URL('../supabase/add-household-open.sql', import.meta.url), 'utf8');
const schemaSql = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');

console.log('auth');

test('sign-in is required only when Supabase is configured and nobody is signed in', () => {
  assert.equal(shouldShowSignIn({ available: true, loading: false, user: null }), true);
  assert.equal(shouldShowSignIn({ available: true, loading: true, user: null }), false);
  assert.equal(shouldShowSignIn({ available: true, loading: false, user: { id: 'u' } }), false);
  assert.equal(shouldShowSignIn({ available: false, loading: false, user: null }), false);
});

test('auth errors stay short', () => {
  assert.equal(friendlyAuthError({ message: 'Invalid login credentials' }), 'Email or password is wrong.');
  assert.match(friendlyAuthError({ message: 'Email not confirmed' }), /not confirmed/);
  assert.equal(friendlyAuthError({ message: 'network down' }), 'network down');
  assert.match(friendlyAuthError({ message: 'User already registered' }), /Sign in instead/);
  assert.match(friendlyAuthError({ message: 'Signups not allowed for this instance' }), /Sign-ups are closed/);
  assert.match(
    friendlyAuthError({ message: 'Sign-ups are closed. Add the email to private.allowed_emails first.' }),
    /Sign-ups are closed/
  );
});

test('creating an account signs in when the project auto-confirms', () => {
  assert.deepEqual(
    interpretSignUp({ data: { session: { access_token: 't' }, user: { identities: [{ id: '1' }] } } }),
    { error: null }
  );
  assert.match(interpretSignUp({ data: { session: null, user: { identities: [{ id: '1' }] } } }).error.message, /Confirm the email/);
  assert.match(
    interpretSignUp({ data: { session: null, user: { identities: [] } } }).error.message,
    /Sign in instead/
  );
  assert.match(interpretSignUp({ error: { message: 'User already registered' } }).error.message, /Sign in instead/);
});

test('native shell skips the Web Locks API and URL session parsing', () => {
  const web = createAuthOptions({ native: false });
  const native = createAuthOptions({ native: true });
  assert.equal(web.persistSession, true);
  assert.equal(web.detectSessionInUrl, true);
  assert.equal(web.lock, undefined);
  assert.equal(native.detectSessionInUrl, false);
  assert.equal(typeof native.lock, 'function');
});

test('a previous device scope is folded in once', () => {
  const storage = memoryStorage();
  const load = () => ({ habits: [{ id: 'h1' }] });
  const hasData = (records) => records.habits.length > 0;
  const first = claimScopeOnce(storage, { flagKey: 'claimed:user', load, hasData });
  const second = claimScopeOnce(storage, { flagKey: 'claimed:user', load, hasData });
  assert.deepEqual(first, { habits: [{ id: 'h1' }] });
  assert.equal(second, null);
  assert.equal(storage.getItem('claimed:user'), 'claimed');
});

test('an empty previous scope is flagged so a later write is not claimed', () => {
  const storage = memoryStorage();
  const claimed = claimScopeOnce(storage, {
    flagKey: 'claimed:user',
    load: () => ({ habits: [] }),
    hasData: (records) => records.habits.length > 0,
  });
  assert.equal(claimed, null);
  assert.equal(storage.getItem('claimed:user'), 'empty');
});

test('sync stays parked until the backfill marks this account ready', () => {
  assert.deepEqual(interpretSyncReady({ data: true }), { ready: true, message: '' });
  const waiting = interpretSyncReady({ data: false });
  assert.equal(waiting.ready, false);
  assert.equal(waiting.message, OWNER_BACKFILL_MESSAGE);
  const missing = interpretSyncReady({
    error: { code: 'PGRST202', message: 'Could not find the function public.sync_ready' },
  });
  assert.equal(missing.ready, false);
  assert.equal(missing.message, OWNER_BACKFILL_MESSAGE);
  const offline = interpretSyncReady({ error: { message: 'Failed to fetch' } });
  assert.equal(offline.ready, false);
  assert.equal(offline.message, 'Failed to fetch');
});

test('lock SQL closes the public policy and does not delete personal rows', () => {
  assert.match(lockSql, /drop policy if exists "household all"/);
  assert.doesNotMatch(lockSql, /create policy "household all"/);
  assert.match(lockSql, /to authenticated using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(lockSql, /with check \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(lockSql, /revoke all on table public\.%I from anon/);
  assert.ok(lockSql.includes(HOUSEHOLD_OWNER_ID));
  assert.match(lockSql, /banned_until/);
  assert.doesNotMatch(lockSql, /delete\s+from\s+public\./i);
  assert.doesNotMatch(lockSql, /using \(true\)/i);
  for (const table of OWNER_TABLES) {
    assert.match(lockSql, new RegExp(`'${table}'`));
  }
});

test('backfill only reassigns user_id and refuses to run unedited', () => {
  assert.match(backfillSql, /REPLACE_WITH_YOUR_EMAIL/);
  assert.match(backfillSql, /update public\.%I set user_id = \$1/);
  assert.ok(backfillSql.includes(HOUSEHOLD_OWNER_ID));
  assert.match(backfillSql, /user_id is null or user_id = \$2/);
  assert.doesNotMatch(backfillSql, /delete\s+from\s+public\./i);
  assert.doesNotMatch(backfillSql, /drop table/i);
  for (const table of OWNER_TABLES) {
    assert.match(backfillSql, new RegExp(`'${table}'`));
  }
});

test('the old household script can no longer open the database', () => {
  assert.match(retiredSql, /raise exception/);
  assert.doesNotMatch(retiredSql, /create policy/i);
  assert.doesNotMatch(retiredSql, /using \(true\)/i);
  assert.doesNotMatch(retiredSql, /not-used-for-login/);
});

test('schema.sql policies are authenticated-only and drop the open household policy', () => {
  assert.match(schemaSql, /drop policy if exists "household all"/);
  assert.match(schemaSql, /to authenticated using \(\(select auth\.uid\(\)\) = user_id\)/);
  assert.match(schemaSql, /revoke all on table public\.%I from anon/);
  assert.doesNotMatch(schemaSql, /grant select, insert, update, delete on public\.\w+ to anon/);
});

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('auth ok');
