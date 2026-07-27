import { targetOf } from '../lib/habits';

/**
 * The square you tap. Ink fills left to right as the day fills up, so a
 * half-done day looks half-done rather than reading as a plain empty box.
 *
 * The fill sits a hair off its outline on purpose — misregistration, the
 * small misalignment of two plates on a real risograph. It is the one place
 * the print metaphor is literal.
 */
export function HabitMark({ habit, fraction, complete, due, onActivate, label, size = 'md' }) {
  const segments = habit.kind === 'count' ? targetOf(habit) : 1;

  const className = [
    'mark',
    `mark--${size}`,
    complete && 'is-complete',
    !complete && fraction > 0 && 'is-partial',
    !complete && due && 'is-due',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={className} onClick={onActivate} aria-label={label}>
      <span className="mark__fill" style={{ '--fill': `${Math.round(fraction * 100)}%` }} />
      {segments > 1 && (
        <span className="mark__segments" aria-hidden="true">
          {Array.from({ length: segments - 1 }, (_, i) => (
            <i key={i} style={{ left: `${((i + 1) / segments) * 100}%` }} />
          ))}
        </span>
      )}
      {complete && (
        <svg className="mark__tick" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12.5 10 17.5 19 7" fill="none" stroke="currentColor" strokeWidth="3.2" />
        </svg>
      )}
    </button>
  );
}
