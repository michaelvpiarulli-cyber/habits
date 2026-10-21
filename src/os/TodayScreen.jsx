import { useData } from '../context/DataProvider';
import { useLife } from '../context/LifeProvider';
import { agendaForDay } from '../lib/agenda';
import { readingsForDate, slotsFor } from '../lib/biblePlan';
import { addDays, formatClock, formatLong, todayISO } from '../lib/dates';
import { FOOD_GOALS, foodVsGoals, ingestedFoodForDay, preferFoodEntry } from '../lib/foodGoals';
import { GOOGLE_CALENDAR_ACCOUNT } from '../lib/google';
import { isComplete } from '../lib/habits';
import { compareByPriority, groupTasks } from '../lib/life';
import { workoutsOnDay } from '../lib/program';
import { isDue } from '../lib/streaks';
import { clockMinutes, nextTimedItem } from '../lib/upcoming';
import { HabitMark } from './HabitMark';
import { useBible, useGoogleAgenda, useProgram } from './hooks';
import { TaskLine } from './TaskLine';

export function TodayScreen() {
  const today = todayISO();
  const now = new Date();
  const { activeHabits, logFor, nutritionFor } = useData();
  const life = useLife();
  const { dailyNutrition, events, tasks } = life;
  const program = useProgram();
  const bible = useBible();
  const google = useGoogleAgenda(today, addDays(today, 1));
  const agenda = agendaForDay(events, google.events, today);
  const nowMinutes = clockMinutes(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`) ?? 0;
  const next = nextTimedItem(agenda, nowMinutes);
  const session = workoutsOnDay(program.workouts, today);
  const ingested = ingestedFoodForDay(dailyNutrition, today);
  const food = preferFoodEntry(ingested, nutritionFor(today));
  const stats = foodVsGoals(food);
  const due = activeHabits.filter((habit) => isDue(habit, today));
  const reading = readingsForDate(today);
  const year = Number(today.slice(0, 4));
  const slots = reading.index == null ? new Set() : slotsFor(bible.checks, year, reading.index);
  const openTasks = groupTasks(tasks, today);
  const topTasks = [...openTasks.overdue, ...openTasks.dueToday].sort(compareByPriority).slice(0, 3);
  const wrongAccount =
    google.connected && google.accountEmail && google.accountEmail.toLowerCase() !== GOOGLE_CALENDAR_ACCOUNT;
  const calories = Math.round(stats.calories).toLocaleString('en-US');
  const calorieGoal = FOOD_GOALS.calories.toLocaleString('en-US');
  const protein = Math.round(stats.protein);

  return (
    <div className="glance">
      <div>
        <p className="quiet">{formatLong(today)}</p>
        <p className="lede" style={{ marginTop: 6 }}>
          {session.length ? session.map((workout) => workout.name).join(', ') : 'Rest'}
        </p>
      </div>

      <section>
        <h2>Food</h2>
        <p>{calories} / {calorieGoal} kcal</p>
        <p>{protein} / {FOOD_GOALS.protein} g protein</p>
        <div className="meters" style={{ marginTop: 10 }}>
          <div className="meter" aria-hidden="true">
            <span style={{ width: `${Math.min(100, Math.round(stats.calorieRatio * 100))}%` }} />
          </div>
          <div className="meter clay" aria-hidden="true">
            <span style={{ width: `${Math.min(100, Math.round(stats.proteinRatio * 100))}%` }} />
          </div>
        </div>
      </section>

      <section>
        <h2>Bible</h2>
        {reading.catchUpDay ? (
          <p className="quiet">Catch up day.</p>
        ) : (
          <ul>
            {reading.readings.map((item) => (
              <li key={item.slot}>
                {item.ref}
                {slots.has(item.slot) ? <span className="faint"> Read</span> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Habits</h2>
        {due.length === 0 ? (
          <p className="quiet">Nothing due.</p>
        ) : (
          <ul>
            {due.map((habit) => (
              <li key={habit.id} className="glance-habit">
                <HabitMark habit={habit} />
                <span className="habit-name">{habit.name}</span>
                <span className="faint">{isComplete(habit, logFor(habit.id, today)) ? ' Done' : ' Open'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Tasks</h2>
        {topTasks.length === 0 ? (
          <p className="quiet">Nothing due.</p>
        ) : (
          <ul>
            {topTasks.map((task) => (
              <TaskLine key={task.id} task={task} today={today} />
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Next</h2>
        {wrongAccount ? <p className="quiet">Calendar is connected as {google.accountEmail}.</p> : null}
        {!google.connected ? <p className="quiet">Calendar is not connected.</p> : null}
        {google.note ? <p className="error">{google.note}</p> : null}
        {next ? (
          <p>{next.title} at {formatClock(next.startTime)}</p>
        ) : (
          <p className="quiet">Nothing next.</p>
        )}
      </section>
    </div>
  );
}
