import { formatClock } from '../lib/dates';
import { formatExercise, patternLabel } from '../lib/program';
import { whenLabel } from '../lib/upcoming';

export function AgendaList({ items }) {
  if (!items?.length) return <p className="quiet">Nothing scheduled.</p>;
  return (
    <ol className="agenda">
      {items.map((item) => (
        <li key={item.id}>
          <span className="when">{whenLabel(item)}</span>
          <div>
            <strong>{item.title}</strong>
            {item.location ? <div className="faint">{item.location}</div> : null}
            <span className="source">{item.source === 'google' ? 'Google' : 'Tally'}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function WorkoutDetail({ workout }) {
  const windowLabel =
    workout.startTime && workout.endTime
      ? `${formatClock(workout.startTime)} to ${formatClock(workout.endTime)}`
      : '';
  return (
    <article>
      <div className="row-between">
        <h3 className="lede" style={{ fontSize: 20 }}>{workout.name}</h3>
      </div>
      <p className="faint">
        {patternLabel(workout)}
        {windowLabel ? ` · ${windowLabel}` : ''}
        {workout.kind === 'cardio' ? ' · Cardio' : ''}
      </p>
      {(workout.exercises || []).map((exercise, index) => (
        <div className="lift" key={`${exercise.name}-${index}`}>
          <strong>{exercise.name}</strong>
          <div className="quiet">{formatExercise(exercise) || 'As written'}</div>
          {exercise.rest ? <div className="faint">Rest {exercise.rest}</div> : null}
          {exercise.notes ? <div className="faint">{exercise.notes}</div> : null}
        </div>
      ))}
    </article>
  );
}
