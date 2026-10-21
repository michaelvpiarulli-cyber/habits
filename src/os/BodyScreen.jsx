import { useState } from 'react';
import { addDays, todayISO, WEEKDAY_INITIALS, startOfWeek } from '../lib/dates';
import { workoutsOnDay } from '../lib/program';
import { useProgram } from './hooks';
import { WorkoutDetail } from './ui';

export function BodyScreen() {
  const today = todayISO();
  const [day, setDay] = useState(today);
  const program = useProgram();
  const monday = startOfWeek(today);
  const week = Array.from({ length: 7 }, (_, index) => addDays(monday, index));
  const session = workoutsOnDay(program.workouts, day);

  return (
    <div className="board">
      {program.warning ? <p className="error">{program.warning}</p> : null}
      <div className="week" aria-label="This week">
        {week.map((iso, index) => (
          <button key={iso} type="button" className={iso === day ? 'is-on' : ''} onClick={() => setDay(iso)}>
            {WEEKDAY_INITIALS[index]}
            <small>{iso.slice(8)}</small>
          </button>
        ))}
      </div>
      <section>
        {session.length === 0 ? <p className="quiet">Rest.</p> : session.map((workout) => <WorkoutDetail key={workout.id} workout={workout} />)}
      </section>
    </div>
  );
}
