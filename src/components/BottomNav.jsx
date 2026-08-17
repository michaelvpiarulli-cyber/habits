const TABS = [
  { id: 'today', label: 'Today', path: 'M7 4h10v2H7zM5 8h14v12H5z' },
  { id: 'tasks', label: 'Tasks', path: 'M6 7h12v2H6zM6 11h12v2H6zM6 15h8v2H6z' },
  { id: 'calendar', label: 'Plan', path: 'M7 4h2v3H7zM15 4h2v3h-2zM5 7h14v13H5zM5 11h14' },
  { id: 'more', label: 'More', path: 'M6 7h3v3H6zM11 7h3v3h-3zM16 7h3v3h-3zM6 12h3v3H6zM11 12h3v3h-3zM16 12h3v3h-3z' },
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
