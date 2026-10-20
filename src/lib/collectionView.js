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

export function groupRows(rows, key) {
  const groups = new Map();
  for (const row of rows || []) {
    const name = String(row?.[key] || 'Empty');
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(row);
  }
  return [...groups.entries()];
}
