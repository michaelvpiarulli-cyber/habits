const GROUPS = [
  {
    label: 'Body',
    pages: [
      { id: 'calories', label: 'Calories' },
      { id: 'record', label: 'Record' },
      { id: 'habits', label: 'Habits' },
    ],
  },
  {
    label: 'Work',
    pages: [
      { id: 'jobs', label: 'Jobs' },
      { id: 'tasks', label: 'Tasks' },
      { id: 'mail', label: 'Mail' },
    ],
  },
  {
    label: 'Life',
    pages: [
      { id: 'books', label: 'Books' },
      { id: 'money', label: 'Money' },
      { id: 'goals', label: 'Goals' },
      { id: 'identity', label: 'Identity' },
    ],
  },
];

export function MoreView({ onOpen }) {
  return (
    <div className="view">
      <h1 className="visually-hidden">More</h1>
      {GROUPS.map((group) => (
        <section key={group.label} className="more-group">
          <h2 className="eyebrow">{group.label}</h2>
          <ul className="more-list">
            {group.pages.map((page) => (
              <li key={page.id}>
                <button type="button" className="more-row" onClick={() => onOpen('more', page.id)}>
                  {page.label}
                  <span aria-hidden="true">›</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
