import { useState } from 'react';
import {
  TARGET_FIELDS,
  formatMacro,
  intakeOf,
  progressOf,
  remainingOf,
} from '../lib/macroTargets';

const RINGS = [
  { id: 'calories', label: 'Calories', unit: 'kcal', tone: 'blue', size: 132 },
  { id: 'protein', label: 'Protein', unit: 'g', tone: 'blue', size: 72 },
  { id: 'carbs', label: 'Carbs', unit: 'g', tone: 'pink', size: 72 },
  { id: 'fat', label: 'Fat', unit: 'g', tone: 'violet', size: 72 },
];

function Ring({ value, target, tone, size, label, display, unit, sub }) {
  const stroke = size >= 100 ? 9 : 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(progressOf(value, target), 1);
  const dash = circumference * progress;
  const over = progressOf(value, target) > 1;

  return (
    <div className={`macro-ring macro-ring--${tone} ${over ? 'is-over' : ''}`}>
      <svg
        className="macro-ring__svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <circle
          className="macro-ring__track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          className="macro-ring__ink"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${Math.max(0, circumference - dash)}`}
          strokeLinecap="butt"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="macro-ring__center">
        <span className="macro-ring__value">
          {display}
          {unit !== 'kcal' && <small>{unit}</small>}
        </span>
        <span className="macro-ring__label">{label}</span>
        {sub && <span className="macro-ring__sub">{sub}</span>}
      </div>
    </div>
  );
}

/**
 * MacroFactor-inspired day widget: Consumed / Remaining toggle, rings vs
 * targets, and a quiet target editor. No shame colors when you go over.
 */
export function MacroDashboard({ entry, targets, view, onViewChange, onSaveTargets }) {
  const intake = intakeOf(entry);
  const remaining = remainingOf(intake, targets);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(targets);

  const openEditor = () => {
    setDraft(targets);
    setEditing(true);
  };

  const saveEditor = (event) => {
    event.preventDefault();
    onSaveTargets?.(draft);
    setEditing(false);
  };

  const shown = view === 'consumed' ? intake : remaining;
  const hero = RINGS[0];
  const macros = RINGS.slice(1);

  return (
    <section className="macro-dash" aria-label="Daily nutrition">
      <div className="macro-dash__toolbar">
        <div className="macro-dash__toggle" role="group" aria-label="Nutrition display">
          <button
            type="button"
            className={view === 'remaining' ? 'is-on' : ''}
            onClick={() => onViewChange?.('remaining')}
          >
            Remaining
          </button>
          <button
            type="button"
            className={view === 'consumed' ? 'is-on' : ''}
            onClick={() => onViewChange?.('consumed')}
          >
            Consumed
          </button>
        </div>
        <button type="button" className="macro-dash__targets-btn" onClick={openEditor}>
          Targets
        </button>
      </div>

      <div className="macro-dash__hero">
        <Ring
          value={intake.calories}
          target={targets.calories}
          tone={hero.tone}
          size={hero.size}
          label={view === 'remaining' ? 'Remaining' : 'Consumed'}
          display={formatMacro(shown.calories)}
          unit="kcal"
          sub={`${intake.calories} / ${targets.calories} kcal`}
        />
        <div className="macro-dash__hero-copy">
          <p className="eyebrow">Energy</p>
          <p className="macro-dash__hero-num">
            {formatMacro(shown.calories)}
            <em>kcal</em>
          </p>
          <p className="macro-dash__hero-cue">
            {view === 'remaining'
              ? shown.calories >= 0
                ? 'left in today’s budget'
                : `${formatMacro(Math.abs(shown.calories))} over target — still just data`
              : `of ${targets.calories} kcal target`}
          </p>
        </div>
      </div>

      <ul className="macro-dash__macros">
        {macros.map((macro) => {
          const consumed = intake[macro.id];
          const display = formatMacro(shown[macro.id]);
          return (
            <li key={macro.id}>
              <Ring
                value={consumed}
                target={targets[macro.id]}
                tone={macro.tone}
                size={macro.size}
                label={macro.label}
                display={display}
                unit={macro.unit}
                sub={`${formatMacro(consumed)} / ${targets[macro.id]}${macro.unit}`}
              />
            </li>
          );
        })}
      </ul>

      {editing && (
        <div className="macro-dash__sheet" role="dialog" aria-label="Edit nutrition targets">
          <form className="macro-dash__editor" onSubmit={saveEditor}>
            <header className="macro-dash__editor-head">
              <h2>Daily targets</h2>
              <p>Used for remaining calories and ring fill. Change anytime.</p>
            </header>
            <div className="macro-dash__editor-grid">
              {TARGET_FIELDS.map(({ id, label, unit, step }) => (
                <label key={id} className="nutrition__field">
                  <span className="nutrition__label">{label}</span>
                  <span className="nutrition__control">
                    <input
                      type="number"
                      inputMode="numeric"
                      step={step}
                      value={draft[id]}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, [id]: event.target.value }))
                      }
                    />
                    <span>{unit}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="macro-dash__editor-actions">
              <button type="submit" className="btn btn--primary">
                Save targets
              </button>
              <button type="button" className="btn" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
