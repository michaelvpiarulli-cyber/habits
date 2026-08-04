import { useMemo, useState } from 'react';
import { useData } from '../context/DataProvider';
import { addDays, formatLong, startOfWeek, todayISO, WEEKDAY_INITIALS } from '../lib/dates';
import { describeCadence, fractionOf, isComplete, targetOf, valueOf } from '../lib/habits';
import { atRiskToday, countInWeek, currentStreak, isDue, isPerfectDay } from '../lib/streaks';
import { HabitMark } from './HabitMark';
import { AmountEntry } from './AmountEntry';
import { Countdown } from './Countdown';
import { DayNote } from './DayNote';
import { Workout } from './Workout';
import { NutritionTracker } from './NutritionTracker';
import { PastDayEditor } from './PastDayEditor';
import {
  PerfectDayOverlay,
  PerfectDaySeal,
  usePerfectCelebration,
  usePerfectStreak,
} from './PerfectDay';

/** The strip of this week across the top. Violet means every habit landed. */
function WeekStrip({ habits, doneSets, today, onSelectDay }) {
  const monday = startOfWeek(today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  return (
    <ol className="strip" aria-label="This week">
      {days.map((day, i) => {
        const future = day > today;
        const perfect = !future && isPerfectDay(habits, doneSets, day);
        const dueCount = habits.filter((h) => isDue(h, day) && h.cadence !== 'per_week').length;
        const doneCount = habits.filter((h) => doneSets.get(h.id)?.has(day)).length;
        const some = !perfect && doneCount > 0;

        const cls = [
          'strip__day',
          day === today && 'is-today',
          future && 'is-future',
          perfect && 'is-perfect',
          some && 'is-some',
        ]
          .filter(Boolean)
          .join(' ');

        const content = (
          <>
            <span className="strip__initial" aria-hidden="true">
              {WEEKDAY_INITIALS[i]}
            </span>
            <span className="strip__box">
              <span
                className="strip__ink"
                style={{ '--fill': dueCount ? `${Math.round((doneCount / dueCount) * 100)}%` : '0%' }}
              />
            </span>
            <span className="visually-hidden">
              {day}: {doneCount} of {dueCount} done{perfect ? ', a perfect day' : ''}
            </span>
          </>
        );

        return (
          <li key={day} className={cls}>
            {day < today ? (
              <button
                type="button"
                className="strip__button"
                onClick={() => onSelectDay(day)}
                aria-label={`Edit habits for ${formatLong(day)}`}
              >
                {content}
              </button>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** One habit, one day. The mark on the left is the whole interaction for most kinds. */
function HabitRow({ habit, day, editing, setEditing }) {
  const { logFor, doneSetFor, keptSetFor, toggleDay, bumpDay, setValue, valueFor } = useData();

  const log = logFor(habit.id, day);
  const value = valueOf(habit, log);
  const complete = isComplete(habit, log);
  const doneSet = doneSetFor(habit.id);
  // The chain is measured on floor days, not only full ones.
  const keptSet = keptSetFor(habit.id);
  const streak = currentStreak(habit, keptSet, day);
  const atRisk = atRiskToday(habit, keptSet, day);
  const isEditing = editing === habit.id;
  const needsEntry = habit.kind === 'amount' || habit.kind === 'measure';

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
    status = value > 0 ? `${value} of ${targetOf(habit)} ${habit.unit}`.trim() : `Target ${targetOf(habit)} ${habit.unit}`.trim();
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
                ? `Clear ${habit.name} for today`
                : `Mark ${habit.name} done`
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

export function TodayView() {
  const { activeHabits, doneSets, statementOfDay, keptSetFor } = useData();
  const [editing, setEditing] = useState(null);
  const [editingDay, setEditingDay] = useState(null);
  const today = todayISO();
  const yesterday = addDays(today, -1);

  // A habit one miss from breaking its chain goes to the top — the whole point
  // of the rule is that the second miss is the one that matters, so it has to
  // be the thing you see first.
  const dueToday = activeHabits
    .filter((h) => isDue(h, today))
    .sort((a, b) => {
      const risk = (h) => (atRiskToday(h, keptSetFor(h.id), today) ? 0 : 1);
      return risk(a) - risk(b);
    });
  const restToday = activeHabits.filter((h) => !isDue(h, today));

  const doneCount = dueToday.filter((h) => doneSets.get(h.id)?.has(today)).length;
  const allDone = dueToday.length > 0 && doneCount === dueToday.length;
  const perfectStreak = usePerfectStreak(activeHabits, doneSets, today);
  const [celebrate, dismissCelebrate] = usePerfectCelebration(allDone);

  return (
    <div className={`view ${allDone ? 'view--perfect' : ''}`}>
      <header className="view__head">
        <p className="eyebrow">{formatLong(today)}</p>
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
        <button type="button" className="btn today__backfill" onClick={() => setEditingDay(yesterday)}>
          ← Edit yesterday
        </button>
        {allDone && <PerfectDaySeal streak={perfectStreak} />}
      </header>

      {/*
        Two zones: what you act on, and what you read. On a phone they stack
        in reading order; on a wide screen the context moves into a rail so the
        habits stay a comfortable column instead of stretching to the window.
      */}
      <div className="today">
        <aside className="today__rail">
          <WeekStrip
            habits={activeHabits}
            doneSets={doneSets}
            today={today}
            onSelectDay={setEditingDay}
          />
          <Countdown />
          {statementOfDay && (
            <div className="today-statement">
              <p className="eyebrow">Today’s value</p>
              <p className="today-statement__name">{statementOfDay.name}</p>
              {statementOfDay.note && <p className="today-statement__note">{statementOfDay.note}</p>}
          {statementOfDay.verseText && (
            <blockquote className="verse verse--today">
              <p className="verse__text">{statementOfDay.verseText}</p>
              {statementOfDay.verseRef && <cite className="verse__ref">{statementOfDay.verseRef}</cite>}
            </blockquote>
          )}
            </div>
          )}
        </aside>

        <div className="today__main">
          <Workout day={today} />
          <NutritionTracker day={today} />

          {activeHabits.length === 0 ? (
            <div className="empty">
              <p className="empty__title">No habits yet.</p>
              <p className="empty__body">
                Add one on the Habits tab and it shows up here every day it’s due.
              </p>
            </div>
          ) : (
            <ul className="rows">
              {dueToday.map((h) => (
                <HabitRow key={h.id} habit={h} day={today} editing={editing} setEditing={setEditing} />
              ))}
            </ul>
          )}

          {restToday.length > 0 && (
            <section className="rest">
              <h2 className="eyebrow">Not scheduled today</h2>
              <ul className="rows rows--muted">
                {restToday.map((h) => (
                  <HabitRow key={h.id} habit={h} day={today} editing={editing} setEditing={setEditing} />
                ))}
              </ul>
            </section>
          )}

          <DayNote day={today} />
        </div>
      </div>

      {celebrate && <PerfectDayOverlay streak={perfectStreak} onDone={dismissCelebrate} />}
      {editingDay && (
        <PastDayEditor day={editingDay} onClose={() => setEditingDay(null)} />
      )}
    </div>
  );
}
