import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

test('tv dashboard is a 1080p remote screen', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'TV layout is checked at 1080p');
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  mkdirSync('/opt/cursor/artifacts', { recursive: true });

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/tv');
  await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening)\./ })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('Los Angeles')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Calories' })).toBeVisible();
  await expect(page.getByText(/of 2,100/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Habits' })).toBeVisible();
  for (const name of ['10,000 steps', 'Track food', 'Read scripture', 'Pray', 'Something intentional for my wife']) {
    await expect(page.getByRole('button', { name: new RegExp(name) })).toBeVisible();
  }
  await expect(page.getByRole('heading', { name: 'Workout' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Week' })).toBeVisible();
  await expect(page.getByText(/steps key/i)).toHaveCount(0);
  await expect(page.locator('.sidebar')).toHaveCount(0);
  await expect(page.locator('.tabs')).toHaveCount(0);

  const greetSize = await page.locator('.tv-greet').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(greetSize).toBeGreaterThan(48);
  const fit = await page.evaluate(() => {
    const root = document.documentElement;
    const deck = document.querySelector('.tv-deck');
    return {
      wide: root.scrollWidth > root.clientWidth + 2,
      deckWide: deck.scrollWidth > deck.clientWidth + 2,
      deckTall: deck.scrollHeight > deck.clientHeight + 8,
    };
  });
  expect(fit).toEqual({ wide: false, deckWide: false, deckTall: false });

  const first = page.locator('[data-tv]').first();
  await first.focus();
  const ring = await first.evaluate((el) => getComputedStyle(el).outlineColor);
  expect(ring).not.toBe('rgba(0, 0, 0, 0)');
  const before = await first.evaluate((el) => el.textContent);
  await page.keyboard.press('ArrowRight');
  const active = await page.evaluate(() => document.activeElement?.textContent || '');
  expect(active).not.toBe(before);

  await page.screenshot({ path: '/opt/cursor/artifacts/tv_dashboard_1080.png' });

  await page.setViewportSize({ width: 3840, height: 2160 });
  await page.waitForTimeout(200);
  const greet4k = await page.locator('.tv-greet').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  expect(greet4k).toBeGreaterThan(80);
  const fit4k = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  expect(fit4k).toBe(false);

  await page.goto('/tv?date=2026-10-20');
  await expect(page.getByText(/Viewing Tue 20 Oct 2026/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Later' })).toBeEnabled();

  await page.goto('/');
  await expect(page.locator('input.page-title')).toHaveValue('Today', { timeout: 20000 });
  await expect(page.locator('.sidebar')).toBeVisible();
  if (await page.locator('aside.sidebar.is-drawer').count()) {
    await page.getByRole('button', { name: 'More' }).click();
  }
  await page.locator('.tree-row').filter({ hasText: 'Settings' }).first().click();
  await expect(page.getByRole('heading', { name: 'Open on TV' })).toBeVisible();
  await expect(page.locator('.tv-url')).toContainText('/tv');
  await expect(page.getByText(/SmartCast/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Steps' })).toBeVisible();

  expect(errors, 'page errors').toEqual([]);
});
