import { useLife } from '../context/LifeProvider';
import { addDays, formatLong, startOfWeek, todayISO, WEEKDAY_LABELS } from '../lib/dates';
import { nextWorkout, todayWorkout, workoutDoneOn, workoutFor } from '../lib/workouts';
import { WorkoutBlock } from './WorkoutBlock';

export function WorkoutsView() {
  const today = todayISO();
  const { workoutLogs, setWorkoutDone } = useLife();
  const monday = startOfWeek(today);
  const week = Array.from({ length: 7 }, (_, index) => addDays(monday, index));
  const todayPlan = todayWorkout(today);
  const upcoming = nextWorkout(today);

  const toggle = (plan, done) => {
    if (!plan || plan.kind === 'rest') return;
    setWorkoutDone(plan.day, plan.id, !done);
  };

  return (
    <div className="view">
      <header className="view__head">
        <p className="eyebrow">Training</p>
        <h2 className="view__title">This week</h2>
        <p className="section__note">
          Strength A and Strength B alternate on Monday, Wednesday, and Friday. Walks are Tuesday,
          Thursday, and Saturday, 7:00–8:00 AM. Sunday is rest.
        </p>
      </header>

      <ol className="os-week">
        {week.map((day) => {
          const plan = workoutFor(day);
          const done = Boolean(workoutDoneOn(workoutLogs, day));
          return (
            <li key={day} className={day === today ? 'is-today' : ''}>
              <span className="eyebrow">{WEEKDAY_LABELS[week.indexOf(day)]}</span>
              <strong>{plan.name}</strong>
              <span className="os-card__meta">{formatLong(day)}</span>
              {done && plan.kind !== 'rest' ? <span className="os-card__meta">Done</span> : null}
            </li>
          );
        })}
      </ol>

      <div className="os-stack">
        <WorkoutBlock
          plan={todayPlan}
          done={Boolean(workoutDoneOn(workoutLogs, today))}
          onToggle={() => toggle(todayPlan, Boolean(workoutDoneOn(workoutLogs, today)))}
        />
        {upcoming && (
          <WorkoutBlock
            plan={upcoming}
            done={Boolean(workoutDoneOn(workoutLogs, upcoming.day))}
            onToggle={() => toggle(upcoming, Boolean(workoutDoneOn(workoutLogs, upcoming.day)))}
          />
        )}
      </div>
    </div>
  );
}
