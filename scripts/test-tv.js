/**
 * TV dashboard clock, route, and D-pad focus.
 * Run with `npm test`.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { greetingForHour, isTvPath, laParts } from '../src/lib/tvClock.js';
import { nextTvTarget } from '../src/lib/tvFocus.js';
import { readViewDay } from '../src/lib/viewDay.js';

const evening = new Date('2026-10-26T04:31:00Z');
const parts = laParts(evening);
assert.equal(parts.iso, '2026-10-25');
assert.equal(parts.hour, 21);
assert.equal(parts.minute, '31');
assert.equal(parts.clock, '9:31 PM');
assert.equal(greetingForHour(parts.hour), 'Good evening.');

const midnight = laParts(new Date('2026-10-26T07:00:00Z'));
assert.equal(midnight.iso, '2026-10-26');
assert.equal(midnight.hour, 0);
assert.equal(midnight.clock, '12:00 AM');
assert.equal(greetingForHour(0), 'Good morning.');
assert.equal(greetingForHour(12), 'Good afternoon.');
assert.equal(greetingForHour(16), 'Good afternoon.');
assert.equal(greetingForHour(17), 'Good evening.');

assert.equal(isTvPath('/tv'), true);
assert.equal(isTvPath('/tv/'), true);
assert.equal(isTvPath('/'), false);
assert.equal(isTvPath('/today'), false);

assert.equal(readViewDay('?date=2026-10-20', '2026-10-25'), '2026-10-20');
assert.equal(readViewDay('?date=2026-12-01', '2026-10-25'), '2026-10-25');
assert.equal(readViewDay('', '2026-10-25'), '2026-10-25');

const row = [
  { id: 'a', left: 0, top: 0, right: 100, bottom: 40 },
  { id: 'b', left: 120, top: 0, right: 220, bottom: 40 },
  { id: 'c', left: 0, top: 80, right: 100, bottom: 140 },
];
assert.equal(nextTvTarget(row, 'a', 'right'), 'b');
assert.equal(nextTvTarget(row, 'a', 'down'), 'c');
assert.equal(nextTvTarget(row, 'b', 'left'), 'a');
assert.equal(nextTvTarget(row, 'a', 'left'), 'a');
assert.equal(nextTvTarget([{ ...row[1], disabled: true }, row[0]], 'a', 'right'), 'a');

const screen = fs.readFileSync(new URL('../src/os/TvScreen.jsx', import.meta.url), 'utf8');
const settings = fs.readFileSync(new URL('../src/os/SettingsScreen.jsx', import.meta.url), 'utf8');
const manifest = fs.readFileSync(new URL('../public/tv.webmanifest', import.meta.url), 'utf8');
assert.equal(screen.includes('steps key'), false);
assert.equal(screen.includes('reveal_steps'), false);
assert.equal(screen.includes('\u2014'), false);
assert.match(settings, /Open on TV/);
assert.match(settings, /SmartCast/);
assert.match(settings, /Cast/);
assert.equal(settings.includes('\u2014'), false);
assert.match(manifest, /"start_url": "\/tv"/);
assert.match(manifest, /"display": "fullscreen"/);

console.log('tv dashboard checks passed');
