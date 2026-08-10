/**
 * Import MacroFactor Quick Export / All-Time / Food Log / CSV into Tally day
 * nutrition payloads. MacroFactor has no live API — exports are the only path.
 */

import { mealSlotForHour } from './recentFoods.js';
import { readXlsxSheets } from './xlsxRead.js';

const DATE_HEADERS = ['date', 'day', 'timestamp'];
const CALORIE_HEADERS = [
  'calories (kcal)',
  'calories',
  'energy (kcal)',
  'energy',
  'kcal',
  'calories (kcal) consumed',
];
const PROTEIN_HEADERS = ['protein (g)', 'protein'];
const CARB_HEADERS = ['carbs (g)', 'carbohydrate (g)', 'carbohydrates (g)', 'carbs', 'carbohydrate'];
const FAT_HEADERS = ['fat (g)', 'total fat', 'fat'];
const TARGET_CAL_HEADERS = ['target calories (kcal)', 'target calories'];
const TARGET_PRO_HEADERS = ['target protein (g)', 'target protein'];
const TARGET_CARB_HEADERS = ['target carbs (g)', 'target carbs'];
const TARGET_FAT_HEADERS = ['target fat (g)', 'target fat'];
const WEIGHT_KG_HEADERS = ['weight (kg)', 'scale weight (kg)'];
const FOOD_NAME_HEADERS = ['food name', 'food', 'name'];
const SERVING_HEADERS = ['serving size', 'serving'];
const QTY_HEADERS = ['serving qty', 'quantity', 'qty'];
const TIME_HEADERS = ['time'];

function normHeader(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function pick(row, candidates) {
  const map = {};
  for (const [key, value] of Object.entries(row || {})) {
    map[normHeader(key)] = value;
  }
  for (const name of candidates) {
    if (Object.prototype.hasOwnProperty.call(map, name) && map[name] != null && map[name] !== '') {
      return map[name];
    }
  }
  return null;
}

function safeNumber(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const cleaned = String(value).replace(/,/g, '').trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Excel serial day → YYYY-MM-DD (UTC-noon math avoids DST surprises). */
function excelSerialToIso(serial) {
  const n = Number(serial);
  if (!Number.isFinite(n) || n < 20000 || n > 80000) return null;
  const ms = Math.round((n - 25569) * 86400 * 1000);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function parseImportDate(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return excelSerialToIso(value);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const pad = (x) => String(x).padStart(2, '0');
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  const s = String(value).trim();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return excelSerialToIso(Number(s));

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  for (const fmt of [
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})/, // m/d/Y or d/m/Y — prefer US for MacroFactor
    /^(\d{1,2})-(\d{1,2})-(\d{4})/,
  ]) {
    const m = fmt.exec(s);
    if (!m) continue;
    const a = Number(m[1]);
    const b = Number(m[2]);
    const y = m[3];
    // MacroFactor is US-oriented: treat as M/D/Y when both ≤ 12 ambiguity favors month-first.
    const month = a;
    const day = b;
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;
    const pad = (x) => String(x).padStart(2, '0');
    return `${y}-${pad(month)}-${pad(day)}`;
  }
  return null;
}

function hourFromTime(value) {
  if (value == null || value === '') return 12;
  if (typeof value === 'number' && value >= 0 && value < 1) {
    return Math.floor(value * 24) % 24;
  }
  const s = String(value).trim();
  const m = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(s);
  if (!m) return 12;
  let h = Number(m[1]);
  const ap = (m[3] || '').toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  return Math.min(23, Math.max(0, h));
}

function macrosFromRow(row) {
  return {
    calories: Math.max(0, Math.round(safeNumber(pick(row, CALORIE_HEADERS)) || 0)),
    protein: Math.max(0, Math.round((safeNumber(pick(row, PROTEIN_HEADERS)) || 0) * 10) / 10),
    carbs: Math.max(0, Math.round((safeNumber(pick(row, CARB_HEADERS)) || 0) * 10) / 10),
    fat: Math.max(0, Math.round((safeNumber(pick(row, FAT_HEADERS)) || 0) * 10) / 10),
  };
}

function targetsFromRow(row) {
  const calories = safeNumber(pick(row, TARGET_CAL_HEADERS));
  const protein = safeNumber(pick(row, TARGET_PRO_HEADERS));
  const carbs = safeNumber(pick(row, TARGET_CARB_HEADERS));
  const fat = safeNumber(pick(row, TARGET_FAT_HEADERS));
  if (calories == null && protein == null && carbs == null && fat == null) return null;
  return {
    calories: calories == null ? null : Math.round(calories),
    protein: protein == null ? null : Math.round(protein * 10) / 10,
    carbs: carbs == null ? null : Math.round(carbs * 10) / 10,
    fat: fat == null ? null : Math.round(fat * 10) / 10,
  };
}

function weightKgFromRow(row) {
  return safeNumber(pick(row, WEIGHT_KG_HEADERS));
}

function foodFromRow(row) {
  const name = String(pick(row, FOOD_NAME_HEADERS) || '').trim();
  if (!name) return null;
  const macros = macrosFromRow(row);
  const qty = Math.max(0.01, safeNumber(pick(row, QTY_HEADERS)) || 1);
  const serving = String(pick(row, SERVING_HEADERS) || '1 serving').trim() || '1 serving';
  return {
    name,
    brand: '',
    serving,
    quantity: qty,
    source: 'macrofactor',
    baseCalories: macros.calories / qty,
    baseProtein: macros.protein / qty,
    baseCarbs: macros.carbs / qty,
    baseFat: macros.fat / qty,
    ...macros,
    hour: hourFromTime(pick(row, TIME_HEADERS)),
  };
}

function ensureDay(map, day) {
  if (!map.has(day)) {
    map.set(day, {
      day,
      foods: [],
      daily: null,
      targets: null,
      weightKg: null,
    });
  }
  return map.get(day);
}

function ingestDailyRows(map, rows) {
  for (const row of rows) {
    const day = parseImportDate(pick(row, DATE_HEADERS));
    if (!day) continue;
    const entry = ensureDay(map, day);
    const macros = macrosFromRow(row);
    const hasMacros =
      macros.calories > 0 || macros.protein > 0 || macros.carbs > 0 || macros.fat > 0;
    if (hasMacros) entry.daily = macros;
    const targets = targetsFromRow(row);
    if (targets) entry.targets = targets;
    const weightKg = weightKgFromRow(row);
    if (weightKg != null && weightKg > 0) entry.weightKg = weightKg;
  }
}

function ingestFoodRows(map, rows) {
  for (const row of rows) {
    const day = parseImportDate(pick(row, DATE_HEADERS));
    if (!day) continue;
    const food = foodFromRow(row);
    if (!food) continue;
    ensureDay(map, day).foods.push(food);
  }
}

function foodsToMeals(foods) {
  const bySlot = new Map();
  for (const food of foods) {
    const slot = mealSlotForHour(food.hour);
    if (!bySlot.has(slot)) bySlot.set(slot, []);
    bySlot.get(slot).push({
      name: food.name,
      brand: food.brand,
      serving: food.serving,
      quantity: food.quantity,
      source: food.source,
      baseCalories: food.baseCalories,
      baseProtein: food.baseProtein,
      baseCarbs: food.baseCarbs,
      baseFat: food.baseFat,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
    });
  }
  return [...bySlot.entries()].map(([slot, slotFoods]) => {
    const totals = slotFoods.reduce(
      (acc, f) => ({
        calories: acc.calories + (Number(f.calories) || 0),
        protein: acc.protein + (Number(f.protein) || 0),
        carbs: acc.carbs + (Number(f.carbs) || 0),
        fat: acc.fat + (Number(f.fat) || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
    return {
      slot,
      label: '',
      note: 'Imported from MacroFactor',
      foods: slotFoods,
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein * 10) / 10,
      carbs: Math.round(totals.carbs * 10) / 10,
      fat: Math.round(totals.fat * 10) / 10,
    };
  });
}

function dayPayload(entry) {
  let meals;
  if (entry.foods.length) {
    meals = foodsToMeals(entry.foods);
  } else if (entry.daily) {
    meals = [
      {
        slot: 'day',
        label: 'MacroFactor',
        note: 'Imported from MacroFactor',
        foods: [],
        ...entry.daily,
      },
    ];
  } else {
    return null;
  }

  const totals = meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + (Number(meal.calories) || 0),
      protein: acc.protein + (Number(meal.protein) || 0),
      carbs: acc.carbs + (Number(meal.carbs) || 0),
      fat: acc.fat + (Number(meal.fat) || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return {
    day: entry.day,
    meals,
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein * 10) / 10,
    carbs: Math.round(totals.carbs * 10) / 10,
    fat: Math.round(totals.fat * 10) / 10,
    targets: entry.targets,
    weightKg: entry.weightKg,
  };
}

function finish(map, format) {
  const days = [...map.values()]
    .map(dayPayload)
    .filter(Boolean)
    .sort((a, b) => a.day.localeCompare(b.day));

  let targets = null;
  for (let i = days.length - 1; i >= 0; i -= 1) {
    if (days[i].targets) {
      targets = days[i].targets;
      break;
    }
  }

  return {
    format,
    days,
    targets,
    dayCount: days.length,
    foodEntryCount: [...map.values()].reduce((n, d) => n + d.foods.length, 0),
  };
}

export function parseMacroFactorSheets(sheets) {
  const map = new Map();
  const names = Object.keys(sheets || {});

  if (sheets['Quick Export']) {
    ingestDailyRows(map, sheets['Quick Export']);
  }
  if (sheets['Calories & Macros']) {
    ingestDailyRows(map, sheets['Calories & Macros']);
  }
  if (sheets['Food Log']) {
    ingestFoodRows(map, sheets['Food Log']);
  }
  // Scale weight alone (All-Time) — attach to days even without macros yet.
  if (sheets['Scale Weight']) {
    for (const row of sheets['Scale Weight']) {
      const day = parseImportDate(pick(row, DATE_HEADERS));
      if (!day) continue;
      const weightKg = weightKgFromRow(row);
      if (weightKg != null && weightKg > 0) ensureDay(map, day).weightKg = weightKg;
    }
  }

  let format = 'unknown';
  if (names.includes('Quick Export')) format = 'quick';
  else if (names.includes('Calories & Macros')) format = 'alltime';
  else if (names.includes('Food Log')) format = 'food-log';

  if (!daysWouldExist(map) && names.length === 1) {
    // Single anonymous sheet / CSV-as-sheet
    const only = sheets[names[0]] || [];
    ingestDailyRows(map, only);
    ingestFoodRows(map, only);
    format = format === 'unknown' ? 'sheet' : format;
  }

  const result = finish(map, format);
  if (!result.dayCount) {
    throw new Error(
      'No MacroFactor nutrition rows found. Use Quick Export, Calories & Macros, or a Food Log sheet.'
    );
  }
  return result;
}

function daysWouldExist(map) {
  for (const entry of map.values()) {
    if (entry.foods.length || entry.daily) return true;
  }
  return false;
}

/** RFC4180-ish CSV → array of objects. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let i = 0;
  let inQuotes = false;
  const src = String(text || '').replace(/^\uFEFF/, '');
  while (i < src.length) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ',') {
      row.push(cell);
      cell = '';
      i += 1;
      continue;
    }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i += 1;
      row.push(cell);
      if (row.some((c) => String(c).trim() !== '')) rows.push(row);
      row = [];
      cell = '';
      i += 1;
      continue;
    }
    cell += ch;
    i += 1;
  }
  if (cell.length || row.length) {
    row.push(cell);
    if (row.some((c) => String(c).trim() !== '')) rows.push(row);
  }
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => String(h || '').trim());
  return rows.slice(1).map((cells) => {
    const obj = {};
    headers.forEach((header, idx) => {
      if (header) obj[header] = cells[idx] ?? '';
    });
    return obj;
  });
}

export function parseMacroFactorCsv(text) {
  const rows = parseCsv(text);
  if (!rows.length) throw new Error('CSV is empty or missing a header row.');
  const map = new Map();
  ingestDailyRows(map, rows);
  ingestFoodRows(map, rows);
  const result = finish(map, 'csv');
  if (!result.dayCount) {
    throw new Error('No dated calorie/macro rows found in that CSV.');
  }
  return result;
}

/**
 * @param {File|Blob} file
 */
export async function parseMacroFactorFile(file) {
  const name = (file?.name || '').toLowerCase();
  const buffer = await file.arrayBuffer();
  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    const text = new TextDecoder('utf-8').decode(buffer);
    return parseMacroFactorCsv(text);
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xlsm')) {
    const sheets = readXlsxSheets(buffer);
    return parseMacroFactorSheets(sheets);
  }
  // Sniff: ZIP/xlsx starts with PK
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    return parseMacroFactorSheets(readXlsxSheets(buffer));
  }
  const text = new TextDecoder('utf-8').decode(buffer);
  return parseMacroFactorCsv(text);
}

/** kg → lb for the weigh habit (starter unit is lb). */
export function kgToLb(kg) {
  const n = Number(kg);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 2.2046226218 * 10) / 10;
}
