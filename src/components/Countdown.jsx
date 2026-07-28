import { useData } from '../context/DataProvider';
import { daysBetween, parseISO, todayISO, WEEKDAY_LABELS, dow, formatShort } from '../lib/dates';

/**
 * The date the habits are pointed at.
 *
 * Days, not weeks or months, and never a decimal: a countdown is only useful
 * if the number moves every morning. Weeks would sit still for six days at a
 * time, which is exactly when it stops being worth glancing at.
 */
export function Countdown() {
  const { countdown } = useData();
  if (!countdown?.date) return null;

  const today = todayISO();
  const days = daysBetween(today, countdown.date);
  const target = parseISO(countdown.date);
  const year = target.getFullYear();

  // Past dates keep counting rather than vanishing — the streak you built
  // toward something is still worth seeing after the day arrives.
  const past = days < 0;
  const isToday = days === 0;

  return (
    <div className={`countdown ${isToday ? 'is-today' : ''} ${past ? 'is-past' : ''}`}>
      <span className="countdown__figure">
        <b>{Math.abs(days)}</b>
        <span className="countdown__unit">{Math.abs(days) === 1 ? 'day' : 'days'}</span>
      </span>

      <span className="countdown__meta">
        <span className="countdown__verb">
          {isToday ? 'That’s today' : past ? 'since' : 'to go until'}
        </span>
        <span className="countdown__date">
          {countdown.label ? `${countdown.label} · ` : ''}
          {WEEKDAY_LABELS[dow(countdown.date)]} {formatShort(countdown.date)} {year}
        </span>
      </span>
    </div>
  );
}
