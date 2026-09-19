/**
 * iPhone install detection — run with `npm test`.
 */
import assert from 'node:assert/strict';
import { isIosDevice, isNativeApp, isStandaloneDisplay, needsIosInstallHint } from '../src/lib/install.js';

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

function fake(fields = {}) {
  return {
    Capacitor: fields.Capacitor,
    navigator: {
      userAgent: '',
      platform: 'Linux',
      maxTouchPoints: 0,
      standalone: false,
      ...fields.navigator,
    },
    matchMedia: (q) => ({
      matches: Boolean(fields.displayMode && q.includes(fields.displayMode)),
    }),
  };
}

console.log('install');

test('desktop Safari is not an iPhone install candidate', () => {
  const win = fake({ navigator: { userAgent: 'Macintosh; Intel Mac OS X' } });
  assert.equal(isIosDevice(win), false);
  assert.equal(needsIosInstallHint(win), false);
  assert.equal(isNativeApp(win), false);
});

test('iPhone Safari asks to add to Home Screen', () => {
  const win = fake({ navigator: { userAgent: 'iPhone; CPU iPhone OS 18_0 like Mac OS X' } });
  assert.equal(isIosDevice(win), true);
  assert.equal(isStandaloneDisplay(win), false);
  assert.equal(needsIosInstallHint(win), true);
});

test('home-screen web app does not keep nagging', () => {
  const win = fake({
    navigator: { userAgent: 'iPhone; CPU iPhone OS 18_0 like Mac OS X', standalone: true },
  });
  assert.equal(isStandaloneDisplay(win), true);
  assert.equal(needsIosInstallHint(win), false);
});

test('Capacitor native shell counts as installed', () => {
  const win = fake({
    navigator: { userAgent: 'iPhone; CPU iPhone OS 18_0 like Mac OS X' },
    Capacitor: { isNativePlatform: () => true },
  });
  assert.equal(isNativeApp(win), true);
  assert.equal(needsIosInstallHint(win), false);
});

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('install ok');
