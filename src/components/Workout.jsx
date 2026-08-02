import { useEffect, useMemo, useState } from 'react';
import { useData } from '../context/DataProvider';
import { dow } from '../lib/dates';
import {
  PROGRAM_DISCLAIMER,
  formatLoad,
  prescribeNext,
  sessionFor,
  weekAhead,
} from '../lib/workouts';

/**
 * Today's session on the daily tab.
 *
 * Completion still rides the Lift count habit: tapping a movement sets that
 * count to its position in the list. Progressive overload is separate — each
 * lift can log load × sets × reps, and the next target is prescribed from the
 * last log (reps-first at the barbell / dumbbell ceilings).
 *
 * Collapsed to the session name until tapped, because on a Monday you mostly
 * need to know it is push day, not to read twelve sets on the way past.
 *
 * Below the collapsible today block, a compact look-ahead lists the rest of
 * the week (or next week on Sunday) from the same weekday program — readable
 * without changing the date or opening today's lifts.
 */
function draftFrom(target, todayLog) {
  const loadKind = todayLog?.loadKind || target.loadKind;
  const loadLb =
    todayLog?.loadLb != null
      ? todayLog.loadLb
      : target.loadLb;
  return {
    loadLb:
      loadKind === 'bodyweight' || loadKind === 'cardio' || loadLb == null
        ? ''
        : String(loadLb),
    sets: String(todayLog?.sets ?? target.setCount ?? ''),
    reps: String(todayLog?.reps ?? target.reps ?? ''),
  };
}

function LiftRow({ lift, index, day, isDone, onMark, canMark }) {
  const { liftLogFor, lastLiftLog, saveLiftLog } = useData();
  const todayLog = liftLogFor(day, lift.move);
  const prior = lastLiftLog(lift.move, day);
  const target = useMemo(() => prescribeNext(lift, prior), [lift, prior]);
  const loggable = lift.loadKind !== 'cardio';

  const [draft, setDraft] = useState(() => draftFrom(target, todayLog));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const formHasFocus = document.activeElement?.closest(`[data-lift-log="${lift.move}"]`);
    if (!formHasFocus) {
      setDraft(draftFrom(target, todayLog));
      setSaved(false);
    }
  }, [target, todayLog, lift.move]);

  const submit = (event) => {
    event.preventDefault();
    if (!loggable) return;
    saveLiftLog(day, {
      move: lift.move,
      loadKind: lift.loadKind,
      loadLb: draft.loadLb === '' ? null : Number(draft.loadLb),
      sets: Number(draft.sets),
      reps: Number(draft.reps),
    });
    setSaved(true);
  };

  const markDone = () => {
    onMark(index);
    // First completion with no log yet: record the prescribed target so the
    // next session has something to progress from.
    if (!isDone && loggable && !todayLog && target.setCount && target.reps) {
      saveLiftLog(day, {
        move: lift.move,
        loadKind: lift.loadKind,
        loadLb: target.loadLb,
        sets: target.setCount,
        reps: target.reps,
      });
    }
  };

  const setsLine = loggable
    ? `${target.sets}${target.load ? ` · ${target.load}` : ''}`
    : `${lift.sets}${lift.load ? ` · ${lift.load}` : ''}`;

  return (
    <li className={`lift ${isDone ? 'is-done' : ''}${todayLog ? ' has-log' : ''}`}>
      <button
        type="button"
        className="lift__body"
        onClick={markDone}
        disabled={!canMark}
        aria-pressed={isDone}
      >
        <span className="lift__tick" aria-hidden="true">
          {isDone ? '✓' : index + 1}
        </span>
        <span className="lift__detail">
          <span className="lift__move">{lift.move}</span>
          <span className="lift__sets">
            {setsLine}
            {target.source === 'progress' ? ' ↑' : ''}
          </span>
          {prior && loggable && (
            <span className="lift__last">
              Last {prior.sets} × {prior.reps}
              {prior.loadLb != null ? ` · ${formatLoad(prior.loadKind, prior.loadLb)}` : ''}
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
          <label className="lift__log-field">
            <span>Load</span>
            <span className="lift__log-control">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="5"
                value={draft.loadLb}
                placeholder={lift.loadKind === 'bodyweight' ? '—' : '0'}
                disabled={lift.loadKind === 'bodyweight'}
                onChange={(event) => {
                  setDraft((current) => ({ ...current, loadLb: event.target.value }));
                  setSaved(false);
                }}
              />
              <span>lb</span>
            </span>
          </label>
          <label className="lift__log-field">
            <span>Sets</span>
            <span className="lift__log-control">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={draft.sets}
                placeholder="0"
                onChange={(event) => {
                  setDraft((current) => ({ ...current, sets: event.target.value }));
                  setSaved(false);
                }}
              />
            </span>
          </label>
          <label className="lift__log-field">
            <span>Reps</span>
            <span className="lift__log-control">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={draft.reps}
                placeholder="0"
                onChange={(event) => {
                  setDraft((current) => ({ ...current, reps: event.target.value }));
                  setSaved(false);
                }}
              />
            </span>
          </label>
          <button type="submit" className="btn btn--primary lift__log-save">
            {saved ? 'Saved' : todayLog ? 'Update' : 'Log'}
          </button>
        </form>
      )}
    </li>
  );
}

export function Workout({ day }) {
  const { activeHabits, logFor, setValue } = useData();
  const session = sessionFor(dow(day));
  const ahead = weekAhead(day);

  // The count habit this session drives, if there is one.
  const lift = activeHabits.find((h) => h.kind === 'count' && /lift/i.test(h.name));
  const done = lift ? Number(logFor(lift.id, day)?.amount) || 0 : 0;

  const [open, setOpen] = useState(session.kind === 'lift');

  const mark = (index) => {
    if (!lift) return;
    // Tapping the movement you just finished sets the count to its position;
    // tapping the last completed one again steps back.
    setValue(lift, day, done === index + 1 ? index : index + 1);
  };

  return (
    <section className={`workout workout--${session.kind}`}>
      <button type="button" className="workout__head" onClick={() => setOpen((o) => !o)}>
        <span>
          <span className="eyebrow">Today’s training</span>
          <span className="workout__name">{session.name}</span>
          <span className="workout__focus">{session.focus}</span>
        </span>
        <span className="workout__toggle" aria-hidden="true">
          {open ? '−' : '+'}
        </span>
      </button>

      {open && (
        <>
          <ol className="workout__lifts">
            {session.lifts.map((l, i) => (
              <LiftRow
                key={l.move}
                lift={l}
                index={i}
                day={day}
                isDone={i < done}
                onMark={mark}
                canMark={!!lift}
              />
            ))}
          </ol>
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
