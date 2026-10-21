import { useMemo, useState } from 'react';
import { applyCollection, groupRows, monthGrid, shiftMonth } from '../lib/collectionView';
import { todayISO } from '../lib/dates';
import { priorityLabel, priorityRank, priorityTone } from '../lib/life';

function Pill({ value }) {
  const key = String(value || '').toLowerCase();
  const tone = key === 'done' || key === 'rated' ? 'done' : key === 'open' || key === 'logged' ? 'open' : '';
  return <span className={`pill ${tone}`}>{value || 'Empty'}</span>;
}

export function Collection({ title, rows, columns, groupKey, onUpdate, onAdd, readOnly = false, initialSort = null }) {
  const [view, setView] = useState('table');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(initialSort);
  const [filters, setFilters] = useState([]);
  const [draft, setDraft] = useState('');
  const [group, setGroup] = useState(groupKey || 'status');
  const [cursor, setCursor] = useState(() => todayISO());

  const shown = useMemo(
    () => applyCollection(rows, { query, filters, sort }),
    [rows, query, filters, sort]
  );
  const groups = useMemo(() => groupRows(shown, group || columns[1]?.key || 'status'), [shown, group, columns]);
  const calendar = useMemo(() => monthGrid(cursor, shown, 'date'), [cursor, shown]);

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
    if (column.kind === 'plain') return row[column.key] || 'Empty';
    if (column.kind === 'checkbox') {
      const on = row[column.key] === true || row[column.key] === 'true';
      return (
        <input
          type="checkbox"
          aria-label={`${column.label} for ${row.title}`}
          checked={on}
          disabled={readOnly || !onUpdate}
          onChange={(event) => onUpdate?.(row.id, { [column.key]: event.target.checked })}
        />
      );
    }
    if (readOnly || column.kind === 'title' && !onUpdate) {
      return column.kind === 'status' || column.kind === 'tags' ? <Pill value={row[column.key]} /> : (row[column.key] || 'Empty');
    }
    if (!onUpdate) return row[column.key] || 'Empty';
    if (column.kind === 'status' || column.kind === 'select' || column.kind === 'rating') {
      const priority = column.key === 'priority';
      return (
        <select
          className={priority ? `prio-select tone-${priorityTone(row[column.key])}` : undefined}
          aria-label={`${column.label} for ${row.title}`}
          value={row[column.key] || ''}
          onChange={(event) => onUpdate(row.id, { [column.key]: event.target.value })}
        >
          <option value="">Empty</option>
          {(column.options || []).map((option) => (
            <option key={option} value={option}>{priority ? priorityLabel(option) : option}</option>
          ))}
        </select>
      );
    }
    if (column.kind === 'number' || column.kind === 'url') {
      return (
        <input
          type={column.kind === 'url' ? 'url' : 'text'}
          inputMode={column.kind === 'number' ? 'decimal' : undefined}
          aria-label={`${column.label} for ${row.title}`}
          value={row[column.key] || ''}
          onChange={(event) => onUpdate(row.id, { [column.key]: event.target.value })}
        />
      );
    }
    if (column.kind === 'multi' || column.kind === 'tags') {
      const selected = String(row[column.key] || '').split(',').map((item) => item.trim()).filter(Boolean);
      const options = column.options || [];
      if (!options.length || readOnly || !onUpdate) return selected.join(', ') || 'Empty';
      return (
        <div className="multi">
          {options.map((option) => {
            const on = selected.includes(option);
            return (
              <button
                key={option}
                type="button"
                className={`pill ${on ? 'is-on' : ''}`}
                aria-pressed={on}
                onClick={() => {
                  const next = on ? selected.filter((item) => item !== option) : [...selected, option];
                  onUpdate(row.id, { [column.key]: next.join(',') });
                }}
              >
                {option}
              </button>
            );
          })}
        </div>
      );
    }
    if (column.kind === 'relation') {
      return <span className="token">{row[column.key] || 'Empty'}</span>;
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
        <select className="group-by" aria-label={`Group ${title}`} value={group} onChange={(event) => setGroup(event.target.value)}>
          {columns.filter((column) => column.key !== 'title').map((column) => (
            <option key={column.key} value={column.key}>{column.label}</option>
          ))}
        </select>
        <div className="view-switch" role="tablist" aria-label={`${title} view`}>
          {['table', 'board', 'list', 'calendar', 'gallery'].map((name) => (
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
                <article key={row.id} className={`board-card tone-${priorityTone(row.priority)}`}>
                  <strong>{row.title || 'Untitled'}</strong>
                  {columns.filter((column) => column.key !== 'title' && column.key !== group).map((column) => (
                    <span key={column.key} className={column.key === 'priority' ? `prio-meta tone-${priorityTone(row[column.key])}` : 'faint'}>
                      {column.key === 'priority' ? priorityLabel(row[column.key]) : `${column.label}: ${row[column.key] || 'Empty'}`}
                    </span>
                  ))}
                </article>
              ))}
            </div>
          ))}
        </div>
      )}

      {view === 'calendar' && (
        <div className="calendar">
          <div className="db-bar">
            <button type="button" className="db-add" onClick={() => setCursor(shiftMonth(calendar.cursor, -1))}>‹</button>
            <strong>{calendar.label}</strong>
            <button type="button" className="db-add" onClick={() => setCursor(shiftMonth(calendar.cursor, 1))}>›</button>
          </div>
          <div className="cal-grid">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((name) => <span key={name} className="cal-dow">{name}</span>)}
            {calendar.cells.map((cell, index) => (
              <div key={cell?.iso || `empty-${index}`} className="cal-day">
                {cell && <span>{cell.day}</span>}
                {cell?.items.slice().sort((a, b) => priorityRank(a) - priorityRank(b)).slice(0, 3).map((row) => {
                  const known = ['urgent', 'high', 'medium', 'low', 'none'].includes(row.priority);
                  const late = known && row.priority === 'urgent' && row.date && row.date < todayISO();
                  return (
                    <em key={row.id} className={known ? `cal-task tone-${priorityTone(row.priority)}${late ? ' is-late' : ''}` : undefined} title={known ? priorityLabel(row.priority) : undefined}>
                      {known ? <i aria-hidden="true" /> : null}
                      <b>{row.title}</b>
                    </em>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'gallery' && (
        <div className="gallery">
          {shown.length === 0 ? <p className="quiet">No rows</p> : shown.map((row) => (
            <article key={row.id} className="gallery-card">
              <strong>{row.title || 'Untitled'}</strong>
              {columns.filter((column) => column.key !== 'title').slice(0, 3).map((column) => (
                <span key={column.key} className="faint">{column.label}: {String(row[column.key] ?? 'Empty')}</span>
              ))}
            </article>
          ))}
        </div>
      )}

      {view === 'list' && (
        <div className="list-view">
          {shown.length === 0 ? <p className="quiet">No rows</p> : shown.map((row) => (
            <div key={row.id} className={`list-row tone-${priorityTone(row.priority)}`}>
              <Pill value={row[groupKey] || row.status || ''} />
              <span className="list-title">{row.title || 'Untitled'}</span>
              <span className="faint">{row.date || row.tags || ''}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
