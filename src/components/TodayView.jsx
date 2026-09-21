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
import { groupByCourse } from '../lib/menu';
import { nextTreat } from '../lib/rewards';
import { atRiskToday, bestStreak, countInWeek, countPerfectDays, currentStreak, isDue, isPerfectDay } from '../lib/streaks';
import { HabitMark } from './HabitMark';
import { AmountEntry } from './AmountEntry';
import { DayNote } from './DayNote';
import { Countdown } from './Countdown';
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

function TreatChip({ closed }) {
  const next = nextTreat(closed);
  if (closed === 0) return null;
  if (!next) {
    return (
      <span className="streak-chip streak-chip--treat">
        <b>{closed}</b> closed
      </span>
    );
  }
  return (
    <span className="streak-chip streak-chip--treat">
      <b>{closed}</b> of {next.at} to {next.name}
    </span>
  );
}

function StreakChips({ items, perfectStreak, closed, onJump }) {
  if (items.length === 0 && perfectStreak < 2 && closed === 0) return null;

  return (
    <ul className="streak-chips" aria-label="Running streaks">
      {closed > 0 && (
        <li>
          <TreatChip closed={closed} />
        </li>
      )}
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
function HabitRow({
  habit,
  day,
  calendarToday,
  editing,
  setEditing,
  nextUp = false,
  variant = 'full',
}) {
  const compact = variant === 'menu';
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
    if (compact && habit.kind === 'amount') {
      if (!complete) {
        feelTap('close');
        setValue(habit, day, targetOf(habit));
      } else {
        feelTap('undo');
        setValue(habit, day, 0);
      }
      return;
    }
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

  // Amount habits: the circle hits the target in one tap. The name still opens
  // the keypad when you need a different number.
  const activateMark = () => {
    if (habit.kind === 'amount' && !complete) {
      feelTap('close');
      setValue(habit, day, targetOf(habit));
      return;
    }
    activate();
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
      className={`row ${compact ? 'row--menu' : ''} ${complete ? 'is-complete' : ''} ${atRisk ? 'is-at-risk' : ''} ${inking ? 'is-inking' : ''} ${nextUp ? 'is-up-next' : ''}`}
    >
      {atRisk && !compact && <p className="row__warn">Don’t miss twice</p>}
      <div className="row__main">
        <HabitMark
          habit={habit}
          fraction={fractionOf(habit, log)}
          complete={complete}
          due
          size={compact ? 'sm' : 'md'}
          inking={inking}
          onActivate={activateMark}
          label={
            habit.kind === 'amount' && !complete
              ? `Mark ${habit.name} done at ${targetOf(habit)} ${habit.unit || ''}`.trim()
              : needsEntry
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
          {!compact && (
            <>
              <span className="row__status">
                {status}
                {habit.cue && <span className="row__cue"> · {habit.cue}</span>}
                {nearBest && <span className="row__cue"> · {best - streak} from best</span>}
              </span>
              <ChainTrail habit={habit} doneSet={keptSet} day={day} />
            </>
          )}
        </button>

        {!compact && streak > 0 && (
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

function headlineFor({ habits, dueToday, allDone, doneCount, leftCount, viewingToday }) {
  if (habits.length === 0) return 'Let’s start';
  if (dueToday.length === 0) return 'Off day';
  if (allDone) {
    return (
      <>
        A <em>perfect</em> day
      </>
    );
  }
  if (doneCount === 0 && viewingToday) {
    const hour = new Date().getHours();
    if (hour < 12) return 'Let’s go';
    if (hour < 17) return 'Keep going';
    return 'Finish the day';
  }
  if (doneCount === 0) return 'Let’s go';
  return `${leftCount} left`;
}

export function TodayView({ onOpen }) {
  const { activeHabits, doneSets, keptSetFor } = useData();
  const [editing, setEditing] = useState(null);
  const [showRest, setShowRest] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [openCourse, setOpenCourse] = useState(null);
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
  const closedCount = useMemo(
    () => countPerfectDays(habits, doneSets, day),
    [habits, doneSets, day]
  );
  const [celebrate, dismissCelebrate, treat] = usePerfectCelebration(
    viewingToday && allDone,
    closedCount
  );

  const hotStreaks = habits
    .map((habit) => ({
      habit,
      streak: currentStreak(habit, keptSetFor(habit.id), day),
      unit: habit.cadence === 'per_week' ? 'wks' : 'days',
    }))
    .filter((item) => item.streak > 0)
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 4);

  const stillOpen = dueToday.filter((h) => !doneSets.get(h.id)?.has(day));
  const alreadyDone = dueToday.filter((h) => doneSets.get(h.id)?.has(day));
  const courses = groupByCourse(dueToday);
  const upNextId = groupByCourse(stillOpen)[0]?.habits[0]?.id;
  const focused = openCourse ? courses.find((c) => c.id === openCourse) : null;
  const focusedOpen = focused
    ? focused.habits.filter((h) => stillOpen.some((open) => open.id === h.id))
    : [];
  const focusedDone = focused
    ? focused.habits.filter((h) => alreadyDone.some((done) => done.id === h.id))
    : [];

  const openPlate = (id) => {
    setEditing(null);
    setOpenCourse(id);
    const course = courses.find((c) => c.id === id);
    const left = course
      ? course.habits.filter((h) => stillOpen.some((open) => open.id === h.id)).length
      : 0;
    setShowDone(left === 0);
  };

  const closePlate = () => {
    setEditing(null);
    setOpenCourse(null);
  };

  const jumpTo = (id) => {
    const inDone = alreadyDone.some((h) => h.id === id);
    if (inDone) setShowDone(true);
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
  }, [pendingJump, showRest, showDone, openCourse]);

  useEffect(() => {
    setOpenCourse(null);
    setShowDone(false);
  }, [day]);

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

  const headline = headlineFor({
    habits,
    dueToday,
    allDone,
    doneCount,
    leftCount,
    viewingToday,
  });

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
          </>
        )}
        {allDone && <PerfectDaySeal streak={perfectStreak} />}
        {viewingToday && <Countdown compact />}
      </header>

      <StreakChips items={hotStreaks} perfectStreak={perfectStreak} closed={closedCount} onJump={jumpTo} />

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
              <p className="empty__title">Nothing to tap yet.</p>
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
              focused ? (
                <section className="menu-focus">
                  <button
                    type="button"
                    className="menu-focus__back"
                    onClick={closePlate}
                  >
                    ‹ Menu
                  </button>
                  <header className="menu-focus__head">
                    <h2 className="menu-focus__title">{focused.name}</h2>
                    <p className="menu-focus__count">{focusedOpen.length} left</p>
                  </header>
                  {focusedOpen.length > 0 && (
                    <ul className="rows">
                      {focusedOpen.map((h) => (
                        <HabitRow
                          key={h.id}
                          habit={h}
                          day={day}
                          calendarToday={calendarToday}
                          editing={editing}
                          setEditing={setEditing}
                          nextUp={h.id === upNextId && stillOpen.length > 1}
                        />
                      ))}
                    </ul>
                  )}
                  {focusedDone.length > 0 && focusedOpen.length === 0 && (
                    <ul className="rows">
                      {focusedDone.map((h) => (
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
                  {focusedDone.length > 0 && focusedOpen.length > 0 && (
                    <section className="rest">
                      <button
                        type="button"
                        className="rest__toggle"
                        aria-expanded={showDone}
                        onClick={() => setShowDone((open) => !open)}
                      >
                        <span className="eyebrow">Done</span>
                        <span className="rest__count">{focusedDone.length}</span>
                      </button>
                      {showDone && (
                        <ul className="rows rows--muted">
                          {focusedDone.map((h) => (
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
                </section>
              ) : (
                <div className="menu" aria-label="Today’s menu">
                  {courses.map((course) => {
                    const left = course.habits.filter((h) =>
                      stillOpen.some((open) => open.id === h.id)
                    ).length;
                    const closed = left === 0;
                    const editingHere = course.habits.some((h) => h.id === editing);
                    return (
                      <section
                        key={course.id}
                        className={`menu-card ${closed ? 'is-closed' : ''} ${editingHere ? 'is-editing' : ''}`}
                      >
                        <button
                          type="button"
                          className="menu-card__head"
                          onClick={() => openPlate(course.id)}
                          aria-label={`${course.name}, ${left} left`}
                        >
                          <span className="menu-card__name">{course.name}</span>
                          <span className="menu-card__count">{left}</span>
                          <span className="menu-card__chevron" aria-hidden="true">
                            ›
                          </span>
                        </button>
                        <ul className="rows rows--menu">
                          {course.habits.map((h) => (
                            <HabitRow
                              key={h.id}
                              habit={h}
                              day={day}
                              calendarToday={calendarToday}
                              editing={editing}
                              setEditing={setEditing}
                              nextUp={h.id === upNextId && stillOpen.length > 1}
                              variant="menu"
                            />
                          ))}
                        </ul>
                      </section>
                    );
                  })}
                </div>
              )
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
          {habits.length > 0 && onOpen && (
            <button type="button" className="text-btn today__add" onClick={() => onOpen('more', 'habits')}>
              Add a habit
            </button>
          )}
        </div>
      </div>

      {celebrate && (
        <PerfectDayOverlay streak={perfectStreak} treat={treat} onDone={dismissCelebrate} />
      )}
    </div>
  );
}
