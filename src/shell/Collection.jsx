import { useMemo, useState } from 'react';
import { applyCollection, groupRows } from '../lib/collectionView';

function Pill({ value }) {
  const key = String(value || '').toLowerCase();
  const tone = key === 'done' || key === 'rated' ? 'done' : key === 'open' || key === 'logged' ? 'open' : '';
  return <span className={`pill ${tone}`}>{value || 'Empty'}</span>;
}

export function Collection({ title, rows, columns, groupKey, onUpdate, onAdd, readOnly = false }) {
  const [view, setView] = useState('table');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(null);
  const [filters, setFilters] = useState([]);
  const [draft, setDraft] = useState('');

  const shown = useMemo(
    () => applyCollection(rows, { query, filters, sort }),
    [rows, query, filters, sort]
  );
  const groups = useMemo(() => groupRows(shown, groupKey || columns[1]?.key || 'status'), [shown, groupKey, columns]);

  const toggleSort = (key) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };

  const addFilter = () => {
    const column = columns.find((item) => item.key !== 'title') || columns[0];
    setFilters((prev) => [...prev, { key: column.key, op: 'contains', value: '' }]);
  };

  const cell = (row, column) => {
    if (column.kind === 'plain') return row[column.key] || '—';
    if (readOnly || column.kind === 'title' && !onUpdate) {
      return column.kind === 'status' || column.kind === 'tags' ? <Pill value={row[column.key]} /> : (row[column.key] || '—');
    }
    if (!onUpdate) return row[column.key] || '—';
    if (column.kind === 'status' || column.kind === 'select' || column.kind === 'rating') {
      return (
        <select
          aria-label={`${column.label} for ${row.title}`}
          value={row[column.key] || ''}
          onChange={(event) => onUpdate(row.id, { [column.key]: event.target.value })}
        >
          <option value="">Empty</option>
          {(column.options || []).map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      );
    }
    if (column.kind === 'date') {
      return (
        <input
          type="date"
          aria-label={`${column.label} for ${row.title}`}
          value={row[column.key] || ''}
          onChange={(event) => onUpdate(row.id, { [column.key]: event.target.value })}
        />
      );
    }
    return (
      <input
        aria-label={`${column.label} for ${row.title}`}
        value={row[column.key] || ''}
        onChange={(event) => onUpdate(row.id, { [column.key]: event.target.value })}
      />
    );
  };

  return (
    <section className="collection" aria-label={title}>
      <div className="db-bar">
        <h2>{title}</h2>
        <div className="view-switch" role="tablist" aria-label={`${title} view`}>
          {['table', 'board', 'list'].map((name) => (
            <button key={name} type="button" role="tab" aria-selected={view === name} className={view === name ? 'is-on' : ''} onClick={() => setView(name)}>
              {name[0].toUpperCase() + name.slice(1)}
            </button>
          ))}
        </div>
        <input className="db-search" value={query} placeholder="Filter" aria-label={`Filter ${title}`} onChange={(event) => setQuery(event.target.value)} />
        <button type="button" className="db-add" onClick={addFilter}>Filter</button>
        {onAdd && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!draft.trim()) return;
              onAdd(draft.trim());
              setDraft('');
            }}
          >
            <input className="db-search" value={draft} placeholder="New" aria-label={`New ${title}`} onChange={(event) => setDraft(event.target.value)} />
          </form>
        )}
      </div>
      {filters.length > 0 && (
        <div className="filters">
          {filters.map((filter, index) => (
            <div key={`${filter.key}-${index}`}>
              <select
                aria-label="Property"
                value={filter.key}
                onChange={(event) => setFilters((prev) => prev.map((item, i) => (i === index ? { ...item, key: event.target.value } : item)))}
              >
                {columns.map((column) => <option key={column.key} value={column.key}>{column.label}</option>)}
              </select>
              <select
                aria-label="Operator"
                value={filter.op}
                onChange={(event) => setFilters((prev) => prev.map((item, i) => (i === index ? { ...item, op: event.target.value } : item)))}
              >
                <option value="contains">contains</option>
                <option value="is">is</option>
                <option value="before">before</option>
                <option value="after">after</option>
              </select>
              <input
                aria-label="Filter value"
                value={filter.value}
                onChange={(event) => setFilters((prev) => prev.map((item, i) => (i === index ? { ...item, value: event.target.value } : item)))}
              />
              <button type="button" className="db-add" onClick={() => setFilters((prev) => prev.filter((_, i) => i !== index))}>Remove</button>
            </div>
          ))}
        </div>
      )}

      {view === 'table' && (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key} onClick={() => toggleSort(column.key)}>
                    {column.label}{sort?.key === column.key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.length === 0 ? (
                <tr><td colSpan={columns.length} style={{ padding: 12, color: 'var(--muted)' }}>No rows</td></tr>
              ) : shown.map((row) => (
                <tr key={row.id}>
                  {columns.map((column) => <td key={column.key}>{cell(row, column)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === 'board' && (
        <div className="board-view">
          {groups.map(([name, items]) => (
            <div key={name} className="board-col">
              <h3>{name} {items.length}</h3>
              {items.map((row) => (
                <article key={row.id} className="board-card">
                  <strong>{row.title || 'Untitled'}</strong>
                  {columns.filter((column) => column.key !== 'title' && column.key !== groupKey).map((column) => (
                    <span key={column.key} className="faint">{column.label}: {row[column.key] || '—'}</span>
                  ))}
                </article>
              ))}
            </div>
          ))}
        </div>
      )}

      {view === 'list' && (
        <div className="list-view">
          {shown.length === 0 ? <p className="quiet">No rows</p> : shown.map((row) => (
            <div key={row.id} className="list-row">
              <Pill value={row[groupKey] || row.status || ''} />
              <span>{row.title || 'Untitled'}</span>
              <span className="faint">{row.date || row.tags || ''}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
