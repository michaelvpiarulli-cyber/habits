import { useCallback, useEffect, useRef, useState } from 'react';
import { useData } from '../context/DataProvider';
import { useLife } from '../context/LifeProvider';
import { WEEKDAY_INITIALS, addDays, formatLong, startOfWeek } from '../lib/dates';
import { FOOD_GOALS, foodVsGoals, ingestedFoodForDay, preferFoodEntry } from '../lib/foodGoals';
import { isComplete } from '../lib/habits';
import { compareByPriority, groupTasks, living, priorityLabel } from '../lib/life';
import { workoutsOnDay } from '../lib/program';
import { formatStepCount, isStepsHabit, stepsOnDay } from '../lib/steps';
import { currentStreak, isDue } from '../lib/streaks';
import { greetingForHour, laParts, TV_REFRESH_MS } from '../lib/tvClock';
import { nextTvTarget } from '../lib/tvFocus';
import { readViewDay, searchForViewDay } from '../lib/viewDay';
import { HabitMark } from './HabitMark';
import { useProgram } from './hooks';
import './tv.css';

function formatCount(value) {
  return Math.round(Number(value) || 0).toLocaleString('en-US');
}

function useLaClock() {
  const [parts, setParts] = useState(() => laParts(new Date()));
  useEffect(() => {
    const tick = () => setParts(laParts(new Date()));
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return parts;
}

function useTvDay(laToday) {
  const [day, setDay] = useState(() => readViewDay(window.location.search, laToday));

  useEffect(() => {
    const sync = () => setDay(readViewDay(window.location.search, laToday));
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, [laToday]);

  const go = useCallback((next) => {
    const search = searchForViewDay(window.location.search, next, laToday);
    const url = `${window.location.pathname}${search}${window.location.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (url !== current) window.history.pushState(null, '', url);
    setDay(readViewDay(search || '', laToday));
  }, [laToday]);

  return { day, today: laToday, go };
}

function CoreMark() {
  return (
    <div className="tv-mark" aria-hidden="true">
      <svg viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="52" />
        <circle cx="60" cy="60" r="36" />
        <circle cx="60" cy="60" r="18" />
        <circle className="tv-mark-hot" cx="60" cy="60" r="7" />
      </svg>
    </div>
  );
}

export default function TvScreen() {
  const clock = useLaClock();
  const { day, today, go } = useTvDay(clock.iso);
  const data = useData();
  const life = useLife();
  const program = useProgram();
  const { activeHabits, nutritionFor, logFor, doneSets, toggleDay, bumpDay, dataReady, syncNow: syncHabits } = data;
  const syncLife = life.syncNow;
  const ready = dataReady && life.dataReady;
  const [idle, setIdle] = useState(false);
  const [full, setFull] = useState(false);
  const idleRef = useRef(false);
  const swallowRef = useRef(false);
  const woke = useRef(false);

  useEffect(() => {
    const previousTitle = document.title;
    const manifest = document.querySelector('link[rel="manifest"]');
    const previousManifest = manifest?.getAttribute('href') || '';
    document.title = 'Tally TV';
    document.documentElement.classList.add('is-tv');
    if (manifest) manifest.setAttribute('href', '/tv.webmanifest');
    return () => {
      document.title = previousTitle;
      document.documentElement.classList.remove('is-tv');
      if (manifest && previousManifest) manifest.setAttribute('href', previousManifest);
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      syncHabits();
      syncLife();
    }, TV_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [syncHabits, syncLife]);

  useEffect(() => {
    const onFull = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFull);
    return () => document.removeEventListener('fullscreenchange', onFull);
  }, []);

  const wake = useCallback(() => {
    idleRef.current = false;
    setIdle(false);
    window.clearTimeout(wake.timer);
    wake.timer = window.setTimeout(() => {
      idleRef.current = true;
      setIdle(true);
    }, 120000);
  }, []);

  useEffect(() => {
    wake();
    const arm = () => {
      if (idleRef.current) return;
      wake();
    };
    window.addEventListener('pointerdown', arm);
    window.addEventListener('wheel', arm);
    return () => {
      window.clearTimeout(wake.timer);
      window.removeEventListener('pointerdown', arm);
      window.removeEventListener('wheel', arm);
    };
  }, [wake]);

  useEffect(() => {
    const nodesOf = () => [...document.querySelectorAll('[data-tv]')].filter((el) => !el.disabled);
    const onKeyDown = (event) => {
      if (idleRef.current) {
        swallowRef.current = true;
        event.preventDefault();
        event.stopPropagation();
        wake();
        return;
      }
      const dir = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }[event.key];
      if (!dir) return;
      const nodes = nodesOf();
      if (nodes.length === 0) return;
      event.preventDefault();
      if (!nodes.includes(document.activeElement)) {
        nodes[0].focus();
        return;
      }
      const items = nodes.map((el) => {
        const rect = el.getBoundingClientRect();
        return { id: el, left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
      });
      const next = nextTvTarget(items, document.activeElement, dir);
      if (next && next.focus) next.focus();
    };
    const onKeyUp = (event) => {
      if (!swallowRef.current) return;
      swallowRef.current = false;
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
    };
  }, [wake]);

  useEffect(() => {
    if (!ready || woke.current) return;
    woke.current = true;
    document.querySelector('[data-tv]')?.focus();
  }, [ready]);

  const viewingToday = day === today;
  const due = activeHabits.filter((habit) => isDue(habit, day));
  const ingested = ingestedFoodForDay(life.dailyNutrition, day);
  const food = preferFoodEntry(ingested, nutritionFor(day));
  const score = foodVsGoals(food, FOOD_GOALS);
  const calorieGap = score.calorieGoal - score.calories;
  const calorieLine = calorieGap >= 0 ? `${formatCount(calorieGap)} left` : `${formatCount(-calorieGap)} over`;
  const meter = Math.max(0, Math.min(100, score.calorieRatio * 100));
  const session = workoutsOnDay(program.workouts, day);
  const workoutLog = (life.workoutLogs || []).find((row) => row.day === day) || null;
  const sessionName = session.length ? session.map((workout) => workout.name).join(', ') : 'Rest day';
  const workoutOpen = session.length > 0 || workoutLog;
  const openTasks = groupTasks(life.tasks, today);
  const topTasks = [...openTasks.overdue, ...openTasks.dueToday].sort(compareByPriority).slice(0, 3);
  const datedTasks = living(life.tasks)
    .filter((task) => task.dueDate === day && !task.done)
    .sort(compareByPriority)
    .slice(0, 3);
  const shownTasks = viewingToday ? topTasks : datedTasks;
  const habitsDone = due.filter((habit) => isComplete(habit, logFor(habit.id, day))).length;
  const streaks = due.map((habit) => currentStreak(habit, doneSets.get(habit.id) || new Set(), today));
  const bestStreak = streaks.reduce((best, value) => Math.max(best, value), 0);
  const weekStart = startOfWeek(day);
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const greeting = greetingForHour(clock.hour);

  const markWorkout = () => {
    const planId = session[0]?.id || workoutLog?.planId || '';
    life.setWorkoutDone(day, planId, !workoutLog?.done);
  };

  const markHabit = (habit) => {
    if (habit.kind === 'count') bumpDay(habit, day);
    else toggleDay(habit, day);
  };

  const fillScreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
      return;
    }
    document.documentElement.requestFullscreen?.();
  };

  if (!ready) return <div className="tv-boot">Loading the deck.</div>;

  if (idle) {
    return (
      <button type="button" className="tv-idle" data-tv onClick={wake}>
        <CoreMark />
        <p className="tv-greet">{greeting}</p>
        <p className="tv-clock">{clock.clock}</p>
        <p className="tv-date">{formatLong(clock.iso)} {clock.iso.slice(0, 4)}</p>
      </button>
    );
  }

  return (
    <main className="tv-deck">
      <header className="tv-head">
        <div className="tv-id">
          <CoreMark />
          <div>
            <h1 className="tv-greet">{greeting}</h1>
            <p className="tv-date">
              {viewingToday ? `${formatLong(day)} ${day.slice(0, 4)}` : `Viewing ${formatLong(day)} ${day.slice(0, 4)}`}
            </p>
          </div>
        </div>
        <div className="tv-clock-block">
          <p className="tv-clock">{clock.clock}</p>
          <p className="tv-zone">Los Angeles</p>
        </div>
        <div className="tv-nav">
          <button type="button" data-tv onClick={() => go(addDays(day, -1))}>Earlier</button>
          <button type="button" data-tv disabled={viewingToday} onClick={() => go(addDays(day, 1))}>Later</button>
          <button type="button" data-tv disabled={viewingToday} onClick={() => go(today)}>Today</button>
          <button type="button" data-tv onClick={fillScreen}>{full ? 'Exit full screen' : 'Fill screen'}</button>
        </div>
      </header>

      <div className="tv-body">
        <div className="tv-col">
          <section className="tv-card tv-calories" aria-label="Calories">
            <h2>Calories</h2>
            <p className="tv-figure">{calorieLine}</p>
            <p className="tv-sub">of {formatCount(FOOD_GOALS.calories)} · {formatCount(score.calories)} eaten</p>
            <div className="tv-meter" aria-hidden="true"><span style={{ width: `${meter}%` }} /></div>
          </section>

          <section className="tv-card" aria-label="Workout">
            <h2>Workout</h2>
            {workoutOpen ? (
              <button
                type="button"
                className={`tv-workout${workoutLog?.done ? ' is-done' : ''}`}
                data-tv
                aria-pressed={Boolean(workoutLog?.done)}
                onClick={markWorkout}
              >
                <span className="tv-figure tv-figure-sm">{sessionName}</span>
                <span className="tv-sub">{workoutLog?.done ? 'Done' : 'Open'}</span>
              </button>
            ) : (
              <p className="tv-figure tv-figure-sm">Rest day.</p>
            )}
          </section>

          <section className="tv-card" aria-label="Tasks">
            <h2>Tasks</h2>
            {shownTasks.length === 0 ? <p className="tv-sub">Nothing due.</p> : (
              <ul className="tv-tasks">
                {shownTasks.map((task) => (
                  <li key={task.id}>
                    <span>{task.title}</span>
                    <small>{task.dueDate && task.dueDate < today ? 'Overdue' : priorityLabel(task.priority)}</small>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section className="tv-card tv-habits" aria-label="Habits">
          <div className="tv-habits-head">
            <h2>Habits</h2>
            <p className="tv-sub">{habitsDone} of {due.length}{bestStreak > 0 ? ` · ${bestStreak} day streak` : ''}</p>
          </div>
          {due.length === 0 ? <p className="tv-sub">Nothing due.</p> : (
            <ul>
              {due.map((habit) => {
                const complete = isComplete(habit, logFor(habit.id, day));
                const steps = isStepsHabit(habit) ? stepsOnDay(life.dailySteps, day) : null;
                const streak = currentStreak(habit, doneSets.get(habit.id) || new Set(), today);
                const toggle = habit.kind === 'check' || habit.kind === 'count';
                const detail = [
                  streak > 0 ? `${streak} day streak` : '',
                  steps == null ? '' : `${formatStepCount(steps)} steps`,
                ].filter(Boolean).join(' · ');
                const body = (
                  <>
                    <HabitMark habit={habit} />
                    <span className="tv-habit-copy">
                      <span className="tv-habit-name">{habit.name}</span>
                      {detail ? <span className="tv-sub">{detail}</span> : null}
                    </span>
                    <span className="tv-check" aria-hidden="true" />
                  </>
                );
                return (
                  <li key={habit.id}>
                    {toggle ? (
                      <button
                        type="button"
                        className={`tv-habit${complete ? ' is-done' : ''}`}
                        data-tv
                        aria-pressed={complete}
                        aria-label={`${habit.name}. ${complete ? 'Done' : 'Open'}`}
                        onClick={() => markHabit(habit)}
                      >
                        {body}
                      </button>
                    ) : (
                      <div className={`tv-habit${complete ? ' is-done' : ''}`}>{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section className="tv-card tv-week" aria-label="Week">
        <h2>Week</h2>
        <div className="tv-week-row">
          {weekDays.map((item, index) => {
            const dueCount = activeHabits.filter((habit) => isDue(habit, item)).length;
            const doneCount = activeHabits.filter((habit) => isDue(habit, item) && isComplete(habit, logFor(habit.id, item))).length;
            const clear = dueCount > 0 && doneCount === dueCount;
            return (
              <button
                key={item}
                type="button"
                data-tv
                className={`tv-day${item === day ? ' is-on' : ''}${clear ? ' is-clear' : ''}`}
                disabled={item > today}
                aria-label={formatLong(item)}
                onClick={() => go(item)}
              >
                <span>{WEEKDAY_INITIALS[index]}</span>
                <i />
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
