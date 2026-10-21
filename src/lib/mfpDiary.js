/**
 * Read a public MyFitnessPal diary page.
 * The printable diary is server HTML. Foods are in the meal table, or in the
 * page JSON when MyFitnessPal includes the report. Private, password, and
 * missing diaries come back as a status instead of a throw.
 */

import { groupFoodEntries, sumMeals } from './foodLog.js';

export const MFP_SETUP_MESSAGE = 'Add your MyFitnessPal username and set your diary to public';

export const MFP_STATUS = {
  ok: 'ok',
  setup: 'setup',
  private: 'private',
  password: 'password',
  not_found: 'not_found',
  error: 'error',
};

const MEAL_NAMES = new Map([
  ['breakfast', 'Breakfast'],
  ['lunch', 'Lunch'],
  ['dinner', 'Dinner'],
  ['snack', 'Snacks'],
  ['snacks', 'Snacks'],
]);

const MONTHS = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

function decode(text) {
  return String(text || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
}

function macroNum(value) {
  const raw = String(value ?? '').replace(/,/g, '').trim();
  if (!raw || raw === '--' || raw.startsWith('--')) return 0;
  const n = Number(raw.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
}

export function normalizeUsername(value) {
  const username = String(value || '').trim();
  if (!username) return '';
  if (!/^[A-Za-z0-9._-]{1,30}$/.test(username)) return { error: 'Username can use letters, numbers, dots, and underscores.' };
  return username;
}

export function laToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function addIsoDays(iso, days) {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function headingDate(text) {
  const iso = String(text || '').match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];
  const named = String(text || '').match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})\b/i);
  if (!named) return '';
  const month = String(MONTHS[named[1].toLowerCase()]).padStart(2, '0');
  const day = String(named[2]).padStart(2, '0');
  return `${named[3]}-${month}-${day}`;
}

function nextData(html) {
  const match = String(html || '').match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function findVisibility(node, found = { visibility: '', allowed: null }) {
  if (!node || typeof node !== 'object') return found;
  if (Array.isArray(node)) {
    for (const item of node) findVisibility(item, found);
    return found;
  }
  if (typeof node.diary_visibility === 'string') found.visibility = node.diary_visibility;
  if (typeof node.isAllowedToSeeDiary === 'boolean') found.allowed = node.isAllowedToSeeDiary;
  for (const value of Object.values(node)) findVisibility(value, found);
  return found;
}

function collectEntries(node, inheritedDate, out) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) collectEntries(item, inheritedDate, out);
    return;
  }
  const date = typeof node.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(node.date)
    ? node.date.slice(0, 10)
    : inheritedDate;
  if (Array.isArray(node.food_entries)) {
    for (const entry of node.food_entries) {
      if (entry && typeof entry === 'object') out.push({ ...entry, date: entry.date || date });
    }
  }
  for (const value of Object.values(node)) collectEntries(value, date, out);
}

function energyCalories(contents) {
  const energy = contents?.energy;
  if (energy && typeof energy === 'object') {
    const value = Number(energy.value);
    if (!Number.isFinite(value)) return 0;
    const unit = String(energy.unit || '').toLowerCase();
    if (unit.startsWith('kilo')) return Math.round((value / 4.184) * 10) / 10;
    return Math.round(value * 10) / 10;
  }
  return macroNum(contents?.calories ?? contents?.energy);
}

function foodFromEntry(entry) {
  const contents = entry.nutritional_contents || entry.food?.nutritional_contents || {};
  const description = String(entry.food?.description || entry.description || entry.foodTitle || '').trim();
  const brand = String(entry.food?.brand_name || entry.brand || '').trim();
  const serving = entry.serving_size
    ? `${entry.servings && entry.servings !== 1 ? `${entry.servings} x ` : ''}${entry.serving_size.value ?? ''} ${entry.serving_size.unit || ''}`.trim()
    : '';
  const nameCore = brand && brand.toLowerCase() !== 'generic' ? `${brand} ${description}` : description;
  const name = [nameCore, serving].filter(Boolean).join(', ').replace(/\s+/g, ' ').trim();
  const meal = MEAL_NAMES.get(String(entry.meal_name || entry.meal || '').trim().toLowerCase())
    || String(entry.meal_name || entry.meal || 'Meal').trim()
    || 'Meal';
  if (!name) return null;
  return {
    name: name.slice(0, 160),
    meal,
    calories: energyCalories(contents),
    protein: macroNum(contents.protein),
    carbs: macroNum(contents.carbohydrates ?? contents.carbs),
    fat: macroNum(contents.fat),
    date: typeof entry.date === 'string' ? entry.date.slice(0, 10) : '',
  };
}

function daysFromEntries(entries) {
  const byDay = new Map();
  for (const entry of entries) {
    const food = foodFromEntry(entry);
    if (!food?.date) continue;
    if (!byDay.has(food.date)) byDay.set(food.date, []);
    byDay.get(food.date).push(food);
  }
  return byDay;
}

function tableRows(tableHtml) {
  const rows = [];
  const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let row;
  while ((row = rowRe.exec(tableHtml))) {
    const cells = [];
    const cellRe = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cell;
    while ((cell = cellRe.exec(row[1]))) cells.push(decode(cell[1]));
    if (cells.some(Boolean)) rows.push(cells);
  }
  return rows;
}

function columnMap(cells) {
  const map = {};
  cells.forEach((cell, index) => {
    const label = cell.toLowerCase();
    if (label.includes('calorie')) map.calories = index;
    else if (label.includes('protein')) map.protein = index;
    else if (label.includes('carb')) map.carbs = index;
    else if (label === 'fat' || label.startsWith('fat')) map.fat = index;
    else if (label.includes('food')) map.food = index;
  });
  if (map.calories == null || map.protein == null) return null;
  if (map.food == null) map.food = 0;
  return map;
}

function isMealLabel(text) {
  return MEAL_NAMES.has(String(text || '').trim().toLowerCase());
}

function parseTable(tableHtml) {
  const rows = tableRows(tableHtml);
  let columns = null;
  let meal = '';
  const foods = [];
  let totals = null;
  for (const cells of rows) {
    const header = columnMap(cells);
    if (header) {
      columns = header;
      if (isMealLabel(cells[0])) meal = MEAL_NAMES.get(cells[0].trim().toLowerCase());
      continue;
    }
    const first = cells[0] || '';
    const rest = cells.slice(1).join('');
    if (isMealLabel(first) && !rest) {
      meal = MEAL_NAMES.get(first.toLowerCase());
      continue;
    }
    if (/^totals?$/i.test(first)) {
      if (columns) {
        totals = {
          calories: macroNum(cells[columns.calories]),
          protein: macroNum(cells[columns.protein]),
          carbs: macroNum(cells[columns.carbs]),
          fat: macroNum(cells[columns.fat]),
        };
      }
      continue;
    }
    if (!columns || !meal || !first) continue;
    foods.push({
      name: first.slice(0, 160),
      meal,
      calories: macroNum(cells[columns.calories]),
      protein: macroNum(cells[columns.protein]),
      carbs: macroNum(cells[columns.carbs]),
      fat: macroNum(cells[columns.fat]),
    });
  }
  if (!foods.length && !totals) return null;
  return { foods, totals };
}

function daysFromTables(html, fallbackDate) {
  const blocks = String(html || '').match(/<h[1-3]\b[^>]*>[\s\S]*?<\/h[1-3]>|<table\b[\s\S]*?<\/table>/gi) || [];
  let pending = fallbackDate || '';
  const byDay = new Map();
  for (const block of blocks) {
    if (/^<h/i.test(block)) {
      const date = headingDate(decode(block));
      if (date) pending = date;
      continue;
    }
    const parsed = parseTable(block);
    if (!parsed || !pending) continue;
    const current = byDay.get(pending) || { foods: [], totals: null };
    current.foods.push(...parsed.foods);
    if (parsed.totals) current.totals = parsed.totals;
    byDay.set(pending, current);
  }
  return byDay;
}

function finishDay(date, foods, totals) {
  const meals = groupFoodEntries(foods);
  const sums = sumMeals(meals);
  const pick = (key) => (totals && totals[key] != null ? totals[key] : sums[key]);
  return {
    date,
    meals,
    totals: {
      calories: pick('calories'),
      protein: pick('protein'),
      carbs: pick('carbs'),
      fat: pick('fat'),
    },
  };
}

function notFound(html, httpStatus) {
  if (httpStatus === 404) return true;
  return /rel="alternate"[^>]+href="https:\/\/www\.myfitnesspal\.com\/404"/i.test(html)
    || /<title[^>]*>\s*page not found/i.test(html);
}

function challenge(html) {
  return /MyFitnessPal\s*\|\s*Challenge/i.test(html) || /Just a moment/i.test(html);
}

/**
 * @returns {{ status: string, message: string, days: Array<{ date: string, meals: object[], totals: object }> }}
 */
export function parseMfpHtml(html, { httpStatus = 200, from = '', to = '' } = {}) {
  const page = String(html || '');
  const data = nextData(page);
  const flags = data ? findVisibility(data) : { visibility: '', allowed: null };
  const singleDay = from && from === to ? from : '';

  if (notFound(page, httpStatus)) {
    return { status: MFP_STATUS.not_found, message: 'MyFitnessPal could not find that username.', days: [] };
  }
  if (flags.visibility === 'password') {
    return {
      status: MFP_STATUS.password,
      message: 'This diary is locked with a key. Tally can only read a public diary.',
      days: [],
    };
  }
  if (flags.visibility === 'private' || flags.visibility === 'friends' || flags.allowed === false) {
    return {
      status: MFP_STATUS.private,
      message: 'This diary is private. Set it to public in MyFitnessPal, then sync again.',
      days: [],
    };
  }
  if (challenge(page)) {
    return {
      status: MFP_STATUS.error,
      message: 'MyFitnessPal blocked the diary page. Sync again in a few minutes.',
      days: [],
    };
  }

  const entries = [];
  if (data) collectEntries(data, '', entries);
  const fromJson = daysFromEntries(entries);
  const fromTables = daysFromTables(page, singleDay);
  const dates = new Set([...fromJson.keys(), ...fromTables.keys()]);
  const days = [...dates].sort().map((date) => {
    const jsonFoods = (fromJson.get(date) || []).map((food) => ({
      name: food.name,
      meal: food.meal,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
    }));
    const table = fromTables.get(date);
    if (jsonFoods.length) return finishDay(date, jsonFoods, null);
    return finishDay(date, table?.foods || [], table?.totals || null);
  }).filter((day) => !from || !to || (day.date >= from && day.date <= to));

  const sawDiary = fromJson.size > 0 || fromTables.size > 0;
  const readable = sawDiary || flags.allowed === true || flags.visibility === 'public';
  if (!readable) {
    return {
      status: MFP_STATUS.error,
      message: 'Could not read meals from the diary page.',
      days: [],
      complete: false,
    };
  }

  if (!days.length && singleDay && sawDiary) {
    days.push(finishDay(singleDay, [], { calories: 0, protein: 0, carbs: 0, fat: 0 }));
  }
  return { status: MFP_STATUS.ok, message: '', days, complete: sawDiary };
}

const BROWSER = 'Mozilla/5.0 (compatible; Tally/1.0; +https://habits-silk-six.vercel.app)';

export async function fetchMfpDiary(username, from, to, fetchImpl = fetch) {
  const url = printableDiaryUrl(username, from, to);
  const response = await fetchImpl(url, {
    headers: { 'User-Agent': BROWSER, Accept: 'text/html' },
    redirect: 'follow',
  });
  const html = await response.text();
  const parsed = parseMfpHtml(html, { httpStatus: response.status, from, to });
  if (parsed.status !== MFP_STATUS.ok) return parsed;
  if (parsed.days.some((day) => (day.meals || []).some((meal) => meal.foods?.length || meal.calories))) return parsed;

  let report;
  try {
    report = await fetchImpl('https://www.myfitnesspal.com/api/services/diary/report', {
      method: 'POST',
      headers: {
        'User-Agent': BROWSER,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Referer: url,
      },
      body: JSON.stringify({
        username,
        show_food_diary: 1,
        show_exercise_diary: 0,
        show_food_notes: 0,
        show_exercise_notes: 0,
        from,
        to,
      }),
    });
  } catch {
    report = null;
  }
  if (report?.ok) {
    const json = await report.json();
    const wrapped = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({
      props: { pageProps: { isAllowedToSeeDiary: true, report: json } },
    })}</script>`;
    const fromReport = parseMfpHtml(wrapped, { httpStatus: 200, from, to });
    if (fromReport.status === MFP_STATUS.ok && fromReport.days.some((day) => day.meals.some((meal) => meal.foods?.length))) {
      return fromReport;
    }
  }
  if (parsed.complete) return parsed;
  return {
    status: MFP_STATUS.error,
    message: 'Could not read meals from the diary page.',
    days: [],
  };
}

export function printableDiaryUrl(username, from, to) {
  return `https://www.myfitnesspal.com/reports/printable-diary/${encodeURIComponent(username)}?from=${from}&to=${to}`;
}
