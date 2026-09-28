/**
 * Smoke the Plan day timeline: create a task, place it on an hour, unschedule.
 * Run: npx playwright install chromium && node scripts/test-plan-timeline.mjs
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const shotDir = '/opt/cursor/artifacts/screenshots';
mkdirSync(shotDir, { recursive: true });

const BASE = process.env.PLAN_URL || 'http://127.0.0.1:5173/';
let failed = 0;

function ok(name) {
  console.log(`  ok  ${name}`);
}
function fail(name, err) {
  failed += 1;
  console.error(`  FAIL  ${name}`);
  console.error(`        ${err?.message || err}`);
}

console.log('plan timeline');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 420, height: 900 },
  recordVideo: { dir: '/opt/cursor/artifacts', size: { width: 420, height: 900 } },
});
const page = await context.newPage();

try {
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('tally-')) localStorage.removeItem(key);
    }
  });
  await page.reload({ waitUntil: 'networkidle' });

  await page.getByRole('button', { name: 'Plan' }).click();
  await page.getByRole('heading', { name: 'Plan' }).waitFor();

  await page.getByRole('button', { name: 'Add' }).click();
  await page.locator('#plan-task-title').fill('Ship PR review');
  await page.getByRole('button', { name: 'Save' }).click();

  const chip = page.getByRole('button', { name: 'Ship PR review' });
  await chip.waitFor();
  await page.screenshot({ path: `${shotDir}/plan-tray-unscheduled.png`, fullPage: true });
  ok('unscheduled task appears in tray');

  await chip.click();
  await page.getByRole('button', { name: 'Schedule at 10 am' }).click();

  await page.locator('.plan-block--task').filter({ hasText: 'Ship PR review' }).waitFor();
  await page.screenshot({ path: `${shotDir}/plan-timeline-scheduled.png`, fullPage: true });
  ok('task lands on 10 am timeline block');

  if (!(await page.getByText(/Nothing waiting/i).isVisible())) {
    throw new Error('tray should be empty after scheduling');
  }
  ok('tray clears after scheduling');

  await page.getByRole('button', { name: 'Unschedule' }).click();
  await chip.waitFor();
  ok('unschedule returns task to tray');

  await page.getByRole('button', { name: 'Schedule at 2 pm' }).click();
  await page.getByRole('button', { name: /New task at/i }).click();
  await page.locator('#plan-task-title').fill('Deep work');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.locator('.plan-block--task').filter({ hasText: 'Deep work' }).waitFor();
  await page.screenshot({ path: `${shotDir}/plan-hour-new-task.png`, fullPage: true });
  ok('hour slot can create a timed task');
} catch (err) {
  fail('plan timeline flow', err);
  await page.screenshot({ path: `${shotDir}/plan-timeline-error.png`, fullPage: true }).catch(() => {});
} finally {
  await context.close();
  await browser.close();
}

if (failed) {
  console.error(`${failed} plan timeline check(s) failed`);
  process.exit(1);
}
console.log('plan timeline ok');
