/**
 * Minimal .xlsx reader for MacroFactor-style tabular exports.
 * Unzips with fflate, reads shared strings + sheets — no full spreadsheet lib.
 */

import { unzipSync, strFromU8 } from 'fflate';

function decodeXml(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function colToIndex(col) {
  let n = 0;
  for (const ch of col) {
    n = n * 26 + (ch.toUpperCase().charCodeAt(0) - 64);
  }
  return n - 1;
}

function parseSharedStrings(xml) {
  if (!xml) return [];
  const out = [];
  const siRe = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let match;
  while ((match = siRe.exec(xml))) {
    const parts = [];
    const tRe = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
    let t;
    while ((t = tRe.exec(match[1]))) parts.push(decodeXml(t[1]));
    out.push(parts.join(''));
  }
  return out;
}

function parseSheetRows(xml, shared) {
  const rows = [];
  const rowRe = /<row\b[^>]*>([\s\S]*?)<\/row>/g;
  let rowMatch;
  while ((rowMatch = rowRe.exec(xml))) {
    const cells = [];
    const cellRe = /<c\b([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)\/>/g;
    let cellMatch;
    while ((cellMatch = cellRe.exec(rowMatch[1]))) {
      const attrs = cellMatch[1] || cellMatch[3] || '';
      const body = cellMatch[2] || '';
      const ref = /r="([A-Z]+)(\d+)"/.exec(attrs);
      if (!ref) continue;
      const col = colToIndex(ref[1]);
      const type = /t="([^"]+)"/.exec(attrs)?.[1] || '';
      let value = null;
      if (type === 's') {
        const idx = Number(/<v>([\s\S]*?)<\/v>/.exec(body)?.[1]);
        value = Number.isFinite(idx) ? shared[idx] ?? null : null;
      } else if (type === 'inlineStr') {
        const t = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/.exec(body);
        value = t ? decodeXml(t[1]) : '';
      } else if (type === 'b') {
        value = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1] === '1';
      } else {
        const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
        if (v == null || v === '') value = null;
        else if (/^-?\d+(\.\d+)?(e[+-]?\d+)?$/i.test(v)) value = Number(v);
        else value = v;
      }
      cells[col] = value;
    }
    if (cells.length) rows.push(cells);
  }
  return rows;
}

function rowsToObjects(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map((h) => (h == null ? '' : String(h).trim()));
  const out = [];
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || row.every((c) => c == null || c === '')) continue;
    const obj = {};
    let any = false;
    headers.forEach((header, idx) => {
      if (!header) return;
      const value = row[idx] ?? null;
      if (value != null && value !== '') any = true;
      obj[header] = value;
    });
    if (any) out.push(obj);
  }
  return out;
}

function sheetPathMap(files) {
  const workbook = strFromU8(files['xl/workbook.xml'] || new Uint8Array());
  const rels = strFromU8(files['xl/_rels/workbook.xml.rels'] || new Uint8Array());
  const ridToTarget = {};
  const relRe = /<Relationship\b([^>]*)\/>/g;
  let rel;
  while ((rel = relRe.exec(rels))) {
    const id = /Id="([^"]+)"/.exec(rel[1])?.[1];
    const target = /Target="([^"]+)"/.exec(rel[1])?.[1];
    if (id && target) {
      ridToTarget[id] = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
    }
  }
  const sheets = {};
  const sheetRe = /<sheet\b([^>]*)\/>/g;
  let sheet;
  while ((sheet = sheetRe.exec(workbook))) {
    const name = /name="([^"]+)"/.exec(sheet[1])?.[1];
    const rid = /r:id="([^"]+)"/.exec(sheet[1])?.[1];
    if (name && rid && ridToTarget[rid]) sheets[name] = ridToTarget[rid];
  }
  return sheets;
}

/**
 * @param {ArrayBuffer|Uint8Array} buffer
 * @returns {Record<string, Array<Record<string, unknown>>>}
 */
export function readXlsxSheets(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const files = unzipSync(bytes);
  const shared = parseSharedStrings(strFromU8(files['xl/sharedStrings.xml'] || new Uint8Array()));
  const paths = sheetPathMap(files);
  const sheets = {};
  for (const [name, path] of Object.entries(paths)) {
    const xml = strFromU8(files[path] || new Uint8Array());
    sheets[name] = rowsToObjects(parseSheetRows(xml, shared));
  }
  return sheets;
}
