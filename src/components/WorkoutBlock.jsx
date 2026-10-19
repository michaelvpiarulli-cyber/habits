import { formatLong } from '../lib/dates';

export function WorkoutBlock({ plan, done, onToggle }) {
  if (!plan) return null;
  const training = plan.kind !== 'rest';
  return (
    <article className="os-card">
      <p className="eyebrow">{formatLong(plan.day)}</p>
      <h3 className="os-card__title">{plan.name}</h3>
      {plan.window && <p className="os-card__meta">{plan.window}</p>}
      {training ? (
        <ul className="os-list">
          {plan.exercises.map((exercise) => (
            <li key={exercise.name}>
              {exercise.name}
              {exercise.detail ? <span className="os-card__meta"> · {exercise.detail}</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="os-card__meta">Rest day.</p>
      )}
      {training && onToggle && (
        <button type="button" className={`btn ${done ? '' : 'btn--primary'}`} onClick={onToggle}>
          {done ? 'Done · undo' : 'Mark done'}
        </button>
      )}
    </article>
  );
}
