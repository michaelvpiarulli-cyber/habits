/**
 * Filter, sort, and group rows for table / board / list views.
 * Rows are plain objects. Missing values sort first.
 */

export function matchesFilter(row, filter) {
  if (!filter || filter.value == null || filter.value === '') return true;
  const raw = row?.[filter.key];
  const cell = String(raw ?? '').toLowerCase();
  const value = String(filter.value).toLowerCase();
  if (filter.op === 'is') return cell === value;
  if (filter.op === 'before') return String(raw ?? '') !== '' && String(raw) < String(filter.value);
  if (filter.op === 'after') return String(raw ?? '') !== '' && String(raw) > String(filter.value);
  return cell.includes(value);
}

export function applyCollection(rows, { query = '', filters = [], sort = null } = {}) {
  const q = String(query || '').trim().toLowerCase();
  let list = (rows || []).filter((row) => {
    if (q) {
      const hay = Object.values(row).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return (filters || []).every((filter) => matchesFilter(row, filter));
  });
  if (sort?.key) {
    const dir = sort.dir === 'desc' ? -1 : 1;
    list = list.slice().sort((a, b) => {
      const av = a[sort.key] ?? '';
      const bv = b[sort.key] ?? '';
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
  }
  return list;
}

export function monthGrid(anchorIso, rows, dateKey = 'date') {
  const base = anchorIso ? new Date(`${String(anchorIso).slice(0, 7)}-01T12:00:00`) : new Date();
  const year = base.getFullYear();
  const month = base.getMonth();
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (let day = 1; day <= count; day += 1) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dow = (new Date(`${iso}T12:00:00`).getDay() + 6) % 7;
    const items = (rows || []).filter((row) => {
      if (String(row?.[dateKey] || '').slice(0, 10) === iso) return true;
      return Array.isArray(row?.weekdays) && row.weekdays.includes(dow);
    });
    cells.push({ iso, day, items });
  }
  while (cells.length % 7) cells.push(null);
  return {
    label: first.toLocaleString(undefined, { month: 'long', year: 'numeric' }),
    cursor: `${year}-${String(month + 1).padStart(2, '0')}-01`,
    cells,
  };
}

export function shiftMonth(iso, delta) {
  const date = new Date(`${String(iso).slice(0, 7)}-01T12:00:00`);
  date.setMonth(date.getMonth() + delta);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

export function groupRows(rows, key) {
  const groups = new Map();
  for (const row of rows || []) {
    const name = String(row?.[key] || 'Empty');
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(row);
  }
  return [...groups.entries()];
}
