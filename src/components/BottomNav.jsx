const TABS = [
  {
    id: 'today',
    label: 'Today',
    // A single filled square: the day's mark.
    path: 'M5 5h14v14H5z',
  },
  {
    id: 'record',
    label: 'Record',
    // A run of days, one short — the grid in miniature.
    path: 'M4 5h5v5H4zM11 5h5v5h-5zM4 12h5v5H4zM11 12h5v5h-5zM18 5h2v5h-2z',
  },
  {
    id: 'goals',
    label: 'Goals',
    // A bar filling toward a line.
    path: 'M4 9h11v6H4zM18 5h2v14h-2z',
  },
  {
    id: 'habits',
    label: 'Habits',
    // Stacked rows: the list itself.
    path: 'M4 5h16v3H4zM4 10.5h16v3H4zM4 16h16v3H4z',
  },
  {
    id: 'values',
    label: 'Values',
    // A plumb line: the thing you measure true against.
    path: 'M11 3h2v13h-2zM12 17l4 4H8z',
  },
];

export function BottomNav({ tab, onChange }) {
  return (
    <nav className="nav" style={{ '--tabs': TABS.length }} aria-label="Sections">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`nav__tab ${tab === t.id ? 'is-on' : ''}`}
          onClick={() => onChange(t.id)}
          aria-current={tab === t.id ? 'page' : undefined}
        >
          <svg className="nav__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d={t.path} fill="currentColor" />
          </svg>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
