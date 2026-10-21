/**
 * Public MyFitnessPal diary parser and the idempotent sync into source=mfp.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ingestedFoodForDay, preferFoodEntry } from '../src/lib/foodGoals.js';
import { MFP_SETUP_MESSAGE, laToday, parseMfpHtml } from '../src/lib/mfpDiary.js';
import { runMfpSync, syncWindow } from '../src/lib/mfpSync.js';

let failed = 0;
const queue = [];

function test(name, fn) {
  queue.push(
    Promise.resolve()
      .then(fn)
      .then(() => console.log(`  ok  ${name}`))
      .catch((err) => {
        failed += 1;
        console.error(`  FAIL  ${name}`);
        console.error(`        ${err.message}`);
      })
  );
}

function fixture(name) {
  return readFileSync(new URL(`./fixtures/mfp/${name}`, import.meta.url), 'utf8');
}

function memoryStore(initial = {}) {
  const settings = {
    username: '',
    backfillDone: false,
    lastError: '',
    lastStatus: '',
    lastSyncedAt: null,
    ...initial,
  };
  const rows = initial.rows || [];
  return {
    settings,
    rows,
    async getSettings() {
      return { ...settings };
    },
    async saveSettings(patch) {
      Object.assign(settings, patch);
    },
    async getNutrition(day, source) {
      return rows.find((row) => row.day === day && row.source === source && !row.deleted) || null;
    },
    async saveNutrition(row) {
      const index = rows.findIndex((item) => item.id === row.id);
      if (index >= 0) rows[index] = { ...rows[index], ...row };
      else rows.push({ ...row });
    },
  };
}

function htmlFetch(html, status = 200) {
  const calls = [];
  const impl = async (url) => {
    calls.push(String(url));
    if (String(url).includes('/api/services/diary/report')) {
      return { ok: false, status: 400, text: async () => '', json: async () => ({}) };
    }
    return { ok: status < 400, status, text: async () => html, json: async () => ({}) };
  };
  impl.calls = calls;
  return impl;
}

console.log('mfp');

test('printable diary lists meals, foods, and day totals', () => {
  const parsed = parseMfpHtml(fixture('diary-day.html'), { from: '2026-10-20', to: '2026-10-20' });
  assert.equal(parsed.status, 'ok');
  assert.equal(parsed.days.length, 1);
  const day = parsed.days[0];
  assert.equal(day.date, '2026-10-20');
  assert.deepEqual(day.meals.map((meal) => meal.name), ['Breakfast', 'Lunch', 'Dinner', 'Snacks']);
  assert.equal(day.meals[0].foods[0].name, 'Eggs, 2 large');
  assert.equal(day.meals[0].foods[0].calories, 140);
  assert.equal(day.meals[0].foods[0].protein, 12);
  assert.equal(day.meals[0].foods[0].carbs, 1);
  assert.equal(day.meals[0].foods[0].fat, 10);
  assert.equal(day.meals[3].foods[0].fat, 0);
  assert.equal(day.totals.calories, 710);
  assert.equal(day.totals.protein, 96);
  assert.equal(day.totals.carbs, 7);
  assert.equal(day.totals.fat, 31);
});

test('a range page keeps each day, and the legacy table uses its header', () => {
  const range = parseMfpHtml(fixture('diary-range.html'), { from: '2026-10-19', to: '2026-10-20' });
  assert.deepEqual(range.days.map((day) => day.date), ['2026-10-19', '2026-10-20']);
  assert.equal(range.days[0].meals[0].foods[0].name, 'Oats, 1 cup');
  assert.equal(range.days[1].totals.calories, 200);

  const legacy = parseMfpHtml(fixture('legacy-table.html'), { from: '2026-10-20', to: '2026-10-20' });
  assert.equal(legacy.status, 'ok');
  assert.equal(legacy.days[0].meals[0].name, 'Lunch');
  assert.equal(legacy.days[0].meals[0].foods[0].name, 'Turkey sandwich');
  assert.equal(legacy.days[0].totals.protein, 28);
});

test('page JSON foods win, and private copy in the translation catalog is not a private diary', () => {
  const parsed = parseMfpHtml(fixture('public-json.html'), { from: '2026-10-20', to: '2026-10-20' });
  assert.equal(parsed.status, 'ok');
  assert.equal(parsed.days[0].meals[0].name, 'Breakfast');
  assert.match(parsed.days[0].meals[0].foods[0].name, /Eggs/);
  assert.equal(parsed.days[0].meals[0].foods[0].calories, 140);
  assert.equal(parsed.days[0].meals[0].foods[0].protein, 12);
  assert.equal(parsed.days[0].meals[1].name, 'Snacks');
  assert.equal(parsed.days[0].totals.calories, 235);
});

test('private, password, and missing diaries are statuses', () => {
  const priv = parseMfpHtml(fixture('private.html'));
  assert.equal(priv.status, 'private');
  assert.match(priv.message, /public/);
  assert.equal(priv.days.length, 0);

  const locked = parseMfpHtml(fixture('password.html'));
  assert.equal(locked.status, 'password');
  assert.match(locked.message, /key/);

  const missing = parseMfpHtml(fixture('not-found.html'), { httpStatus: 404 });
  assert.equal(missing.status, 'not_found');
  assert.match(missing.message, /could not find/i);
});

test('Los Angeles today and the first sync cover 14 days', () => {
  const evening = new Date('2026-10-21T06:00:00Z');
  assert.equal(laToday(evening), '2026-10-20');
  assert.deepEqual(syncWindow(evening, false), { today: '2026-10-20', from: '2026-10-07', to: '2026-10-20' });
  assert.deepEqual(syncWindow(evening, true), { today: '2026-10-20', from: '2026-10-19', to: '2026-10-20' });
});

test('sync replaces the mfp row, leaves the JENO row, and repeats cleanly', async () => {
  const jeno = {
    id: 'jeno-day',
    day: '2026-10-20',
    source: 'jeno',
    calories: 1800,
    protein: 160,
    meals: [{ name: 'Breakfast', calories: 1800, protein: 160, carbs: 0, fat: 0, foods: [] }],
    deleted: false,
  };
  const store = memoryStore({ rows: [jeno] });
  const fetchImpl = htmlFetch(fixture('diary-day.html'));
  const now = new Date('2026-10-21T06:00:00Z');
  const first = await runMfpSync({
    method: 'POST',
    body: { username: 'michael' },
    store,
    fetchImpl,
    now,
  });
  assert.equal(first.status, 200);
  assert.equal(first.body.ok, true);
  assert.equal(first.body.from, '2026-10-07');
  assert.equal(store.rows.filter((row) => row.source === 'jeno')[0].calories, 1800);
  assert.equal(store.rows.filter((row) => row.source === 'jeno')[0].meals[0].name, 'Breakfast');
  const mfp = store.rows.find((row) => row.source === 'mfp' && row.day === '2026-10-20');
  assert.equal(mfp.calories, 710);
  assert.equal(mfp.meals.length, 4);
  assert.equal(fetchImpl.calls.length, 1);

  const again = htmlFetch(fixture('diary-day.html').replace('710', '720').replace('140', '150'));
  const second = await runMfpSync({
    method: 'POST',
    body: { username: 'michael' },
    store,
    fetchImpl: again,
    now,
  });
  assert.equal(second.body.ok, true);
  assert.equal(second.body.from, '2026-10-19');
  const updated = store.rows.filter((row) => row.source === 'mfp' && row.day === '2026-10-20');
  assert.equal(updated.length, 1);
  assert.equal(updated[0].id, mfp.id);
  assert.equal(updated[0].calories, 720);
  assert.equal(store.rows.filter((row) => row.source === 'jeno').length, 1);
});

test('a blank username asks for a public diary and does not fetch', async () => {
  const store = memoryStore();
  let called = false;
  const result = await runMfpSync({
    method: 'POST',
    body: { username: '' },
    store,
    fetchImpl: async () => {
      called = true;
      return { ok: true, status: 200, text: async () => '', json: async () => ({}) };
    },
  });
  assert.equal(result.body.status, 'setup');
  assert.equal(result.body.message, MFP_SETUP_MESSAGE);
  assert.equal(called, false);
});

test('private diary does not write food, and cron requires Vercel', async () => {
  const store = memoryStore({ username: 'michael', backfillDone: true });
  const denied = await runMfpSync({ method: 'GET', headers: {}, store });
  assert.equal(denied.status, 401);

  const result = await runMfpSync({
    method: 'GET',
    headers: { 'user-agent': 'vercel-cron/1.0' },
    store,
    fetchImpl: htmlFetch(fixture('private.html')),
    now: new Date('2026-10-21T06:00:00Z'),
  });
  assert.equal(result.body.status, 'private');
  assert.equal(store.rows.length, 0);
  assert.equal(store.settings.backfillDone, true);
});

test('food for the day prefers MyFitnessPal without dropping a JENO-only day', () => {
  const rows = [
    { day: '2026-10-20', source: 'jeno', calories: 10, protein: 1, meals: [{ name: 'Breakfast' }] },
    { day: '2026-10-20', source: 'mfp', calories: 710, protein: 96, meals: [{ name: 'Dinner', foods: [{ name: 'Salmon' }] }] },
    { day: '2026-10-19', source: 'jeno', calories: 400, protein: 40, meals: [{ name: 'Lunch' }] },
  ];
  const today = ingestedFoodForDay(rows, '2026-10-20');
  assert.equal(today.source, 'mfp');
  assert.equal(preferFoodEntry(today, null).source, 'mfp');
  assert.equal(ingestedFoodForDay(rows, '2026-10-19').source, 'jeno');
  assert.equal(preferFoodEntry(ingestedFoodForDay(rows, '2026-10-19'), null).source, 'ingest');
});

await Promise.all(queue);

if (failed) {
  console.error(`\n${failed} mfp test(s) failed`);
  process.exit(1);
}
console.log('mfp ok');
