const TABS = [
  { id: 'today', label: 'Habits', path: 'M7 4h10v2H7zM5 8h14v12H5z' },
  { id: 'more', label: 'Plan', path: 'M5 5h6v6H5zM13 5h6v3h-6zM13 10h6v9h-6zM5 13h6v6H5z' },
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
