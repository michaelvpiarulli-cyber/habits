import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { purgeQaData } from './purgeQa.js';

const PAGES = ['Today', 'Food', 'Workouts', 'Habits', 'Plan', 'Bible', 'Watch', 'JENO', 'Settings'];

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
  const daily = ['Today', 'Food', 'Workouts', 'Plan'];
  if (mobile && daily.includes(name)) {
    await page.getByRole('navigation', { name: 'Daily' }).getByRole('button', { name, exact: true }).click();
    return;
  }
  if (mobile) await page.getByRole('button', { name: 'More' }).click();
  const row = page.locator('.tree-row').filter({ hasText: name }).first();
  await row.click();
  if (mobile) await closeDrawer(page);
}

test.beforeAll(async () => {
  await purgeQaData();
});

test.afterAll(async () => {
  await purgeQaData();
});

test('daily flows stay usable', async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === 'iphone';
  const { errors, failed } = attach(page);
  await page.goto('/');
  await expect(page.locator('input.page-title')).toHaveValue('Today', { timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Food' })).toBeVisible();
  await expect(page.getByText(/2,100 kcal/)).toBeVisible();
  await expect(page.getByLabel('Add a task')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Next day' })).toBeDisabled();
  await page.getByRole('button', { name: 'Previous day' }).click();
  await expect(page).toHaveURL(/[?&]date=\d{4}-\d{2}-\d{2}/);
  await expect(page.getByRole('button', { name: 'Next day' })).toBeEnabled();
  await page.reload();
  await expect(page.locator('input.page-title')).toHaveValue('Today', { timeout: 15000 });
  await expect(page).toHaveURL(/[?&]date=\d{4}-\d{2}-\d{2}/);
  await page.getByRole('button', { name: 'Back to today' }).click();
  await expect(page).not.toHaveURL(/[?&]date=/);
  await expect(page.getByRole('button', { name: 'Next day' })).toBeDisabled();

  mkdirSync('/opt/cursor/artifacts', { recursive: true });
  const tag = mobile ? 'iphone' : 'desktop';
  if (mobile) await page.getByRole('button', { name: 'More' }).click();
  await expect(page.locator('.side-label').filter({ hasText: 'Notes' })).toBeVisible();
  await assertSidebarAlign(page, mobile);
  await page.screenshot({ path: `/opt/cursor/artifacts/sidebar_${tag}.png`, fullPage: false });
  if (!mobile) {
    const todayRow = page.locator('.tree-row').filter({ hasText: 'Today' }).first();
    await todayRow.hover();
    await expect(todayRow.locator('.row-actions')).toHaveCSS('opacity', '1');
    await page.screenshot({ path: '/opt/cursor/artifacts/sidebar_desktop_hover.png', fullPage: false });
  }
  if (mobile) await closeDrawer(page);

  for (const name of PAGES) {
    await openSection(page, mobile, name);
    await expect(page.locator('input.page-title')).toHaveValue(name, { timeout: 10000 });
    const wide = await overflow(page);
    expect(wide, `${name} overflows`).toEqual([]);
  }

  await openSection(page, mobile, 'Food');
  await page.locator('.week-bar').nth(5).click();
  await expect(page.locator('input.page-title')).toHaveValue('Today');
  await expect(page).toHaveURL(/[?&]date=/);
  expect(await overflow(page), 'past day overflows').toEqual([]);
  await page.getByRole('button', { name: 'Back to today' }).click();
  await expect(page).not.toHaveURL(/[?&]date=/);

  await checkNested(page, mobile, testInfo.project.name);

  await openSection(page, mobile, 'Plan');
  const taskName = `QA task ${testInfo.project.name}`;
  await page.getByLabel('New Tasks').fill(taskName);
  await page.getByLabel('New Tasks').press('Enter');
  await expect(page.getByRole('row', { name: new RegExp(taskName) })).toBeVisible();
  await page.reload();
  await openSection(page, mobile, 'Plan');
  await expect(page.getByRole('row', { name: new RegExp(taskName) })).toBeVisible();
  await page.getByLabel(`Status for ${taskName}`).selectOption('Done');
  await expect(page.getByLabel(`Status for ${taskName}`)).toHaveValue('Done');

  await openSection(page, mobile, 'Habits');
  const habit = page.locator('button.check').first();
  if (await habit.count()) {
    await habit.click();
    await expect(habit).toHaveClass(/is-done/);
    await habit.click();
    await expect(habit).not.toHaveClass(/is-done/);
  }

  await openSection(page, mobile, 'Bible');
  const reading = page.locator('button.check').first();
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

  await openSection(page, mobile, 'Watch');
  const watchTitle = `QA show ${testInfo.project.name}`;
  await page.getByLabel('What did you watch').fill(watchTitle);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText(watchTitle).first()).toBeVisible();
  await page.reload();
  await openSection(page, mobile, 'Watch');
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
  await page.locator('.blocks').evaluate((el) => {
    const text = '# Hello\n\n**Bold line**\n\n- One\n  - Nested\n\n- [ ] Open item\n\n> A quote\n\n---\n\n| A | B |\n| --- | --- |\n| c | d |\n\n`code` and [notes](https://example.com/notes)';
    const data = new DataTransfer();
    data.setData('text/plain', text);
    const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: data });
    el.dispatchEvent(event);
  });
  await expect(page.locator('.block.is-h1 .rich-read')).toContainText('Hello');
  await expect(page.locator('strong', { hasText: 'Bold line' })).toBeVisible();
  await expect(page.locator('.block.is-quote')).toContainText('A quote');
  await expect(page.locator('.divider').first()).toBeVisible();
  await expect(page.locator('.mini-row.is-head')).toContainText('A');
  await expect(page.locator('.mini-row.is-head')).toContainText('B');
  await expect(page.locator('.block.is-todo')).toBeVisible();
  await expect(page.locator('.block.is-bullet').last()).toHaveAttribute('style', /--indent:\s*1/);
  await expect(page.locator('.rich-read a')).toHaveAttribute('href', 'https://example.com/notes');
  await page.locator('.block.is-h1 .rich-read').click();
  await expect(page.locator('.block.is-h1 textarea')).toHaveValue('Hello');
  const overflowNow = await overflow(page);
  expect(overflowNow).toEqual([]);
  await page.getByRole('button', { name: 'Page actions' }).click();
  await page.getByRole('button', { name: 'Move to trash' }).click();
  if (mobile) await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('button', { name: /Trash/ }).click();
  const noteTitle = `QA note ${testInfo.project.name}`;
  const trashed = page.locator('.trash-row').filter({ hasText: noteTitle }).first();
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

  await openSection(page, mobile, 'Today');
  await page.screenshot({ path: `/opt/cursor/artifacts/qa_${tag}_today.png`, fullPage: false });
  await openSection(page, mobile, 'Plan');
  await page.getByRole('tab', { name: 'Calendar' }).first().click();
  await page.screenshot({ path: `/opt/cursor/artifacts/qa_${tag}_plan.png`, fullPage: false });
  await openSection(page, mobile, 'Bible');
  await page.screenshot({ path: `/opt/cursor/artifacts/qa_${tag}_word.png`, fullPage: false });
  await openSection(page, mobile, 'Workouts');
  await page.screenshot({ path: `/opt/cursor/artifacts/qa_${tag}_body.png`, fullPage: false });

  await page.waitForTimeout(1200);

  const noisy = errors.filter((line) => !/Download the React DevTools|favicon/i.test(line));
  expect(noisy, 'console errors').toEqual([]);
  expect(failed, 'failed Supabase calls').toEqual([]);
});

async function checkNested(page, mobile, project) {
  const parentTitle = `QA nest ${project}`;
  if (mobile) await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('button', { name: 'New page' }).click();
  await expect(page.locator('input.page-title')).toHaveValue('Untitled');
  await page.getByLabel('Page title').fill(parentTitle);
  if (mobile) await page.getByRole('button', { name: 'More' }).click();
  await sidebarReady(page);
  const parent = page.locator('.tree-row').filter({ hasText: parentTitle }).first();
  await parent.hover();
  const parentX = (await parent.locator('.row-label').boundingBox()).x;
  await parent.getByRole('button', { name: `New subpage under ${parentTitle}` }).click();
  await expect(page.locator('input.page-title')).toHaveValue('Untitled');
  if (mobile) await page.getByRole('button', { name: 'More' }).click();
  await sidebarReady(page);
  const child = page.locator('.tree-row').filter({ hasText: 'Untitled' }).first();
  const childX = (await child.locator('.row-label').boundingBox()).x;
  expect(childX, 'nested label indents').toBeGreaterThan(parentX + 8);
  await page.screenshot({ path: `/opt/cursor/artifacts/sidebar_${mobile ? 'iphone' : 'desktop'}_nested.png`, fullPage: false });
  if (mobile) await closeDrawer(page);
  await page.getByRole('button', { name: 'Page actions' }).click();
  await page.getByRole('button', { name: 'Move to trash' }).click();
  if (mobile) await page.getByRole('button', { name: 'More' }).click();
  await page.locator('.tree-row').filter({ hasText: parentTitle }).first().click();
  if (mobile) await closeDrawer(page);
  await page.getByRole('button', { name: 'Page actions' }).click();
  await page.getByRole('button', { name: 'Move to trash' }).click();
}

async function closeDrawer(page) {
  const drawer = page.locator('aside.sidebar.is-open');
  if (await drawer.count()) {
    await page.getByRole('button', { name: 'Close sidebar' }).click();
    await expect(drawer).toHaveCount(0);
  }
}

async function sidebarReady(page) {
  await page.waitForFunction(() => {
    const side = document.querySelector('aside.sidebar');
    if (!side) return false;
    const box = side.getBoundingClientRect();
    return box.x >= -1 && box.width > 200;
  });
}

async function assertSidebarAlign(page, mobile) {
  await sidebarReady(page);
  const rows = await page.evaluate(() => {
    const names = ['Today', 'Food', 'Workouts', 'Habits', 'Plan', 'Bible', 'Watch', 'JENO', 'Settings'];
    return names.map((name) => {
      const row = [...document.querySelectorAll('.tree-row')].find((el) => el.textContent.includes(name));
      const icon = row.querySelector('.page-icon').getBoundingClientRect();
      const label = row.querySelector('.row-label').getBoundingClientRect();
      const box = row.getBoundingClientRect();
      const svg = row.querySelector('.page-icon svg');
      return {
        name,
        iconX: icon.x,
        iconW: icon.width,
        labelX: label.x,
        rowH: box.height,
        svg: Boolean(svg),
      };
    });
  });
  const labelX = [];
  const iconX = [];
  for (const row of rows) {
    const gap = row.labelX - (row.iconX + row.iconW);
    expect(gap, `${row.name} icon gap`).toBeGreaterThan(4);
    expect(gap, `${row.name} icon gap`).toBeLessThan(14);
    expect(row.iconW).toBeGreaterThan(18);
    expect(row.iconW).toBeLessThan(26);
    const [minH, maxH] = mobile ? [34, 40] : [26, 32];
    expect(row.rowH, row.name).toBeGreaterThanOrEqual(minH);
    expect(row.rowH, row.name).toBeLessThanOrEqual(maxH);
    expect(row.svg, row.name).toBe(true);
    labelX.push(Math.round(row.labelX));
    iconX.push(Math.round(row.iconX));
  }
  expect(Math.max(...labelX) - Math.min(...labelX), 'labels share a left edge').toBeLessThan(2);
  expect(Math.max(...iconX) - Math.min(...iconX), 'icons share a column').toBeLessThan(2);
  const header = await page.locator('.side-label').filter({ hasText: 'Notes' }).locator('span').first().boundingBox();
  expect(Math.abs(header.x - iconX[0]), 'Notes lines up with the icon column').toBeLessThan(6);
  await expect(page.locator('.tree-row').filter({ hasText: 'QA note' })).toHaveCount(0);
  await expect(page.locator('.tree-row').filter({ hasText: 'Untitled' })).toHaveCount(0);
}
