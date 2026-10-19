import { useState } from 'react';
import { useData } from '../context/DataProvider';
import { useLife } from '../context/LifeProvider';
import { agendaForDay } from '../lib/agenda';
import { missedDays, readingsForDate, yearProgress } from '../lib/biblePlan';
import { addDays, formatClock, formatLong, todayISO } from '../lib/dates';
import { FOOD_GOALS, foodVsGoals, preferFoodEntry } from '../lib/foodGoals';
import { GOOGLE_CALENDAR_ACCOUNT } from '../lib/google';
import { isComplete, targetOf, valueOf } from '../lib/habits';
import { groupTasks } from '../lib/life';
import { workoutsOnDay } from '../lib/program';
import { isDue, remainingThisWeek } from '../lib/streaks';
import { clockMinutes, nextTimedItem } from '../lib/upcoming';
import { useBible, useGoogleAgenda, useProgram } from './hooks';
import { AgendaList, FoodCard, Frame, Gear, WorkoutDetail } from './ui';

function greeting(date) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function HabitRow({ habit, day }) {
  const { logFor, toggleDay, bumpDay, setValue, doneSetFor } = useData();
  const log = logFor(habit.id, day);
  const value = valueOf(habit, log);
  const complete = isComplete(habit, log);
  const needsNumber = habit.kind === 'amount' || habit.kind === 'measure';
  const [draft, setDraft] = useState(value ? String(value) : '');
  const weekLeft = habit.cadence === 'per_week' ? remainingThisWeek(habit, doneSetFor(habit.id), day) : null;

  let detail = complete ? 'Done' : 'Open';
  if (habit.kind === 'count') detail = `${value} of ${targetOf(habit)}${habit.unit ? ` ${habit.unit}` : ''}`;
  if (needsNumber) {
    detail = value
      ? `${value}${habit.unit ? ` ${habit.unit}` : ''}`
      : `Target ${targetOf(habit)}${habit.unit ? ` ${habit.unit}` : ''}`;
  }
  if (weekLeft != null) detail = `${detail} · ${weekLeft} left this week`;

  const tap = () => {
    if (needsNumber) return;
    if (habit.kind === 'count') bumpDay(habit, day);
    else toggleDay(habit, day);
  };

  const body = (
    <>
      <span className="box" aria-hidden="true" />
      <span>
        <strong>{habit.name}</strong>
        <div className="faint">{detail}</div>
      </span>
    </>
  );

  return (
    <li>
      {needsNumber ? (
        <div className={`check ${complete ? 'is-done' : ''}`}>{body}</div>
      ) : (
        <button type="button" className={`check ${complete ? 'is-done' : ''}`} onClick={tap}>{body}</button>
      )}
      {needsNumber && (
        <form
          className="btn-row"
          onSubmit={(event) => {
            event.preventDefault();
            setValue(habit, day, draft);
          }}
        >
          <input
            aria-label={habit.name}
            inputMode="decimal"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            style={{ width: 96, fontSize: 16, padding: 10, borderRadius: 12, border: '1px solid var(--line)', background: 'var(--bg)' }}
          />
          <button className="btn" type="submit">Save</button>
        </form>
      )}
    </li>
  );
}

export function TodayScreen({ onLog, onSettings, onJump }) {
  const today = todayISO();
  const now = new Date();
  const { activeHabits, nutritionFor } = useData();
  const { dailyNutrition, events, tasks } = useLife();
  const program = useProgram();
  const bible = useBible();
  const google = useGoogleAgenda(today, addDays(today, 14));
  const agenda = agendaForDay(events, google.events, today);
  const next = nextTimedItem(agenda, clockMinutes(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`) ?? 0);
  const session = workoutsOnDay(program.workouts, today);
  const ingested = dailyNutrition.find((row) => row.day === today) || null;
  const food = preferFoodEntry(ingested, nutritionFor(today));
  const stats = foodVsGoals(food);
  const due = activeHabits.filter((habit) => isDue(habit, today));
  const reading = readingsForDate(today);
  const progress = yearProgress(bible.checks, today);
  const behind = missedDays(bible.checks, today).length;
  const openTasks = groupTasks(tasks, today);
  const wrongAccount =
    google.connected && google.accountEmail && google.accountEmail.toLowerCase() !== GOOGLE_CALENDAR_ACCOUNT;

  return (
    <Frame
      kicker={formatLong(today)}
      title={greeting(now)}
      actions={(
        <>
          <button type="button" className="text-btn" onClick={onLog}>Log</button>
          <button type="button" className="icon-btn" aria-label="Settings" onClick={onSettings}><Gear /></button>
        </>
      )}
    >
      <section className="card">
        <p className="os-kicker">Next</p>
        <p className="lede" style={{ marginTop: 6 }}>
          {next ? `${next.title} at ${formatClock(next.startTime)}` : session[0] ? session[0].name : 'The day is open'}
        </p>
        <p className="quiet">
          {Math.round(stats.calories)} of {FOOD_GOALS.calories} kcal · {Math.round(stats.protein)} of {FOOD_GOALS.protein} g protein
          {behind ? ` · ${behind} readings to catch up` : ''}
          {openTasks.overdue.length ? ` · ${openTasks.overdue.length} overdue` : ''}
        </p>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Calendar</h2>
          <button type="button" className="text-btn" onClick={() => onJump('plan')}>Plan</button>
        </div>
        {wrongAccount ? (
          <p className="quiet">Connected as {google.accountEmail}. Use {GOOGLE_CALENDAR_ACCOUNT} for the primary calendar.</p>
        ) : null}
        {!google.connected ? <p className="quiet">Connect Google in Settings to read today’s calendar.</p> : null}
        {google.note ? <p className="error">{google.note}</p> : null}
        <AgendaList items={agenda} />
      </section>

      <FoodCard entry={food} source={food?.source} />

      <section className="card">
        <div className="card-head">
          <h2>Training</h2>
          <button type="button" className="text-btn" onClick={() => onJump('body')}>Week</button>
        </div>
        {session.length === 0 ? <p className="quiet">Rest day.</p> : session.map((workout) => <WorkoutDetail key={workout.id} workout={workout} />)}
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Word</h2>
          <button type="button" className="text-btn" onClick={() => onJump('word')}>Open</button>
        </div>
        {reading.catchUpDay ? (
          <p className="quiet">No new passage today. {behind} days are still open.</p>
        ) : (
          <ul className="food-list">
            {reading.readings.map((item) => (
              <li key={item.slot}>
                <span>{item.ref}</span>
                <small>{item.track}</small>
              </li>
            ))}
          </ul>
        )}
        <p className="faint" style={{ marginTop: 8 }}>{progress.yearDone} of 365 days read</p>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Habits</h2>
          <button type="button" className="text-btn" onClick={onSettings}>Edit</button>
        </div>
        {due.length === 0 ? (
          <p className="quiet">Nothing due today.</p>
        ) : (
          <ul className="food-list">
            {due.map((habit) => <HabitRow key={habit.id} habit={habit} day={today} />)}
          </ul>
        )}
      </section>
    </Frame>
  );
}
