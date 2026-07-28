import { useEffect, useState } from 'react';
import { useData } from '../context/DataProvider';
import { addDays, formatShort, startOfWeek, todayISO } from '../lib/dates';

/**
 * The Sunday look back.
 *
 * Scored against identity, not habits — the grid already reports whether the
 * reps happened, so asking again here would be noise. The question worth
 * putting to yourself weekly is the one no chart can answer.
 *
 * Three prompts, deliberately: enough to be honest, few enough to actually do.
 * The 1–5 scores are optional; a review with only prose is still a review.
 */
const SCORES = [1, 2, 3, 4, 5];

function weekLabel(weekStart) {
  return `${formatShort(weekStart)} – ${formatShort(addDays(weekStart, 6))}`;
}

export function ReviewSheet({ weekStart, onClose }) {
  const { reviewFor, saveReview, identity } = useData();
  const existing = reviewFor(weekStart);

  const [held, setHeld] = useState(existing?.held || '');
  const [compromised, setCompromised] = useState(existing?.compromised || '');
  const [focus, setFocus] = useState(existing?.focus || '');
  const [scores, setScores] = useState(existing?.scores || {});

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = (e) => {
    e.preventDefault();
    saveReview(weekStart, { held, compromised, focus, scores });
    onClose();
  };

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label="Weekly review">
      <button type="button" className="sheet__scrim" onClick={onClose} aria-label="Close" />
      <form className="sheet__panel" onSubmit={submit}>
        <header className="sheet__head">
          <h2 className="sheet__title">Week of {weekLabel(weekStart)}</h2>
          <button type="button" className="sheet__close" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="sheet__body">
          <div className="field">
            <label className="field__label" htmlFor="rv-held">
              What held
            </label>
            <textarea
              id="rv-held"
              className="field__input field__input--area"
              rows={3}
              value={held}
              onChange={(e) => setHeld(e.target.value)}
              placeholder="Where you were who you said you'd be."
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="rv-comp">
              Where you compromised
            </label>
            <textarea
              id="rv-comp"
              className="field__input field__input--area"
              rows={3}
              value={compromised}
              onChange={(e) => setCompromised(e.target.value)}
              placeholder="Specific beats vague. Nobody else reads this."
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="rv-focus">
              One focus for next week
            </label>
            <textarea
              id="rv-focus"
              className="field__input field__input--area"
              rows={2}
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="One. A list of five is a list of none."
            />
          </div>

          {identity.length > 0 && (
            <fieldset className="field">
              <legend className="field__label">How the week measured up</legend>
              <ul className="scores">
                {identity.map((v) => (
                  <li className="score" key={v.id}>
                    <span className="score__name">{v.name}</span>
                    <span className="score__dots" role="group" aria-label={v.name}>
                      {SCORES.map((n) => (
                        <button
                          key={n}
                          type="button"
                          className={`score__dot ${scores[v.id] >= n ? 'is-on' : ''}`}
                          onClick={() =>
                            setScores((s) => ({ ...s, [v.id]: s[v.id] === n ? 0 : n }))
                          }
                          aria-label={`${v.name}: ${n} of 5`}
                          aria-pressed={scores[v.id] === n}
                        />
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="field__hint">Optional. Tap the same dot again to clear it.</p>
            </fieldset>
          )}
        </div>

        <footer className="sheet__foot">
          <button type="submit" className="btn btn--primary">
            Save review
          </button>
        </footer>
      </form>
    </div>
  );
}

/** The list on the Record tab, plus the way in to this week's. */
export function ReviewList() {
  const { reviews, reviewFor } = useData();
  const [editing, setEditing] = useState(null);

  const thisWeek = startOfWeek(todayISO());
  const done = reviewFor(thisWeek);

  return (
    <section className="section">
      <h2 className="eyebrow">Weekly review</h2>

      <button type="button" className="review-cta" onClick={() => setEditing(thisWeek)}>
        <span className="review-cta__text">
          {done ? 'Edit this week’s review' : 'Review this week'}
        </span>
        <span className="review-cta__week">{weekLabel(thisWeek)}</span>
      </button>

      {reviews.length > 0 && (
        <ul className="reviews">
          {reviews.map((r) => (
            <li key={r.id} className="review">
              <button type="button" className="review__body" onClick={() => setEditing(r.weekStart)}>
                <span className="eyebrow">{weekLabel(r.weekStart)}</span>
                {r.focus && <span className="review__focus">{r.focus}</span>}
                {r.held && <span className="review__line">{r.held}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && <ReviewSheet weekStart={editing} onClose={() => setEditing(null)} />}
    </section>
  );
}
