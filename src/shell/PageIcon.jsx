function Glyph({ name }) {
  const common = {
    viewBox: '0 0 16 16',
    width: '16',
    height: '16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.5',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };
  if (name === 'today') {
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="2.5" />
        <path d="M8 1.8v1.7M8 12.5v1.7M1.8 8h1.7M12.5 8h1.7M3.4 3.4l1.2 1.2M11.4 11.4l1.2 1.2M12.6 3.4l-1.2 1.2M4.6 11.4l-1.2 1.2" />
      </svg>
    );
  }
  if (name === 'plan') {
    return (
      <svg {...common}>
        <rect x="2.2" y="3.2" width="11.6" height="10.2" rx="1.5" />
        <path d="M2.2 6.5h11.6M5.2 2v2.4M10.8 2v2.4" />
      </svg>
    );
  }
  if (name === 'body') {
    return (
      <svg {...common}>
        <path d="M2.2 8h11.6M4.2 5.4v5.2M11.8 5.4v5.2M2.6 6.3v3.4M13.4 6.3v3.4" />
      </svg>
    );
  }
  if (name === 'word') {
    return (
      <svg {...common}>
        <path d="M3 3h4c.9 0 1.8.7 1.8 1.7v8c0-1-.9-1.7-1.8-1.7H3zM13 3H9c-.9 0-1.8.7-1.8 1.7v8c0-1 .9-1.7 1.8-1.7H13z" />
      </svg>
    );
  }
  if (name === 'jeno') {
    return (
      <svg {...common}>
        <path d="M8 1.6 9.2 6.2 13.8 8 9.2 9.8 8 14.4 6.8 9.8 2.2 8 6.8 6.2z" />
      </svg>
    );
  }
  if (name === 'log') {
    return (
      <svg {...common}>
        <path d="M9.4 2.4 13.6 6.6 6.4 13.8H2.2V9.6z" />
        <path d="M8.2 3.6 12.4 7.8" />
      </svg>
    );
  }
  if (name === 'settings') {
    return (
      <svg {...common}>
        <path d="M1.8 4h12.4M1.8 8h12.4M1.8 12h12.4" />
        <circle cx="5.6" cy="4" r="1.35" fill="currentColor" stroke="none" />
        <circle cx="10.6" cy="8" r="1.35" fill="currentColor" stroke="none" />
        <circle cx="6.8" cy="12" r="1.35" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (name === 'search') {
    return (
      <svg {...common}>
        <circle cx="7" cy="7" r="3.3" />
        <path d="M9.5 9.5 13 13" />
      </svg>
    );
  }
  if (name === 'trash') {
    return (
      <svg {...common}>
        <path d="M3 4.5h10M6.2 4.5V3h3.6v1.5M4.4 4.5l.6 8.4h6l.6-8.4" />
      </svg>
    );
  }
  if (name === 'plus') {
    return (
      <svg {...common}>
        <path d="M8 3.2v9.6M3.2 8h9.6" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M4 2.2h5.1L13 6.1v7.2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V3.2a1 1 0 0 1 1-1z" />
      <path d="M9 2.4V6h3.6" />
    </svg>
  );
}

export function PageIcon({ page, name, large = false }) {
  const custom = page && !page.systemKey && page.icon;
  return (
    <span className={`page-icon${large ? ' is-large' : ''}`} aria-hidden="true">
      {custom ? <span className="page-emoji">{page.icon}</span> : <Glyph name={name || page?.systemKey || 'page'} />}
    </span>
  );
}
