import { useEffect, useMemo, useState } from 'react';
import { useData } from '../context/DataProvider';
import {
  addDays,
  formatLong,
  relativeDay,
  startOfWeek,
  todayISO,
  WEEKDAY_INITIALS,
} from '../lib/dates';
import { describeCadence, findTrainingHabit, fractionOf, isComplete, targetOf, valueOf } from '../lib/habits';
import { atRiskToday, countInWeek, currentStreak, isDue, isPerfectDay } from '../lib/streaks';
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
        const perfect = !future && isPerfectDay(habits, doneSets, day);
        const dueCount = habits.filter((h) => isDue(h, day) && h.cadence !== 'per_week').length;
        const doneCount = habits.filter((h) => doneSets.get(h.id)?.has(day)).length;
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
  const atRisk = day === calendarToday && atRiskToday(habit, keptSet, day);
  const isEditing = editing === habit.id;
  const needsEntry = habit.kind === 'amount' || habit.kind === 'measure';
  const dayLabel = relativeDay(day, calendarToday);

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
    if (needsEntry) setEditing(isEditing ? null : habit.id);
    else if (habit.kind === 'count') bumpDay(habit, day);
    else toggleDay(habit, day);
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

  return (
    <li className={`row ${complete ? 'is-complete' : ''} ${atRisk ? 'is-at-risk' : ''}`}>
      {atRisk && <p className="row__warn">Don’t miss twice</p>}
      <div className="row__main">
        <HabitMark
          habit={habit}
          fraction={fractionOf(habit, log)}
          complete={complete}
          due
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
          </span>
        </button>

        {streak > 0 && (
          <span className="row__streak" title={`${streak} in a row`}>
            <b>{streak}</b>
            <span className="row__streak-unit">
              {habit.cadence === 'per_week'
                ? streak === 1
                  ? 'wk'
                  : 'wks'
                : streak === 1
                  ? 'day'
                  : 'days'}
            </span>
          </span>
        )}
      </div>

      {isEditing && (
        <AmountEntry
          habit={habit}
          value={value}
          suggestion={lastReading}
          onSave={(n) => {
            setValue(habit, day, n);
            setEditing(null);
          }}
          onClear={() => {
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
  const calendarToday = todayISO();
  const [day, setDay] = useState(calendarToday);
  const training = findTrainingHabit(activeHabits);
  const habits = activeHabits.filter((habit) => habit.id !== training?.id);

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
      const risk = (h) =>
        viewingToday && atRiskToday(h, keptSetFor(h.id), day) ? 0 : 1;
      return risk(a) - risk(b);
    });
  const restToday = habits.filter((h) => !isDue(h, day));

  const doneCount = dueToday.filter((h) => doneSets.get(h.id)?.has(day)).length;
  const allDone = dueToday.length > 0 && doneCount === dueToday.length;
  const perfectStreak = usePerfectStreak(habits, doneSets, day);
  const [celebrate, dismissCelebrate] = usePerfectCelebration(viewingToday && allDone);

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

  return (
    <div className={`view ${allDone ? 'view--perfect' : ''}`}>
      <header className="view__head">
        <div className="day-nav">
          <button
            type="button"
            className="day-nav__btn"
            onClick={goPrev}
            aria-label="Previous day"
          >
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
        <h1 className="view__title">
          {allDone ? (
            <>
              A <em>perfect</em> day
            </>
          ) : (
            <>
              {doneCount} of {dueToday.length} done
            </>
          )}
        </h1>
        {allDone && <PerfectDaySeal streak={perfectStreak} />}
      </header>

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
            </div>
          ) : (
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
          )}

          {restToday.length > 0 && (
            <section className="rest">
              <h2 className="eyebrow">Not scheduled {viewingToday ? 'today' : 'this day'}</h2>
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
            </section>
          )}

          <DayNote day={day} />
        </div>
      </div>

      {celebrate && <PerfectDayOverlay streak={perfectStreak} onDone={dismissCelebrate} />}
    </div>
  );
}
