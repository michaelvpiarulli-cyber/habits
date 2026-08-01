import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { perfectDayStreak } from '../lib/streaks';

/**
 * The moment every due habit lands. Blue and pink overprint to violet — the
 * only way the app produces that colour — so a perfect day feels like a press
 * run that finally registered both inks.
 *
 * Fires on the false → true transition, not on every revisit, so opening the
 * app later still feels calm. The seal under the title stays as the quiet
 * reminder to come stamp tomorrow.
 */

const MOTIONS = [
  { x: -38, y: -52, rot: -18, ink: 'blue', delay: 0 },
  { x: 42, y: -44, rot: 14, ink: 'pink', delay: 40 },
  { x: -48, y: 28, rot: 22, ink: 'pink', delay: 80 },
  { x: 52, y: 36, rot: -12, ink: 'blue', delay: 110 },
  { x: -12, y: -68, rot: 8, ink: 'violet', delay: 140 },
  { x: 18, y: 62, rot: -24, ink: 'violet', delay: 170 },
  { x: -62, y: -8, rot: 16, ink: 'blue', delay: 200 },
  { x: 64, y: -16, rot: -8, ink: 'pink', delay: 230 },
];

export function PerfectDayOverlay({ streak, onDone }) {
  const titleId = useId();
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    try {
      navigator.vibrate?.(28);
    } catch {
      /* ignore */
    }
    const t = window.setTimeout(onDone, 4200);
    return () => window.clearTimeout(t);
  }, [onDone]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onDone();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDone]);

  const line =
    streak >= 3
      ? `${streak} perfect days pressed in a row.`
      : streak === 2
        ? 'Two perfect days. The plate is warm.'
        : 'Both inks. Full registration.';

  return (
    <div
      className="perfect-burst"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onDone}
    >
      <div className="perfect-burst__stage" aria-hidden="true">
        {MOTIONS.map((m, i) => (
          <span
            key={i}
            className={`perfect-burst__fleck perfect-burst__fleck--${m.ink}`}
            style={{
              '--x': `${m.x}vw`,
              '--y': `${m.y}vh`,
              '--rot': `${m.rot}deg`,
              '--delay': `${m.delay}ms`,
            }}
          />
        ))}
      </div>

      <div className="perfect-burst__card" onClick={(e) => e.stopPropagation()}>
        <p className="perfect-burst__eyebrow">Day closed</p>
        <h2 id={titleId} className="perfect-burst__title">
          Perfect
        </h2>
        <p className="perfect-burst__line">{line}</p>
        <p className="perfect-burst__next">
          Tomorrow is blank paper.
          <br />
          Come ink it.
        </p>
        <button ref={closeRef} type="button" className="perfect-burst__btn" onClick={onDone}>
          See you tomorrow
        </button>
      </div>
    </div>
  );
}

/** Quiet seal under the title once the day is locked in. */
export function PerfectDaySeal({ streak }) {
  return (
    <div className="perfect-seal" aria-live="polite">
      <div className="perfect-seal__mark" aria-hidden="true">
        <span className="perfect-seal__ink perfect-seal__ink--blue" />
        <span className="perfect-seal__ink perfect-seal__ink--pink" />
        <span className="perfect-seal__word">OK</span>
      </div>
      <div className="perfect-seal__copy">
        <p className="perfect-seal__title">Press complete</p>
        <p className="perfect-seal__body">
          {streak > 1 ? `${streak} days of violet in a row. ` : ''}
          Tomorrow is waiting — make it want the same stamp.
        </p>
      </div>
    </div>
  );
}

/** Watches allDone and fires the overlay exactly once per completion moment. */
export function usePerfectCelebration(allDone) {
  const prev = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (prev.current === false && allDone === true) setOpen(true);
    prev.current = allDone;
  }, [allDone]);

  const dismiss = useRef(() => setOpen(false)).current;
  return [open, dismiss];
}

export function usePerfectStreak(habits, doneSets, day) {
  return useMemo(() => perfectDayStreak(habits, doneSets, day), [habits, doneSets, day]);
}
