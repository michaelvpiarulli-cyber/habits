import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const PAGES = ['Today', 'Plan', 'Body', 'Word', 'JENO', 'Log', 'Settings'];

function attach(page) {
  const errors = [];
  const failed = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('response', (response) => {
    const url = response.url();
    if (!url.includes('supabase.co')) return;
    if (response.status() >= 400) failed.push(`${response.status()} ${url.split('?')[0]}`);
  });
  return { errors, failed };
}

async function overflow(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const offenders = [];
    if (root.scrollWidth > root.clientWidth + 2) offenders.push(`document ${root.scrollWidth}>${root.clientWidth}`);
    return offenders;
  });
}

async function openSection(page, mobile, name) {
  const daily = ['Today', 'Plan', 'Body', 'Word'];
  if (mobile && daily.includes(name)) {
    await page.getByRole('navigation', { name: 'Daily' }).getByRole('button', { name, exact: true }).click();
    return;
  }
  if (mobile) await page.getByRole('button', { name: 'More' }).click();
  const row = page.locator('.tree-row').filter({ hasText: name }).first();
  await row.click();
  if (mobile) await page.getByRole('button', { name: 'Close menu' }).click({ timeout: 1000 }).catch(() => {});
}

test('daily flows stay usable', async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === 'iphone';
  const { errors, failed } = attach(page);
  await page.goto('/');
  await expect(page.locator('input.page-title')).toHaveValue('Today', { timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible();
  await expect(page.getByText(/2,100 kcal/)).toBeVisible();

  for (const name of PAGES) {
    await openSection(page, mobile, name);
    await expect(page.locator('input.page-title')).toHaveValue(name, { timeout: 10000 });
    const wide = await overflow(page);
    expect(wide, `${name} overflows`).toEqual([]);
  }

  await openSection(page, mobile, 'Today');
  const taskName = `QA task ${testInfo.project.name}`;
  await page.getByLabel('Add a task').fill(taskName);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('button', { name: taskName })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: taskName })).toBeVisible();
  await page.getByRole('button', { name: taskName }).click();
  await expect(page.getByRole('button', { name: taskName })).toHaveCount(0);

  const habit = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Habits' }) }).locator('button.check').first();
  if (await habit.count()) {
    await habit.click();
    await expect(habit).toHaveClass(/is-done/);
    await habit.click();
    await expect(habit).not.toHaveClass(/is-done/);
  }

  const reading = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Word' }) }).locator('button.check').first();
  if (await reading.count()) {
    const wasDone = (await reading.getAttribute('class'))?.includes('is-done');
    await reading.click();
    if (wasDone) await expect(reading).not.toHaveClass(/is-done/);
    else await expect(reading).toHaveClass(/is-done/);
    await reading.click();
  }

  await openSection(page, mobile, 'Plan');
  for (const view of ['Board', 'List', 'Calendar', 'Gallery', 'Table']) {
    await page.getByRole('tab', { name: view }).first().click();
    await expect(page.getByRole('tab', { name: view }).first()).toHaveAttribute('aria-selected', 'true');
  }

  await openSection(page, mobile, 'Log');
  const watchTitle = `QA show ${testInfo.project.name}`;
  await page.getByLabel('What did you watch').fill(watchTitle);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText(watchTitle).first()).toBeVisible();
  await page.reload();
  await openSection(page, mobile, 'Log');
  await expect(page.getByText(watchTitle).first()).toBeVisible();
  await page.getByText(watchTitle).first().locator('xpath=ancestor::li[1]').getByRole('button', { name: 'Delete' }).click();

  if (mobile) await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('button', { name: 'New page' }).click();
  await expect(page.locator('input.page-title')).toHaveValue('Untitled');
  await page.getByLabel('Page title').fill(`QA note ${testInfo.project.name}`);
  const editor = page.locator('textarea.block-edit').first();
  await editor.fill('First line');
  await editor.press('Enter');
  await page.locator('textarea.block-edit').last().fill('- ');
  await page.locator('textarea.block-edit').last().fill('Packed bag');
  await expect(page.locator('.block.is-bullet')).toHaveCount(1);
  const handles = page.locator('.handle');
  if (await handles.count() > 1) {
    await handles.nth(1).dragTo(page.locator('.block').first());
  }
  await page.getByRole('button', { name: 'Page actions' }).click();
  await page.getByRole('button', { name: 'Move to trash' }).click();
  if (mobile) await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('button', { name: /Trash/ }).click();
  const noteTitle = `QA note ${testInfo.project.name}`;
  const trashed = page.locator('.trash-row').filter({ hasText: noteTitle });
  await expect(trashed).toBeVisible();
  await trashed.getByRole('button', { name: 'Restore' }).click();
  await expect(page.locator('input.page-title')).toHaveValue(noteTitle);
  await page.getByRole('button', { name: 'Page actions' }).click();
  await page.getByRole('button', { name: 'Move to trash' }).click();

  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog', { name: 'Search' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Quick find' }).fill('Plan');
  await page.getByRole('dialog', { name: 'Search' }).getByRole('button', { name: /Plan/ }).first().click();
  await expect(page.locator('input.page-title')).toHaveValue('Plan');

  mkdirSync('/opt/cursor/artifacts', { recursive: true });
  const tag = mobile ? 'iphone' : 'desktop';
  await openSection(page, mobile, 'Today');
  await page.screenshot({ path: `/opt/cursor/artifacts/qa_${tag}_today.png`, fullPage: false });
  await openSection(page, mobile, 'Plan');
  await page.getByRole('tab', { name: 'Calendar' }).first().click();
  await page.screenshot({ path: `/opt/cursor/artifacts/qa_${tag}_plan.png`, fullPage: false });
  await openSection(page, mobile, 'Word');
  await page.screenshot({ path: `/opt/cursor/artifacts/qa_${tag}_word.png`, fullPage: false });
  await openSection(page, mobile, 'Body');
  await page.screenshot({ path: `/opt/cursor/artifacts/qa_${tag}_body.png`, fullPage: false });

  const noisy = errors.filter((line) => !/Download the React DevTools|favicon/i.test(line));
  expect(noisy, 'console errors').toEqual([]);
  expect(failed, 'failed Supabase calls').toEqual([]);
});
