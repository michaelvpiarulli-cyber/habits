import { useEffect, useState } from 'react';
import { useData } from '../context/DataProvider';
import { useGoogle } from '../context/GoogleProvider';
import { useLife } from '../context/LifeProvider';
import { agendaForDay } from '../lib/agenda';
import { formatLong, todayISO } from '../lib/dates';
import { FOOD_GOALS, foodVsGoals, preferFoodEntry } from '../lib/foodGoals';
import { GOOGLE_CALENDAR_ACCOUNT } from '../lib/google';
import { fractionOf, isComplete, targetOf, valueOf } from '../lib/habits';
import { isDue } from '../lib/streaks';
import { recentWatches } from '../lib/watchLog';
import { nextWorkout, todayWorkout, workoutDoneOn } from '../lib/workouts';
import { AmountEntry } from './AmountEntry';
import { HabitMark } from './HabitMark';
import { WorkoutBlock } from './WorkoutBlock';

function meterWidth(ratio) {
  return `${Math.max(0, Math.min(100, Math.round(ratio * 100)))}%`;
}

function DashboardHabitRow({ habit, day }) {
  const { logFor, toggleDay, bumpDay, setValue } = useData();
  const [editing, setEditing] = useState(false);
  const log = logFor(habit.id, day);
  const value = valueOf(habit, log);
  const complete = isComplete(habit, log);
  const needsEntry = habit.kind === 'amount' || habit.kind === 'measure';

  const activate = () => {
    if (needsEntry) {
      setEditing(true);
      return;
    }
    if (habit.kind === 'count') bumpDay(habit, day);
    else toggleDay(habit, day);
  };

  let status = complete ? 'Done' : 'Not yet';
  if (habit.kind === 'count') {
    status = `${value} of ${targetOf(habit)} ${habit.unit || ''}`.trim();
  } else if (habit.kind === 'amount' || habit.kind === 'measure') {
    status =
      value > 0
        ? `${value}${habit.unit ? ` ${habit.unit}` : ''}`
        : `Target ${targetOf(habit)}${habit.unit ? ` ${habit.unit}` : ''}`;
  }

  return (
    <li className={`row ${complete ? 'is-complete' : ''}`}>
      <div className="row__main">
        <HabitMark
          habit={habit}
          fraction={fractionOf(habit, log)}
          complete={complete}
          due
          size="md"
          onActivate={activate}
          label={complete ? `Clear ${habit.name}` : `Mark ${habit.name}`}
        />
        <button type="button" className="row__body" onClick={activate}>
          <span className="row__name">
            {habit.emoji ? <span aria-hidden="true">{habit.emoji} </span> : null}
            {habit.name}
          </span>
          <span className="row__status">{status}</span>
        </button>
      </div>
      {editing && (
        <AmountEntry
          habit={habit}
          value={value}
          onSave={(next) => {
            setValue(habit, day, next);
            setEditing(false);
          }}
          onClear={() => {
            setValue(habit, day, 0);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      )}
    </li>
  );
}

function FoodMeters({ entry }) {
  const stats = foodVsGoals(entry);
  return (
    <div className="os-meters">
      <div>
        <p className="os-card__meta">
          {Math.round(stats.calories)} / {FOOD_GOALS.calories} kcal
        </p>
        <div className="meter" aria-hidden="true">
          <span style={{ width: meterWidth(stats.calorieRatio) }} />
        </div>
      </div>
      <div>
        <p className="os-card__meta">
          {Math.round(stats.protein)} / {FOOD_GOALS.protein} g protein
        </p>
        <div className="meter" aria-hidden="true">
          <span style={{ width: meterWidth(stats.proteinRatio) }} />
        </div>
      </div>
    </div>
  );
}

export function DashboardView({ onOpen }) {
  const today = todayISO();
  const { activeHabits, nutritionFor } = useData();
  const { dailyNutrition, workoutLogs, watches, events, setWorkoutDone } = useLife();
  const { connected, listEvents, connect, accountEmail } = useGoogle();
  const [googleEvents, setGoogleEvents] = useState([]);
  const [googleNote, setGoogleNote] = useState('');

  const due = activeHabits.filter((habit) => isDue(habit, today));
  const ingested = dailyNutrition.find((row) => row.day === today) || null;
  const food = preferFoodEntry(ingested, nutritionFor(today));
  const todayPlan = todayWorkout(today);
  const upcoming = nextWorkout(today);
  const todayDone = Boolean(workoutDoneOn(workoutLogs, today));
  const nextDone = upcoming ? Boolean(workoutDoneOn(workoutLogs, upcoming.day)) : false;
  const recent = recentWatches(watches, 5);
  const agenda = agendaForDay(events, googleEvents, today);
  const wrongAccount =
    connected && accountEmail && accountEmail.toLowerCase() !== GOOGLE_CALENDAR_ACCOUNT;

  useEffect(() => {
    if (!connected) {
      setGoogleEvents([]);
      setGoogleNote('');
      return undefined;
    }
    let cancelled = false;
    listEvents(today, today)
      .then((items) => {
        if (!cancelled) {
          setGoogleEvents(items || []);
          setGoogleNote('');
        }
      })
      .catch((err) => {
        if (!cancelled) setGoogleNote(err.message || 'Could not read Google Calendar.');
      });
    return () => {
      cancelled = true;
    };
  }, [connected, listEvents, today]);

  const togglePlan = (plan, done) => {
    if (!plan || plan.kind === 'rest') return;
    setWorkoutDone(plan.day, plan.id, !done);
  };

  return (
    <div className="view life-os">
      <header className="view__head">
        <p className="eyebrow">Life OS</p>
        <h2 className="view__title">{formatLong(today)}</h2>
      </header>

      <section className="section os-card life-os__habits">
        <div className="section__head">
          <h3 className="os-card__title">Today’s habits</h3>
          <button type="button" className="text-btn" onClick={() => onOpen('habits')}>
            All habits
          </button>
        </div>
        {due.length === 0 ? (
          <p className="os-card__meta">Nothing due today.</p>
        ) : (
          <ul className="rows">
            {due.map((habit) => (
              <DashboardHabitRow key={habit.id} habit={habit} day={today} />
            ))}
          </ul>
        )}
      </section>

      <div className="life-os__grid">
        <section className="section os-card">
          <div className="section__head">
            <h3 className="os-card__title">Food</h3>
            <button type="button" className="text-btn" onClick={() => onOpen('more', 'calories')}>
              Meals
            </button>
          </div>
          <FoodMeters entry={food} />
          <p className="os-card__meta">
            {food
              ? food.source === 'ingest'
                ? 'From the daily total.'
                : 'From meals logged in Tally.'
              : 'No food logged today yet.'}
          </p>
        </section>

        <section className="section">
          <div className="section__head">
            <h3 className="os-card__title">Training</h3>
            <button type="button" className="text-btn" onClick={() => onOpen('more', 'workouts')}>
              Week
            </button>
          </div>
          <div className="os-stack">
            <WorkoutBlock plan={todayPlan} done={todayDone} onToggle={() => togglePlan(todayPlan, todayDone)} />
            {upcoming && (
              <WorkoutBlock
                plan={upcoming}
                done={nextDone}
                onToggle={() => togglePlan(upcoming, nextDone)}
              />
            )}
          </div>
        </section>

        <section className="section os-card">
          <h3 className="os-card__title">Today’s calendar</h3>
          {wrongAccount && (
            <p className="note note--bad">
              Connected as {accountEmail}. Connect {GOOGLE_CALENDAR_ACCOUNT} to read that primary
              calendar.
            </p>
          )}
          {googleNote && <p className="note note--bad">{googleNote}</p>}
          {agenda.length === 0 ? (
            <p className="os-card__meta">Nothing scheduled today.</p>
          ) : (
            <ul className="os-list">
              {agenda.map((event) => (
                <li key={event.id}>
                  <span className="os-card__meta">
                    {event.allDay ? 'All day' : event.startTime || '—'}
                    {event.source === 'google' ? ' · Google' : ''}
                  </span>{' '}
                  {event.href ? (
                    <a href={event.href} target="_blank" rel="noreferrer">
                      {event.title}
                    </a>
                  ) : (
                    event.title
                  )}
                </li>
              ))}
            </ul>
          )}
          {!connected && (
            <button type="button" className="btn" onClick={() => connect()}>
              Connect Google
            </button>
          )}
        </section>

        <section className="section os-card">
          <div className="section__head">
            <h3 className="os-card__title">Watch log</h3>
            <button type="button" className="text-btn" onClick={() => onOpen('more', 'watch')}>
              All
            </button>
          </div>
          {recent.length === 0 ? (
            <p className="os-card__meta">Nothing watched yet.</p>
          ) : (
            <ul className="os-list">
              {recent.map((entry) => (
                <li key={entry.id}>
                  {entry.link ? (
                    <a href={entry.link} target="_blank" rel="noreferrer">
                      {entry.title}
                    </a>
                  ) : (
                    entry.title
                  )}
                  <span className="os-card__meta">
                    {' '}
                    · {entry.watchedOn || 'No date'}
                    {entry.rating ? ` · ${entry.rating}/5` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
