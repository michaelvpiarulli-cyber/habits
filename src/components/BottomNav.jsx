const TABS = [
  {
    id: 'home',
    label: 'Home',
    path: 'M4 11l8-7 8 7v9H4z',
  },
  {
    id: 'today',
    label: 'Today',
    path: 'M5 5h14v14H5z',
  },
  {
    id: 'tasks',
    label: 'Tasks',
    path: 'M5 6h14v2H5zM5 11h14v2H5zM5 16h10v2H5z',
  },
  {
    id: 'calendar',
    label: 'Calendar',
    path: 'M6 5h12v3H6zM6 10h3v3H6zM10.5 10h3v3h-3zM15 10h3v3h-3zM6 15h3v3H6zM10.5 15h3v3h-3zM15 15h3v3h-3z',
  },
  {
    id: 'more',
    label: 'More',
    path: 'M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z',
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
