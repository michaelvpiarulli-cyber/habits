import { useEffect, useMemo, useState } from 'react';
import { useData } from '../context/DataProvider';
import { dow, relativeDay, todayISO } from '../lib/dates';
import { findTrainingHabit } from '../lib/habits';
import {
  PROGRAM_DISCLAIMER,
  formatLoad,
  parseSets,
  prescribeNext,
  sessionFor,
  weekAhead,
} from '../lib/workouts';

/**
 * Today's session. On the Lift tab it is always open; elsewhere it can fold.
 *
 * Completion still rides the Lift count habit. Each lift also logs weight ×
 * reps per set so next week's target can move when you top the rep range.
 */

function emptySetRow(loadLb = '') {
  return { loadLb: loadLb == null ? '' : String(loadLb), reps: '' };
}

function rowsFrom(target, todayLog) {
  const count = Math.max(
    1,
    Number(todayLog?.sets) || Number(target.setCount) || parseSets(target.sets)?.setCount || 3
  );
  const priorEntries = Array.isArray(todayLog?.setEntries) ? todayLog.setEntries : null;
  if (priorEntries?.length) {
    return priorEntries.map((entry) => ({
      loadLb:
        entry.loadLb == null || target.loadKind === 'bodyweight' ? '' : String(entry.loadLb),
      reps: entry.reps == null ? '' : String(entry.reps),
    }));
  }

  const loadDefault =
    target.loadKind === 'bodyweight' || target.loadKind === 'cardio' || target.loadLb == null
      ? ''
      : String(todayLog?.loadLb ?? target.loadLb);
  const repDefault = todayLog?.reps != null ? String(todayLog.reps) : '';

  return Array.from({ length: count }, () => ({
    loadLb: loadDefault,
    reps: repDefault,
  }));
}

function LiftRow({ lift, index, day, isDone, onMark, canMark }) {
  const { liftLogFor, lastLiftLog, saveLiftLog } = useData();
  const todayLog = liftLogFor(day, lift.move);
  const prior = lastLiftLog(lift.move, day);
  const target = useMemo(() => prescribeNext(lift, prior), [lift, prior]);
  const loggable = lift.loadKind !== 'cardio';

  const [rows, setRows] = useState(() => rowsFrom(target, todayLog));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const formHasFocus = document.activeElement?.closest(`[data-lift-log="${lift.move}"]`);
    if (!formHasFocus) {
      setRows(rowsFrom(target, todayLog));
      setSaved(false);
    }
  }, [target, todayLog, lift.move]);

  const updateRow = (rowIndex, patch) => {
    setRows((current) =>
      current.map((row, i) => (i === rowIndex ? { ...row, ...patch } : row))
    );
    setSaved(false);
  };

  const persist = (nextRows) => {
    if (!loggable) return;
    const setEntries = nextRows
      .map((row) => ({
        loadLb:
          lift.loadKind === 'bodyweight' || row.loadLb === ''
            ? null
            : Math.max(0, Number(row.loadLb) || 0),
        reps: Math.max(0, Number(row.reps) || 0),
      }))
      .filter((entry) => entry.reps > 0);

    if (setEntries.length === 0) {
      saveLiftLog(day, {
        move: lift.move,
        loadKind: lift.loadKind,
        loadLb: null,
        sets: 0,
        reps: 0,
        setEntries: [],
      });
      return;
    }

    const loads = setEntries.map((entry) => entry.loadLb).filter((n) => n != null);
    const loadLb = loads.length ? Math.max(...loads) : null;
    const reps = Math.min(...setEntries.map((entry) => entry.reps));

    saveLiftLog(day, {
      move: lift.move,
      loadKind: lift.loadKind,
      loadLb,
      sets: setEntries.length,
      reps,
      setEntries,
    });
    setSaved(true);
  };

  const submit = (event) => {
    event.preventDefault();
    persist(rows);
  };

  const markDone = () => {
    onMark(index);
    // First completion with no log yet: seed every set with the prescribed target.
    if (!isDone && loggable && !todayLog && target.setCount && target.reps) {
      const seeded = Array.from({ length: target.setCount }, () => ({
        loadLb: target.loadLb,
        reps: target.reps,
      }));
      saveLiftLog(day, {
        move: lift.move,
        loadKind: lift.loadKind,
        loadLb: target.loadLb,
        sets: target.setCount,
        reps: target.reps,
        setEntries: seeded,
      });
      setRows(
        seeded.map((entry) => ({
          loadLb: entry.loadLb == null ? '' : String(entry.loadLb),
          reps: String(entry.reps),
        }))
      );
    }
  };

  const setsLine = loggable
    ? `${target.sets}${target.load ? ` · ${target.load}` : ''}`
    : `${lift.sets}${lift.load ? ` · ${lift.load}` : ''}`;

  const label = isDone ? `Mark ${lift.move} not done` : `Mark ${lift.move} done`;

  return (
    <li className={`lift ${isDone ? 'is-done' : ''}${todayLog ? ' has-log' : ''}`}>
      <button
        type="button"
        className="lift__body"
        onClick={markDone}
        disabled={!canMark}
        aria-pressed={isDone}
        aria-label={label}
      >
        <span className={`lift__check ${isDone ? 'is-on' : ''}`} aria-hidden="true">
          {isDone ? '✓' : ''}
        </span>
        <span className="lift__detail">
          <span className="lift__move">{lift.move}</span>
          <span className="lift__sets">
            {setsLine}
            {target.source === 'progress' ? ' ↑' : ''}
          </span>
          {prior && loggable && (
            <span className="lift__last">
              Last{' '}
              {Array.isArray(prior.setEntries) && prior.setEntries.length
                ? prior.setEntries
                    .map(
                      (entry) =>
                        `${entry.loadLb != null ? `${entry.loadLb}×` : ''}${entry.reps}`
                    )
                    .join(', ')
                : `${prior.sets} × ${prior.reps}${
                    prior.loadLb != null ? ` · ${formatLoad(prior.loadKind, prior.loadLb)}` : ''
                  }`}
            </span>
          )}
          {target.cue && <span className="lift__cue">{target.cue}</span>}
          {lift.note && <span className="lift__hint">{lift.note}</span>}
        </span>
      </button>

      {loggable && (
        <form
          className="lift__log"
          data-lift-log={lift.move}
          onSubmit={submit}
          onClick={(event) => event.stopPropagation()}
        >
          <p className="lift__log-label">Weight × reps per set</p>
          <ul className="lift__sets-log">
            {rows.map((row, rowIndex) => (
              <li key={rowIndex} className="lift__set-row">
                <span className="lift__set-n">Set {rowIndex + 1}</span>
                <label className="lift__log-field">
                  <span className="visually-hidden">Weight</span>
                  <span className="lift__log-control">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="5"
                      value={row.loadLb}
                      placeholder={lift.loadKind === 'bodyweight' ? 'BW' : 'lb'}
                      disabled={lift.loadKind === 'bodyweight'}
                      onChange={(event) => updateRow(rowIndex, { loadLb: event.target.value })}
                    />
                    <span>lb</span>
                  </span>
                </label>
                <span className="lift__set-x" aria-hidden="true">
                  ×
                </span>
                <label className="lift__log-field">
                  <span className="visually-hidden">Reps</span>
                  <span className="lift__log-control">
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      step="1"
                      value={row.reps}
                      placeholder="reps"
                      onChange={(event) => updateRow(rowIndex, { reps: event.target.value })}
                    />
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="lift__log-actions">
            <button
              type="button"
              className="btn"
              onClick={() => {
                setRows((current) => [
                  ...current,
                  emptySetRow(current[current.length - 1]?.loadLb || ''),
                ]);
                setSaved(false);
              }}
            >
              Add set
            </button>
            <button type="submit" className="btn btn--primary lift__log-save">
              {saved ? 'Saved' : todayLog ? 'Update' : 'Save sets'}
            </button>
          </div>
        </form>
      )}
    </li>
  );
}

export function Workout({ day, layout = 'card' }) {
  const page = layout === 'page';
  const { activeHabits, logFor, setValue, updateHabit, addHabit } = useData();
  const session = sessionFor(dow(day));
  const ahead = weekAhead(day);
  const total = session.lifts.length;

  const lift = useMemo(() => findTrainingHabit(activeHabits), [activeHabits]);
  const done = lift ? Number(logFor(lift.id, day)?.amount) || 0 : 0;
  const complete = total > 0 && done >= total;
  const fraction = total ? Math.min(1, done / total) : 0;

  const [open, setOpen] = useState(() => page || !complete);

  // Keep the Lift habit target equal to today's session size so checking off
  // every move (or Mark session done) actually completes the habit. Starter
  // target used to stay at 2 while Push/Pull/Legs have 4 moves.
  useEffect(() => {
    if (!lift || total <= 0 || Number(lift.target) === total) return;
    updateHabit(lift.id, { target: total, unit: lift.unit || 'lifts', kind: 'count' });
  }, [lift, total, updateHabit]);

  const ensureLiftHabit = () => {
    if (lift) return lift;
    return addHabit({
      name: 'Lift',
      emoji: '\u{1F3CB}',
      kind: 'count',
      target: total || 4,
      unit: 'lifts',
      cadence: 'daily',
    });
  };

  const mark = (index) => {
    const habit = ensureLiftHabit();
    if (!habit) return;
    const current = Number(logFor(habit.id, day)?.amount) || 0;
    setValue(habit, day, current === index + 1 ? index : index + 1);
  };

  const markAll = () => {
    const habit = ensureLiftHabit();
    if (!habit || complete) return;
    setValue(habit, day, total);
  };

  const summary = !lift
    ? `Tap a lift to start tracking · ${session.focus}`
    : complete
      ? 'Session done'
      : done > 0
        ? `${done} of ${total} done`
        : `Tap each lift when you finish · ${total} moves`;

  const dayLabel = relativeDay(day, todayISO());
  const trainingLabel =
    dayLabel === 'today' ? 'Today’s training' : dayLabel === 'yesterday' ? 'Yesterday’s training' : 'Training';

  return (
    <section
      className={`workout workout--${session.kind} ${complete ? 'is-complete' : ''} ${page ? 'workout--page' : ''}`}
    >
      {!page && (
        <button
          type="button"
          className="workout__head"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          <span>
            <span className="eyebrow">{trainingLabel}</span>
            <span className="workout__name">{session.name}</span>
            <span className="workout__focus">{summary}</span>
          </span>
          <span className="workout__meta" aria-hidden="true">
            {lift && total > 0 && (
              <span className="workout__fill" style={{ '--fill': `${Math.round(fraction * 100)}%` }} />
            )}
            <span className="workout__toggle">{open ? '−' : '+'}</span>
          </span>
        </button>
      )}

      {(page || open) && (
        <>
          <p className="workout__hint">
            Check off each move when you finish
            {session.kind === 'lift' ? ', then save weight × reps for every set' : ''}.
          </p>

          <ol className="workout__lifts">
            {session.lifts.map((l, i) => (
              <LiftRow
                key={l.move}
                lift={l}
                index={i}
                day={day}
                isDone={i < done}
                onMark={mark}
                canMark
              />
            ))}
          </ol>

          {!complete && (
            <div className="workout__actions">
              <button type="button" className="btn" onClick={markAll}>
                Mark session done
              </button>
            </div>
          )}

          <p className="workout__disclaimer">{PROGRAM_DISCLAIMER}</p>
        </>
      )}

      <div className="workout__ahead">
        <p className="eyebrow">{ahead.label}</p>
        <ol className="workout__ahead-list" aria-label={ahead.label}>
          {ahead.days.map(({ day: d, weekday, session: s }) => (
            <li key={d} className={`workout__ahead-day workout__ahead-day--${s.kind}`}>
              <span className="workout__ahead-when">{weekday}</span>
              <span className="workout__ahead-what">
                <span className="workout__ahead-name">{s.name}</span>
                <span className="workout__ahead-focus">{s.focus}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
