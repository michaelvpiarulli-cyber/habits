import { colorForHabit, iconForHabit } from '../lib/habitIcons';

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

function HabitGlyph({ name }) {
  if (name === 'scale') {
    return (
      <svg {...common}>
        <path d="M8 2.4v8.2M4.6 13.2h6.8" />
        <path d="M2.4 6.2 8 3.4l5.6 2.8" />
        <path d="M2.4 6.2c0 1.3.9 2.1 1.9 2.1s1.9-.8 1.9-2.1M9.8 6.2c0 1.3.9 2.1 1.9 2.1s1.9-.8 1.9-2.1" />
      </svg>
    );
  }
  if (name === 'droplet') {
    return (
      <svg {...common}>
        <path d="M8 2.1c.3 2.1 3.3 3.8 3.3 6.5a3.3 3.3 0 0 1-6.6 0C4.7 5.9 7.7 4.2 8 2.1z" />
      </svg>
    );
  }
  if (name === 'footprints') {
    return (
      <svg {...common}>
        <path d="M5.4 2.6c.9 0 1.5.8 1.3 1.7l-.7 2.6c-.2.8-.9 1.2-1.6 1.2-.9 0-1.5-.8-1.3-1.7l.7-2.6c.2-.8.9-1.2 1.6-1.2z" />
        <path d="M11.1 7.2c.9 0 1.5.8 1.3 1.7l-.7 2.6c-.2.8-.9 1.2-1.6 1.2-.9 0-1.5-.8-1.3-1.7l.7-2.6c.2-.8.9-1.2 1.6-1.2z" />
      </svg>
    );
  }
  if (name === 'book') {
    return (
      <svg {...common}>
        <path d="M3 3h4c.9 0 1.8.7 1.8 1.7v8c0-1-.9-1.7-1.8-1.7H3zM13 3H9c-.9 0-1.8.7-1.8 1.7v8c0-1 .9-1.7 1.8-1.7H13z" />
      </svg>
    );
  }
  if (name === 'moon') {
    return (
      <svg {...common}>
        <path d="M9.4 2.3a4.9 4.9 0 1 0 4.2 7.1A4.1 4.1 0 0 1 9.4 2.3z" />
      </svg>
    );
  }
  if (name === 'dumbbell') {
    return (
      <svg {...common}>
        <path d="M2.2 8h11.6M4.2 5.5v5M6.2 6.4v3.2M9.8 6.4v3.2M11.8 5.5v5" />
      </svg>
    );
  }
  if (name === 'apple') {
    return (
      <svg {...common}>
        <path d="M8 5.4c-2.3 0-3.8 1.7-3.8 4 0 2.4 1.5 4.2 3.8 4.2s3.8-1.8 3.8-4.2c0-2.3-1.5-4-3.8-4z" />
        <path d="M8 5.3c.3-1.3 1.3-2.1 2.5-2.3" />
      </svg>
    );
  }
  if (name === 'leaf') {
    return (
      <svg {...common}>
        <path d="M3.2 12.2C3.4 7 7.2 3.2 13 3.2 12.4 8.8 8.8 12.6 3.2 12.2z" />
        <path d="M6.2 10.2c1.2-1.4 2.6-2.6 4.4-3.4" />
      </svg>
    );
  }
  if (name === 'heart') {
    return (
      <svg {...common}>
        <path d="M8 13.1 3.5 8.7a2.5 2.5 0 0 1 3.5-3.6L8 6.2l1-1.1a2.5 2.5 0 0 1 3.5 3.6z" />
      </svg>
    );
  }
  if (name === 'sun') {
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="2.3" />
        <path d="M8 2.2v1.5M8 12.3v1.5M2.2 8h1.5M12.3 8h1.5M4 4l1.1 1.1M10.9 10.9 12 12M12 4 10.9 5.1M5.1 10.9 4 12" />
      </svg>
    );
  }
  if (name === 'pencil') {
    return (
      <svg {...common}>
        <path d="M10.2 2.8 13.2 5.8 6 13H3v-3z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M3.2 8.2 6.4 11.4 12.8 4.6" />
    </svg>
  );
}

export function HabitMark({ habit, onClick, pressed, bare = false }) {
  const icon = iconForHabit(habit);
  const glyph = <HabitGlyph name={icon} />;
  if (bare) return glyph;
  const color = colorForHabit(habit);
  const className = `habit-badge tone-${color}`;
  if (onClick) {
    return (
      <button
        type="button"
        className={className}
        aria-label={`Icon for ${habit.name}`}
        aria-expanded={pressed}
        onClick={onClick}
      >
        {glyph}
      </button>
    );
  }
  return (
    <span className={className} aria-hidden="true">
      {glyph}
    </span>
  );
}
