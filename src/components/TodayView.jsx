import { useEffect, useMemo, useRef, useState } from 'react';
import { useData } from '../context/DataProvider';
import {
  addDays,
  formatLong,
  relativeDay,
  startOfWeek,
  todayISO,
  WEEKDAY_INITIALS,
} from '../lib/dates';
import { describeCadence, fractionOf, isComplete, targetOf, valueOf } from '../lib/habits';
import { feelTap } from '../lib/haptic';
import { atRiskToday, bestStreak, countInWeek, currentStreak, isDue, isPerfectDay } from '../lib/streaks';
import { HabitMark } from './HabitMark';
import { AmountEntry } from './AmountEntry';
import { DayNote } from './DayNote';
import {
  PerfectDayOverlay,
  PerfectDaySeal,
  usePerfectCelebration,
  usePerfectStreak,
} from './PerfectDay';

/** The strip of the week being viewed. Tap a day to open it. */
function WeekStrip({ habits, doneSets, calendarToday, selected, onSelect }) {
  const monday = startOfWeek(selected);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  return (
    <ol className="strip" aria-label="Week">
      {days.map((day, i) => {
        const future = day > calendarToday;
        const dueCount = habits.filter((h) => isDue(h, day) && h.cadence !== 'per_week').length;
        const doneCount = habits.filter((h) => doneSets.get(h.id)?.has(day)).length;
        const perfect = !future && isPerfectDay(habits, doneSets, day);
        const some = !perfect && doneCount > 0;
        const isSelected = day === selected;

        const cls = [
          'strip__day',
          day === calendarToday && 'is-today',
          isSelected && 'is-selected',
          future && 'is-future',
          perfect && 'is-perfect',
          some && 'is-some',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <li key={day} className={cls}>
            <button
              type="button"
              className="strip__btn"
              disabled={future}
              aria-current={isSelected ? 'date' : undefined}
              aria-label={`${formatLong(day)}${future ? ' (upcoming)' : ''}`}
              onClick={() => onSelect(day)}
            >
              <span className="strip__initial" aria-hidden="true">
                {WEEKDAY_INITIALS[i]}
              </span>
              <span className="strip__box">
                <span
                  className="strip__ink"
                  style={{
                    '--fill': dueCount ? `${Math.round((doneCount / dueCount) * 100)}%` : '0%',
                  }}
                />
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/** Last seven calendar days, so the chain is visible without reading a number. */
function ChainTrail({ habit, doneSet, day }) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(day, i - 6)), [day]);

  return (
    <ol className="trail" aria-hidden="true">
      {days.map((d) => {
        const due = isDue(habit, d);
        const done = doneSet.has(d);
        const cls = ['trail__dot', !due && 'is-off', due && done && 'is-done', due && !done && 'is-empty']
          .filter(Boolean)
          .join(' ');
        return <li key={d} className={cls} />;
      })}
    </ol>
  );
}

function DayMeter({ done, total }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div
      className="day-meter"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-label={`${done} of ${total} habits done`}
    >
      <span className="day-meter__fill" style={{ '--fill': `${pct}%` }} />
    </div>
  );
}

function StreakChips({ items, perfectStreak, onJump }) {
  if (items.length === 0 && perfectStreak < 2) return null;

  return (
    <ul className="streak-chips" aria-label="Running streaks">
      {perfectStreak >= 2 && (
        <li>
          <span className="streak-chip streak-chip--perfect">
            <b>{perfectStreak}</b> perfect
          </span>
        </li>
      )}
      {items.map(({ habit, streak, unit }) => (
        <li key={habit.id}>
          <button type="button" className="streak-chip" onClick={() => onJump(habit.id)}>
            <b>{streak}</b> {habit.name} {unit}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** One habit, one day. The mark on the left is the whole interaction for most kinds. */
function HabitRow({ habit, day, calendarToday, editing, setEditing }) {
  const { logFor, doneSetFor, keptSetFor, toggleDay, bumpDay, setValue, valueFor } = useData();

  const log = logFor(habit.id, day);
  const value = valueOf(habit, log);
  const complete = isComplete(habit, log);
  const doneSet = doneSetFor(habit.id);
  // The chain is measured on floor days, not only full ones.
  const keptSet = keptSetFor(habit.id);
  const streak = currentStreak(habit, keptSet, day);
  const best = bestStreak(habit, keptSet, day);
  const atRisk = day === calendarToday && atRiskToday(habit, keptSet, day);
  const isEditing = editing === habit.id;
  const needsEntry = habit.kind === 'amount' || habit.kind === 'measure';
  const dayLabel = relativeDay(day, calendarToday);
  const nearBest = streak > 0 && best > streak && best - streak <= 3;
  const [inking, setInking] = useState(false);
  const wasComplete = useRef(complete);
  const inkTimer = useRef(0);

  useEffect(() => {
    if (!wasComplete.current && complete) {
      setInking(true);
      window.clearTimeout(inkTimer.current);
      inkTimer.current = window.setTimeout(() => setInking(false), 420);
    }
    wasComplete.current = complete;
    return () => window.clearTimeout(inkTimer.current);
  }, [complete]);

  // Weight barely moves overnight, so the entry field opens on the last reading.
  const lastReading = useMemo(() => {
    if (habit.kind !== 'measure') return null;
    for (let i = 1; i <= 30; i++) {
      const v = valueFor(habit, addDays(day, -i));
      if (v > 0) return v;
    }
    return null;
  }, [habit, day, valueFor]);

  const activate = () => {
    if (needsEntry) {
      setEditing(isEditing ? null : habit.id);
      return;
    }
    if (habit.kind === 'count') {
      const next = value + 1;
      feelTap(next >= targetOf(habit) && !complete ? 'close' : 'tick');
      bumpDay(habit, day);
      return;
    }
    feelTap(complete ? 'undo' : 'close');
    toggleDay(habit, day);
  };

  let status;
  if (habit.kind === 'count') {
    status = `${value} of ${targetOf(habit)}${habit.unit ? ` ${habit.unit}` : ''}`;
  } else if (habit.kind === 'amount') {
    status =
      value > 0
        ? `${value} of ${targetOf(habit)} ${habit.unit}`.trim()
        : `Target ${targetOf(habit)} ${habit.unit}`.trim();
  } else if (habit.kind === 'measure') {
    status = value > 0 ? `${value} ${habit.unit}`.trim() : 'Not recorded yet';
  } else {
    const weekly =
      habit.cadence === 'per_week'
        ? `${countInWeek(doneSet, startOfWeek(day))} of ${habit.perWeek} this week`
        : describeCadence(habit);
    status = weekly;
  }

  const unit =
    habit.cadence === 'per_week' ? (streak === 1 ? 'wk' : 'wks') : streak === 1 ? 'day' : 'days';

  return (
    <li
      id={`habit-${habit.id}`}
      className={`row ${complete ? 'is-complete' : ''} ${atRisk ? 'is-at-risk' : ''} ${inking ? 'is-inking' : ''}`}
    >
      {atRisk && <p className="row__warn">Don’t miss twice</p>}
      <div className="row__main">
        <HabitMark
          habit={habit}
          fraction={fractionOf(habit, log)}
          complete={complete}
          due
          inking={inking}
          onActivate={activate}
          label={
            needsEntry
              ? `Record ${habit.name}`
              : complete
                ? `Clear ${habit.name} for ${dayLabel}`
                : `Mark ${habit.name} done for ${dayLabel}`
          }
        />

        <button type="button" className="row__body" onClick={activate}>
          <span className="row__name">
            {habit.emoji && <span aria-hidden="true">{habit.emoji} </span>}
            {habit.name}
          </span>
          <span className="row__status">
            {status}
            {habit.cue && <span className="row__cue"> · {habit.cue}</span>}
            {nearBest && <span className="row__cue"> · {best - streak} from best</span>}
          </span>
          <ChainTrail habit={habit} doneSet={keptSet} day={day} />
        </button>

        {streak > 0 && (
          <span className={`row__streak ${inking ? 'is-pop' : ''}`} title={`${streak} in a row`}>
            <b>{streak}</b>
            <span className="row__streak-unit">{unit}</span>
          </span>
        )}
      </div>

      {isEditing && (
        <AmountEntry
          habit={habit}
          value={value}
          suggestion={lastReading}
          onSave={(n) => {
            const nextComplete = isComplete(habit, { amount: n, deleted: false });
            feelTap(nextComplete && !complete ? 'close' : 'tick');
            setValue(habit, day, n);
            setEditing(null);
          }}
          onClear={() => {
            feelTap('undo');
            setValue(habit, day, 0);
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      )}
    </li>
  );
}

export function TodayView({ onOpen }) {
  const { activeHabits, doneSets, keptSetFor } = useData();
  const [editing, setEditing] = useState(null);
  const [showRest, setShowRest] = useState(false);
  const [pendingJump, setPendingJump] = useState(null);
  const calendarToday = todayISO();
  const [day, setDay] = useState(calendarToday);
  const habits = activeHabits;

  // Never leave the picker on a future date if the calendar rolls over.
  useEffect(() => {
    setDay((current) => (current > calendarToday ? calendarToday : current));
  }, [calendarToday]);

  const viewingToday = day === calendarToday;
  const canGoForward = day < calendarToday;

  // A habit one miss from breaking its chain goes to the top — the whole point
  // of the rule is that the second miss is the one that matters, so it has to
  // be the thing you see first.
  const dueToday = habits
    .filter((h) => isDue(h, day))
    .sort((a, b) => {
      const risk = (h) => (viewingToday && atRiskToday(h, keptSetFor(h.id), day) ? 0 : 1);
      return risk(a) - risk(b);
    });
  const restToday = habits.filter((h) => !isDue(h, day));

  const doneCount = dueToday.filter((h) => doneSets.get(h.id)?.has(day)).length;
  const leftCount = Math.max(0, dueToday.length - doneCount);
  const allDone = dueToday.length > 0 && doneCount === dueToday.length;
  const perfectStreak = usePerfectStreak(habits, doneSets, day);
  const [celebrate, dismissCelebrate] = usePerfectCelebration(viewingToday && allDone);

  const hotStreaks = habits
    .map((habit) => ({
      habit,
      streak: currentStreak(habit, keptSetFor(habit.id), day),
      unit: habit.cadence === 'per_week' ? 'wks' : 'days',
    }))
    .filter((item) => item.streak > 0)
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 4);

  const jumpTo = (id) => {
    const el = document.getElementById(`habit-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setShowRest(true);
    setPendingJump(id);
  };

  useEffect(() => {
    if (!pendingJump) return;
    const el = document.getElementById(`habit-${pendingJump}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setPendingJump(null);
  }, [pendingJump, showRest]);

  const goPrev = () => {
    setEditing(null);
    setDay((d) => addDays(d, -1));
  };
  const goNext = () => {
    if (!canGoForward) return;
    setEditing(null);
    setDay((d) => addDays(d, 1));
  };
  const selectDay = (next) => {
    if (next > calendarToday) return;
    setEditing(null);
    setDay(next);
  };

  let headline;
  if (habits.length === 0) headline = 'Start a chain';
  else if (dueToday.length === 0) headline = 'Rest day';
  else if (allDone)
    headline = (
      <>
        A <em>perfect</em> day
      </>
    );
  else if (doneCount === 0) headline = 'Close the day';
  else headline = `${leftCount} left`;

  return (
    <div className={`view ${allDone ? 'view--perfect' : ''}`}>
      <header className="view__head">
        <div className="day-nav">
          <button type="button" className="day-nav__btn" onClick={goPrev} aria-label="Previous day">
            ‹
          </button>
          <div className="day-nav__center">
            <p className="eyebrow">{formatLong(day)}</p>
            {!viewingToday && (
              <button type="button" className="day-nav__today" onClick={() => selectDay(calendarToday)}>
                Back to today
              </button>
            )}
          </div>
          <button
            type="button"
            className="day-nav__btn"
            onClick={goNext}
            disabled={!canGoForward}
            aria-label="Next day"
          >
            ›
          </button>
        </div>
        <h1 className="view__title">{headline}</h1>
        {dueToday.length > 0 && (
          <>
            <DayMeter done={doneCount} total={dueToday.length} />
            <p className="day-meter__copy">
              {allDone
                ? 'Every mark landed.'
                : `${doneCount} of ${dueToday.length} inked`}
            </p>
          </>
        )}
        {allDone && <PerfectDaySeal streak={perfectStreak} />}
      </header>

      <StreakChips items={hotStreaks} perfectStreak={perfectStreak} onJump={jumpTo} />

      <div className="today">
        <aside className="today__rail">
          <WeekStrip
            habits={habits}
            doneSets={doneSets}
            calendarToday={calendarToday}
            selected={day}
            onSelect={selectDay}
          />
        </aside>

        <div className="today__main">
          {habits.length === 0 ? (
            <div className="empty">
              <p className="empty__title">No habits yet.</p>
              <p className="empty__body">
                Add one under More → Habits and it shows up here every day it’s due.
              </p>
              {onOpen && (
                <button type="button" className="text-btn" onClick={() => onOpen('more', 'habits')}>
                  Add a habit
                </button>
              )}
            </div>
          ) : (
            dueToday.length > 0 && (
              <ul className="rows">
                {dueToday.map((h) => (
                  <HabitRow
                    key={h.id}
                    habit={h}
                    day={day}
                    calendarToday={calendarToday}
                    editing={editing}
                    setEditing={setEditing}
                  />
                ))}
              </ul>
            )
          )}

          {restToday.length > 0 && (
            <section className="rest">
              <button
                type="button"
                className="rest__toggle"
                aria-expanded={showRest}
                onClick={() => setShowRest((open) => !open)}
              >
                <span className="eyebrow">
                  Not scheduled {viewingToday ? 'today' : 'this day'}
                </span>
                <span className="rest__count">{restToday.length}</span>
              </button>
              {showRest && (
                <ul className="rows rows--muted">
                  {restToday.map((h) => (
                    <HabitRow
                      key={h.id}
                      habit={h}
                      day={day}
                      calendarToday={calendarToday}
                      editing={editing}
                      setEditing={setEditing}
                    />
                  ))}
                </ul>
              )}
            </section>
          )}

          <DayNote day={day} />
        </div>
      </div>

      {celebrate && <PerfectDayOverlay streak={perfectStreak} onDone={dismissCelebrate} />}
    </div>
  );
}
