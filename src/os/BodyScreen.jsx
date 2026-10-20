import { useState } from 'react';
import { useData } from '../context/DataProvider';
import { useLife } from '../context/LifeProvider';
import { addDays, formatLong, todayISO, WEEKDAY_INITIALS, startOfWeek } from '../lib/dates';
import { preferFoodEntry } from '../lib/foodGoals';
import { dayLabels, patternLabel, workoutsOnDay } from '../lib/program';
import { Collection } from '../shell/Collection';
import { useProgram } from './hooks';
import { FoodCard, Frame, Gear, WorkoutDetail } from './ui';

export function BodyScreen({ onLog, onSettings }) {
  const today = todayISO();
  const [day, setDay] = useState(today);
  const { nutritionFor } = useData();
  const { dailyNutrition } = useLife();
  const program = useProgram();
  const monday = startOfWeek(today);
  const week = Array.from({ length: 7 }, (_, index) => addDays(monday, index));
  const ingested = dailyNutrition.find((row) => row.day === day) || null;
  const food = preferFoodEntry(ingested, nutritionFor(day));
  const session = workoutsOnDay(program.workouts, day);

  return (
    <Frame
      kicker="Body"
      title={day === today ? 'Today' : formatLong(day)}
      actions={(
        <>
          <button type="button" className="text-btn" onClick={onLog}>Log</button>
          <button type="button" className="icon-btn" aria-label="Settings" onClick={onSettings}><Gear /></button>
        </>
      )}
    >
      {program.source === 'seed' ? (
        <p className="banner">Starting program. Sets and reps are placeholders until JENO overwrites them.</p>
      ) : (
        <p className="banner">From JENO. This screen only shows the program.</p>
      )}
      {program.warning ? <p className="error">{program.warning}</p> : null}

      <div className="week" aria-label="This week">
        {week.map((iso, index) => (
          <button key={iso} type="button" className={iso === day ? 'is-on' : ''} onClick={() => setDay(iso)}>
            {WEEKDAY_INITIALS[index]}
            <small>{iso.slice(8)}</small>
          </button>
        ))}
      </div>

      <FoodCard entry={food} source={food?.source} />

      <section className="card">
        <div className="card-head"><h2>{formatLong(day)}</h2></div>
        {session.length === 0 ? <p className="quiet">Rest.</p> : session.map((workout) => <WorkoutDetail key={workout.id} workout={workout} />)}
      </section>

      <Collection
        title="Workouts"
        groupKey="status"
        readOnly
        rows={program.workouts.map((workout) => ({
          id: workout.id,
          title: workout.name,
          status: workout.kind || 'other',
          date: '',
          tags: dayLabels(workout.days) || 'No days',
          weekdays: workout.days || [],
          priority: patternLabel(workout),
        }))}
        columns={[
          { key: 'title', label: 'Name', kind: 'title' },
          { key: 'status', label: 'Status', kind: 'status' },
          { key: 'tags', label: 'Tags', kind: 'tags' },
          { key: 'priority', label: 'Schedule', kind: 'text' },
        ]}
      />
    </Frame>
  );
}
