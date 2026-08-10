/**
 * MacroFactor export import — run with `npm test`.
 */
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import {
  kgToLb,
  parseCsv,
  parseImportDate,
  parseMacroFactorCsv,
  parseMacroFactorFile,
  parseMacroFactorSheets,
} from '../src/lib/macroFactorImport.js';
import { readXlsxSheets } from '../src/lib/xlsxRead.js';

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

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  FAIL  ${name}`);
    console.error(`        ${err.message}`);
  }
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function colName(index) {
  let n = index + 1;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** Build a tiny xlsx ArrayBuffer with shared strings for tests. */
function buildXlsx(sheetSpecs) {
  const shared = [];
  const sharedIndex = (text) => {
    const s = String(text);
    let i = shared.indexOf(s);
    if (i < 0) {
      i = shared.length;
      shared.push(s);
    }
    return i;
  };

  const sheetXml = {};
  const sheetNames = Object.keys(sheetSpecs);
  sheetNames.forEach((name, idx) => {
    const rows = sheetSpecs[name];
    let body = '';
    rows.forEach((row, rIdx) => {
      const rowNum = rIdx + 1;
      let cells = '';
      row.forEach((value, cIdx) => {
        const ref = `${colName(cIdx)}${rowNum}`;
        if (typeof value === 'number') {
          cells += `<c r="${ref}"><v>${value}</v></c>`;
        } else if (value == null || value === '') {
          // skip
        } else {
          cells += `<c r="${ref}" t="s"><v>${sharedIndex(value)}</v></c>`;
        }
      });
      body += `<row r="${rowNum}">${cells}</row>`;
    });
    sheetXml[`xl/worksheets/sheet${idx + 1}.xml`] = strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
        `<sheetData>${body}</sheetData></worksheet>`
    );
  });

  const sharedXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${shared.length}" uniqueCount="${shared.length}">` +
    shared.map((s) => `<si><t>${escapeXml(s)}</t></si>`).join('') +
    `</sst>`;

  const workbook =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets>` +
    sheetNames
      .map(
        (name, idx) =>
          `<sheet name="${escapeXml(name)}" sheetId="${idx + 1}" r:id="rId${idx + 1}"/>`
      )
      .join('') +
    `</sheets></workbook>`;

  const rels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    sheetNames
      .map(
        (_, idx) =>
          `<Relationship Id="rId${idx + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${idx + 1}.xml"/>`
      )
      .join('') +
    `</Relationships>`;

  const contentTypes =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>` +
    sheetNames
      .map(
        (_, idx) =>
          `<Override PartName="/xl/worksheets/sheet${idx + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
      )
      .join('') +
    `</Types>`;

  const files = {
    '[Content_Types].xml': strToU8(contentTypes),
    'xl/workbook.xml': strToU8(workbook),
    'xl/_rels/workbook.xml.rels': strToU8(rels),
    'xl/sharedStrings.xml': strToU8(sharedXml),
    ...sheetXml,
  };
  return zipSync(files).buffer;
}

console.log('macroFactorImport');

async function main() {
test('parseImportDate handles ISO and excel serials', () => {
  assert.equal(parseImportDate('2026-08-01'), '2026-08-01');
  assert.equal(parseImportDate('8/1/2026'), '2026-08-01');
  const serial = Date.UTC(2026, 7, 1) / 86400000 + 25569;
  assert.equal(parseImportDate(serial), '2026-08-01');
});

test('parseCsv reads quoted fields', () => {
  const rows = parseCsv('Date,Food Name,Calories (kcal)\n2026-08-01,"Eggs, scrambled",180\n');
  assert.equal(rows.length, 1);
  assert.equal(rows[0]['Food Name'], 'Eggs, scrambled');
  assert.equal(rows[0]['Calories (kcal)'], '180');
});

test('CSV daily macros become one MacroFactor meal', () => {
  const result = parseMacroFactorCsv(
    [
      'Date,Calories (kcal),Protein (g),Carbs (g),Fat (g),Target Calories (kcal),Target Protein (g)',
      '2026-08-01,2100,180,200,70,2200,185',
      '2026-08-02,1950,170,180,65,2200,185',
    ].join('\n')
  );
  assert.equal(result.format, 'csv');
  assert.equal(result.dayCount, 2);
  assert.equal(result.days[0].meals[0].label, 'MacroFactor');
  assert.equal(result.days[0].calories, 2100);
  assert.equal(result.days[0].protein, 180);
  assert.equal(result.targets.calories, 2200);
  assert.equal(result.targets.protein, 185);
});

test('Food Log rows group into meal slots', () => {
  const result = parseMacroFactorSheets({
    'Food Log': [
      {
        Date: '2026-08-01',
        Time: '8:00 AM',
        'Food Name': 'Eggs',
        'Serving Size': '2 large',
        'Serving Qty': 1,
        'Calories (kcal)': 140,
        'Protein (g)': 12,
        'Carbs (g)': 1,
        'Fat (g)': 10,
      },
      {
        Date: '2026-08-01',
        Time: '12:30 PM',
        'Food Name': 'Chicken bowl',
        'Serving Size': '1 bowl',
        'Serving Qty': 1,
        'Calories (kcal)': 550,
        'Protein (g)': 45,
        'Carbs (g)': 50,
        'Fat (g)': 18,
      },
    ],
  });
  assert.equal(result.dayCount, 1);
  assert.equal(result.foodEntryCount, 2);
  const slots = result.days[0].meals.map((m) => m.slot).sort();
  assert.deepEqual(slots, ['breakfast', 'lunch']);
  assert.equal(result.days[0].calories, 690);
});

test('Quick Export sheet maps targets and weight', () => {
  const result = parseMacroFactorSheets({
    'Quick Export': [
      {
        Date: '2026-08-03',
        'Calories (kcal)': 2000,
        'Protein (g)': 160,
        'Carbs (g)': 180,
        'Fat (g)': 70,
        'Target Calories (kcal)': 2300,
        'Target Protein (g)': 190,
        'Target Carbs (g)': 200,
        'Target Fat (g)': 75,
        'Weight (kg)': 82.5,
      },
    ],
  });
  assert.equal(result.format, 'quick');
  assert.equal(result.days[0].targets.calories, 2300);
  assert.equal(result.days[0].weightKg, 82.5);
  assert.equal(kgToLb(82.5), 181.9);
});

await testAsync('reads MacroFactor-like workbook via xlsx', async () => {
  const buffer = buildXlsx({
    'Quick Export': [
      [
        'Date',
        'Calories (kcal)',
        'Protein (g)',
        'Carbs (g)',
        'Fat (g)',
        'Target Calories (kcal)',
        'Target Protein (g)',
      ],
      ['2026-08-04', 2050, 175, 190, 68, 2200, 185],
    ],
  });
  const sheets = readXlsxSheets(buffer);
  assert.ok(sheets['Quick Export']);
  assert.equal(sheets['Quick Export'][0]['Calories (kcal)'], 2050);
  const file = new File([buffer], 'macrofactor-quick.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const parsed = await parseMacroFactorFile(file);
  assert.equal(parsed.dayCount, 1);
  assert.equal(parsed.days[0].calories, 2050);
  assert.equal(parsed.targets.protein, 185);
});

if (failed) {
  console.error(`\n${failed} macroFactorImport test(s) failed`);
  process.exit(1);
}
console.log('macroFactorImport: all good\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
