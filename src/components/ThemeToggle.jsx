/**
 * Compact chrome control that cycles light → dark → system.
 * Preference also lives in Account → Theme for an explicit choice.
 */
export function ThemeToggle({ theme }) {
  const label = { light: 'Light', dark: 'Dark', system: 'System' }[theme.pref];
  const next = { light: 'Dark', dark: 'System', system: 'Light' }[theme.pref];

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={theme.cycle}
      aria-label={`Theme: ${label}. Switch to ${next}.`}
      title={`Theme: ${label}`}
    >
      <ThemeIcon pref={theme.pref} />
      <span className="theme-toggle__label">{label}</span>
    </button>
  );
}

function ThemeIcon({ pref }) {
  if (pref === 'dark') {
    return (
      <svg className="theme-toggle__icon" viewBox="0 0 16 16" aria-hidden="true">
        <path
          fill="currentColor"
          d="M11.2 10.6A5.2 5.2 0 0 1 5.4 4.8 5.4 5.4 0 1 0 11.2 10.6Z"
        />
      </svg>
    );
  }

  if (pref === 'system') {
    return (
      <svg className="theme-toggle__icon" viewBox="0 0 16 16" aria-hidden="true">
        <rect x="2" y="3" width="12" height="8" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5.5 13h5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
      </svg>
    );
  }

  return (
    <svg className="theme-toggle__icon" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="2.6" fill="currentColor" />
      <path
        d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="square"
      />
    </svg>
  );
}
