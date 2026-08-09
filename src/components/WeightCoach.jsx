import { useMemo, useState } from 'react';
import {
  buildCoachAdvice,
  expectedWeeklyLossLb,
  loadCoach,
  resolveExpenditure,
  saveCoach,
  suggestTargets,
} from '../lib/weightCoach';
import { formatMacro } from '../lib/macroTargets';

/**
 * Day totals + fat-loss coach. Shows what you ate, where you stand vs the
 * budget, and a suggested target based on estimated maintenance.
 */
export function WeightCoach({
  entry,
  targets,
  onApplyTargets,
  readings = [],
  nutritionFor,
  proteinHabitTarget,
  viewingToday = true,
  hideTotals = false,
}) {
  const [coach, setCoach] = useState(() => loadCoach());
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(coach);

  const expenditureInfo = useMemo(
    () => resolveExpenditure(coach, { readings, nutritionFor }),
    [coach, readings, nutritionFor]
  );

  const suggested = useMemo(
    () => suggestTargets(coach, expenditureInfo, proteinHabitTarget),
    [coach, expenditureInfo, proteinHabitTarget]
  );

  const advice = useMemo(
    () =>
      buildCoachAdvice({
        entry,
        targets,
        coach,
        expenditureInfo,
        suggested,
        viewingToday,
      }),
    [entry, targets, coach, expenditureInfo, suggested, viewingToday]
  );

  const openEdit = () => {
    setDraft(coach);
    setEditing(true);
  };

  const saveEdit = (event) => {
    event.preventDefault();
    const next = saveCoach(draft);
    setCoach(next);
    setEditing(false);
  };

  const applySuggested = () => {
    onApplyTargets?.(suggested);
  };

  const { totals } = advice;

  return (
    <section className="weight-coach" aria-label="Day total and weight-loss coach">
      {!hideTotals && (
        <div className="day-totals" aria-label="Day totals">
          <div className="day-totals__kcal">
            <p className="eyebrow">{advice.headline}</p>
            <p className="day-totals__num">
              {formatMacro(totals.calories)}
              <em>kcal</em>
            </p>
          </div>
          <ul className="day-totals__macros">
            <li>
              <span>Protein</span>
              <strong>{formatMacro(totals.protein)}g</strong>
            </li>
            <li>
              <span>Carbs</span>
              <strong>{formatMacro(totals.carbs)}g</strong>
            </li>
            <li>
              <span>Fat</span>
              <strong>{formatMacro(totals.fat)}g</strong>
            </li>
          </ul>
        </div>
      )}

      <div className="weight-coach__card">
        <header className="weight-coach__head">
          <div>
            <p className="eyebrow">Fat-loss coach</p>
            <h2 className="weight-coach__title">
              ~{advice.weekRate} lb/week
              <span> at a {coach.deficit} kcal deficit</span>
            </h2>
          </div>
          <button type="button" className="macro-dash__targets-btn" onClick={openEdit}>
            Plan
          </button>
        </header>

        <p className="weight-coach__strategy">{advice.strategy}</p>
        <p className="weight-coach__detail">{advice.detail}</p>
        <p className="weight-coach__action">{advice.action}</p>

        <div className="weight-coach__suggest">
          <div>
            <p className="eyebrow">Suggested target</p>
            <p className="weight-coach__suggest-line">
              {suggested.calories} kcal · {suggested.protein}P / {suggested.carbs}C /{' '}
              {suggested.fat}F
            </p>
          </div>
          {advice.targetsDiffer ? (
            <button type="button" className="btn btn--primary" onClick={applySuggested}>
              Use these targets
            </button>
          ) : (
            <p className="weight-coach__using">Using coach targets</p>
          )}
        </div>
      </div>

      {editing && (
        <div className="macro-dash__sheet" role="dialog" aria-label="Edit fat-loss plan">
          <form className="macro-dash__editor" onSubmit={saveEdit}>
            <header className="macro-dash__editor-head">
              <h2>Fat-loss plan</h2>
              <p>Pick a daily deficit. ~3500 kcal ≈ 1 lb of fat.</p>
            </header>

            <label className="nutrition__field">
              <span className="nutrition__label">Daily deficit</span>
              <span className="nutrition__control">
                <input
                  type="number"
                  inputMode="numeric"
                  min="150"
                  max="1000"
                  step="50"
                  value={draft.deficit}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, deficit: event.target.value }))
                  }
                />
                <span>kcal</span>
              </span>
            </label>
            <p className="field__hint">
              ≈ {expectedWeeklyLossLb(draft.deficit)} lb/week. 300–500 is a steady cut.
            </p>

            <label className="nutrition__field" style={{ marginTop: 12 }}>
              <span className="nutrition__label">Maintenance override</span>
              <span className="nutrition__control">
                <input
                  type="number"
                  inputMode="numeric"
                  min="1200"
                  max="6000"
                  step="50"
                  placeholder="Auto"
                  value={draft.expenditure ?? ''}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      expenditure: event.target.value === '' ? null : event.target.value,
                    }))
                  }
                />
                <span>kcal</span>
              </span>
            </label>
            <p className="field__hint">Leave blank to estimate from weigh-ins.</p>

            <div className="macro-dash__editor-actions">
              <button type="submit" className="btn btn--primary">
                Save plan
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
