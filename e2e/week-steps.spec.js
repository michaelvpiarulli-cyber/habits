import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

async function closeDrawer(page) {
  const drawer = page.locator('aside.sidebar.is-open');
  if (await drawer.count()) {
    await page.getByRole('button', { name: 'Close sidebar' }).click();
    await expect(drawer).toHaveCount(0);
  }
}

async function openName(page, mobile, name) {
  if (mobile) await page.getByRole('button', { name: 'More' }).click();
  await page.locator('.tree-row').filter({ hasText: name }).first().click();
  if (mobile) await closeDrawer(page);
}

test('week review and steps setup stay quiet', async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === 'iphone';
  const tag = mobile ? 'iphone' : 'desktop';
  mkdirSync('/opt/cursor/artifacts', { recursive: true });

  await page.goto('/');
  await expect(page.locator('input.page-title')).toHaveValue('Today', { timeout: 15000 });
  await openName(page, mobile, 'Week');
  await expect(page.locator('input.page-title')).toHaveValue('Week');
  await expect(page.getByRole('button', { name: 'Next week' })).toBeDisabled();
  const label = page.locator('.day-pick');
  await expect(label).toContainText(' to ');
  const current = (await label.innerText()).replace(/\s+/g, ' ');
  await page.getByRole('button', { name: 'Previous week' }).click();
  await expect(page).toHaveURL(/[?&]week=\d{4}-\d{2}-\d{2}/);
  await expect(page.getByRole('button', { name: 'Next week' })).toBeEnabled();
  await expect(label).not.toHaveText(current);
  await page.getByRole('button', { name: 'Next week' }).click();
  await expect(page).not.toHaveURL(/[?&]week=/);
  await expect(page.getByRole('button', { name: 'Next week' })).toBeDisabled();

  await expect(page.getByRole('heading', { name: 'Habits' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Food' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Workouts' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible();
  await expect(page.locator('.week-grid').first()).toBeVisible();
  await expect(page.getByText('10,000 steps')).toBeVisible();
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  expect(wide).toBe(false);
  await page.locator('.week-review').screenshot({ path: `/opt/cursor/artifacts/week_${tag}.png` });

  await openName(page, mobile, 'Settings');
  await expect(page.locator('input.page-title')).toHaveValue('Settings');
  const steps = page.locator('.steps-setup');
  await steps.scrollIntoViewIfNeeded();
  await expect(steps.getByRole('heading', { name: 'Steps' })).toBeVisible();
  const showKey = steps.getByRole('button', { name: 'Show steps key' });
  const replaceKey = steps.getByRole('button', { name: 'Replace steps key' });
  await expect(showKey.or(replaceKey)).toBeVisible();
  await expect(steps.getByLabel('Steps key')).toHaveCount(0);
  await expect(steps).toContainText('https://habits-silk-six.vercel.app/api/ingest');
  await expect(steps).toContainText('{"kind":"steps","date":"YYYY-MM-DD","steps":8420}');
  await expect(steps).toContainText('9:00 PM');
  await expect(steps).toContainText('Run Immediately');
  const settingsWide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  expect(settingsWide).toBe(false);
  await steps.screenshot({ path: `/opt/cursor/artifacts/settings_steps_${tag}.png` });
});
