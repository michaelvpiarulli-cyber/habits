const PAGES = [
  { id: 'calories', label: 'Calories', detail: 'Meals and macros' },
  { id: 'record', label: 'Record', detail: 'Habit grid and streaks' },
  { id: 'habits', label: 'Habits', detail: 'Edit the daily set' },
  { id: 'goals', label: 'Goals', detail: 'Longer horizon' },
  { id: 'identity', label: 'Identity', detail: 'Who you are becoming' },
  { id: 'books', label: 'Books', detail: 'Pages and currently reading' },
  { id: 'jobs', label: 'Jobs', detail: 'Applications and follow-ups' },
  { id: 'money', label: 'Money', detail: 'Accounts, budget, spend' },
  { id: 'mail', label: 'Mail', detail: 'Gmail inbox' },
];

export function MoreView({ onOpen }) {
  return (
    <div className="view">
      <header className="view__head">
        <p className="eyebrow">Everything else</p>
        <h1 className="view__title">More</h1>
      </header>
      <ul className="more-grid">
        {PAGES.map((page) => (
          <li key={page.id}>
            <button type="button" className="more-card" onClick={() => onOpen('more', page.id)}>
              <span className="more-card__name">{page.label}</span>
              <span className="more-card__meta">{page.detail}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
