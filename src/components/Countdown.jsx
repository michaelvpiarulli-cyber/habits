import { useData } from '../context/DataProvider';
import { daysBetween, parseISO, todayISO, WEEKDAY_LABELS, dow, formatShort } from '../lib/dates';
import { gestation, serveToday, trimesterOf, weekInfo } from '../lib/pregnancy';

/**
 * The date the habits are pointed at.
 *
 * Days, not weeks or months, and never a decimal: a countdown is only useful
 * if the number moves every morning. Weeks would sit still for six days at a
 * time, which is exactly when it stops being worth glancing at.
 *
 * A pregnancy countdown gets the extra reading — weeks elapsed rather than days
 * left — because that is the number said out loud and the one an appointment
 * will use.
 */
export function Countdown() {
  const { countdown } = useData();
  if (!countdown?.date) return null;

  const today = todayISO();
  const days = daysBetween(today, countdown.date);
  const target = parseISO(countdown.date);
  const year = target.getFullYear();

  // Past dates keep counting rather than vanishing — the day it arrives it
  // quietly becomes a counter for how long it has been.
  const past = days < 0;
  const isToday = days === 0;

  const g = countdown.kind === 'pregnancy' ? gestation(countdown.date, today) : null;
  const showWeeks = g && !g.overdue && g.weeks >= 3;
  const info = showWeeks ? weekInfo(g.weeks) : null;
  const trimester = showWeeks ? trimesterOf(g.weeks) : null;
  const serve = showWeeks ? serveToday(g.weeks, g.extraDays, today) : { tip: null };

  return (
    <div className={`countdown ${isToday ? 'is-today' : ''} ${past ? 'is-past' : ''}`}>
      <div className="countdown__row">
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

      {showWeeks && (
        <div className="preg">
          <p className="preg__week">
            Week {g.weeks}
            {g.extraDays > 0 && <span className="preg__days"> + {g.extraDays}d</span>}
            <span className="preg__tri"> · {trimester.label}</span>
          </p>
          <p className="preg__size">About the size of {info.size}.</p>
          <p className="preg__note">{info.note}</p>

          {serve.tip && (
            <div className="serve">
              <p className="eyebrow">{serve.weekly ? 'Serve her — new week' : 'Serve her today'}</p>
              <p className="serve__tip">{serve.tip}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
