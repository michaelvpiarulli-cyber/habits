/**
 * Household sync (no login), local scope claim, and the optional lock SQL.
 * Run with `npm test`.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { friendlyAuthError, createAuthOptions, interpretSignUp } from '../src/lib/authGate.js';
import { claimScopeOnce } from '../src/lib/claimScope.js';
import { HOUSEHOLD_LABEL, HOUSEHOLD_OWNER_ID } from '../src/lib/household.js';
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
const openSql = readFileSync(new URL('../supabase/add-household-open.sql', import.meta.url), 'utf8');
const schemaSql = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const authSource = readFileSync(new URL('../src/hooks/useAuth.js', import.meta.url), 'utf8');
const dataSource = readFileSync(new URL('../src/context/DataProvider.jsx', import.meta.url), 'utf8');
const lifeSource = readFileSync(new URL('../src/context/LifeProvider.jsx', import.meta.url), 'utf8');

console.log('auth');

test('the app opens the dashboard with the household id and no sign-in gate', () => {
  assert.equal(HOUSEHOLD_LABEL, 'Household');
  assert.equal(HOUSEHOLD_OWNER_ID, 'a1111111-1111-4111-8111-111111111111');
  assert.match(authSource, /HOUSEHOLD_OWNER_ID/);
  assert.doesNotMatch(authSource, /signInWithPassword/);
  assert.doesNotMatch(appSource, /SignInScreen/);
  assert.doesNotMatch(appSource, /shouldShowSignIn/);
  assert.doesNotMatch(dataSource, /ownerSyncGate/);
  assert.doesNotMatch(lifeSource, /ownerSyncGate/);
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

test('the optional sync-ready helper still describes a missing backfill', () => {
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

test('lock SQL is optional, closes the public policy, and does not delete personal rows', () => {
  assert.match(lockSql, /OPTIONAL/);
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

test('backfill is optional, only reassigns user_id, and refuses to run unedited', () => {
  assert.match(backfillSql, /OPTIONAL/);
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

test('the household script opens every table, including Life OS, without a known password', () => {
  assert.match(openSql, /create policy "household all"/);
  assert.match(openSql, /for all to anon, authenticated using \(true\) with check \(true\)/);
  assert.doesNotMatch(openSql, /not-used-for-login/);
  assert.doesNotMatch(openSql, /raise exception/);
  for (const table of OWNER_TABLES) {
    assert.match(openSql, new RegExp(`'${table}'`));
  }
});

test('schema.sql keeps the open household policy and grants the anon key', () => {
  assert.match(schemaSql, /create policy "household all"/);
  assert.match(schemaSql, /for all to anon, authenticated using \(true\) with check \(true\)/);
  assert.match(schemaSql, /grant select, insert, update, delete on public\.%I to anon, authenticated/);
  assert.doesNotMatch(schemaSql, /revoke all on table public\.%I from anon/);
  assert.doesNotMatch(schemaSql, /to authenticated using \(\(select auth\.uid\(\)\) = user_id\)/);
});

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('auth ok');
