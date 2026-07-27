import { useState } from 'react';
import { useData } from '../context/DataProvider';
import { relativeDay, todayISO } from '../lib/dates';

function GoalCard({ goal, habit, progress, onBump, onEdit, onDelete }) {
  const pct = Math.min(100, Math.round((progress / goal.target) * 100));
  const hit = progress >= goal.target;
  const overdue = goal.dueDate && !hit && goal.dueDate < todayISO();

  return (
    <li className={`goal ${hit ? 'is-hit' : ''}`}>
      <div className="goal__head">
        <h3 className="goal__title">{goal.title}</h3>
        {goal.dueDate && (
          <span className={`goal__due ${overdue ? 'is-overdue' : ''}`}>
            {overdue ? 'Due ' : ''}
            {relativeDay(goal.dueDate)}
          </span>
        )}
      </div>

      {goal.detail && <p className="goal__detail">{goal.detail}</p>}

      <div className="goal__bar" role="img" aria-label={`${pct} percent`}>
        <span className="goal__fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="goal__foot">
        <span className="goal__count">
          <b>{progress}</b> of {goal.target} {goal.unit}
          {habit && <span className="goal__link"> · from {habit.name}</span>}
        </span>

        <span className="goal__actions">
          {/* A goal tied to a habit counts itself — there is no second number to keep in step. */}
          {!habit && !hit && (
            <button type="button" className="chip" onClick={() => onBump(1)}>
              +1
            </button>
          )}
          <button type="button" className="chip" onClick={onEdit}>
            Edit
          </button>
          <button type="button" className="chip chip--danger" onClick={onDelete}>
            Delete
          </button>
        </span>
      </div>
    </li>
  );
}

function GoalForm({ habits, goal, onSave, onClose }) {
  const [form, setForm] = useState(() => ({
    title: goal?.title || '',
    detail: goal?.detail || '',
    target: goal?.target ?? '',
    unit: goal?.unit || '',
    habitId: goal?.habitId || '',
    dueDate: goal?.dueDate || '',
  }));

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const canSave = form.title.trim() && Number(form.target) > 0;

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={goal ? 'Edit goal' : 'New goal'}>
      <button type="button" className="sheet__scrim" onClick={onClose} aria-label="Close" />
      <form
        className="sheet__panel"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSave) return;
          onSave({
            title: form.title.trim(),
            detail: form.detail.trim(),
            target: Number(form.target),
            unit: form.unit.trim(),
            habitId: form.habitId || null,
            dueDate: form.dueDate || null,
          });
        }}
      >
        <header className="sheet__head">
          <h2 className="sheet__title">{goal ? 'Edit goal' : 'New goal'}</h2>
          <button type="button" className="sheet__close" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="sheet__body">
          <div className="field">
            <label className="field__label" htmlFor="goal-title">
              Goal
            </label>
            <input
              id="goal-title"
              className="field__input"
              value={form.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="Lift 200 days this year"
              autoFocus
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="goal-detail">
              Note (optional)
            </label>
            <input
              id="goal-detail"
              className="field__input"
              value={form.detail}
              onChange={(e) => set({ detail: e.target.value })}
              placeholder="Why it matters"
            />
          </div>

          <div className="field field--split">
            <label className="field__label" htmlFor="goal-target">
              Target
            </label>
            <input
              id="goal-target"
              className="field__input field__input--num"
              type="number"
              min="1"
              step="any"
              value={form.target}
              onChange={(e) => set({ target: e.target.value })}
              placeholder="200"
            />
            <label className="field__label" htmlFor="goal-unit">
              Unit
            </label>
            <input
              id="goal-unit"
              className="field__input field__input--unit"
              value={form.unit}
              onChange={(e) => set({ unit: e.target.value })}
              placeholder="days"
              maxLength={12}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="goal-habit">
              Count from a habit
            </label>
            <select
              id="goal-habit"
              className="field__input"
              value={form.habitId}
              onChange={(e) => set({ habitId: e.target.value })}
            >
              <option value="">Count it by hand</option>
              {habits.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
            <p className="field__hint">
              Linked goals fill in from that habit’s completed days, so there’s nothing to update twice.
            </p>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="goal-due">
              By when (optional)
            </label>
            <input
              id="goal-due"
              className="field__input"
              type="date"
              value={form.dueDate}
              onChange={(e) => set({ dueDate: e.target.value })}
            />
          </div>
        </div>

        <footer className="sheet__foot">
          <button type="submit" className="btn btn--primary" disabled={!canSave}>
            {goal ? 'Save changes' : 'Add goal'}
          </button>
        </footer>
      </form>
    </div>
  );
}

export function GoalsView() {
  const { goals, habits, activeHabits, addGoal, updateGoal, deleteGoal, goalProgress } = useData();
  const [editing, setEditing] = useState(null);

  const save = (fields) => {
    if (editing === 'new') addGoal(fields);
    else updateGoal(editing.id, fields);
    setEditing(null);
  };

  const open = goals.filter((g) => goalProgress(g) < g.target);
  const hit = goals.filter((g) => goalProgress(g) >= g.target);

  return (
    <div className="view">
      <header className="view__head view__head--row">
        <div>
          <p className="eyebrow">{open.length} in progress</p>
          <h1 className="view__title">Goals</h1>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setEditing('new')}>
          Add goal
        </button>
      </header>

      {goals.length === 0 && (
        <div className="empty">
          <p className="empty__title">No goals yet.</p>
          <p className="empty__body">
            Habits are what you do daily; a goal is where they add up to. Tie one to a habit and it keeps
            its own score.
          </p>
        </div>
      )}

      {open.length > 0 && (
        <ul className="goals">
          {open.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              habit={habits.find((h) => h.id === g.habitId && !h.deleted)}
              progress={goalProgress(g)}
              onBump={(n) => updateGoal(g.id, { progress: g.progress + n })}
              onEdit={() => setEditing(g)}
              onDelete={() => deleteGoal(g.id)}
            />
          ))}
        </ul>
      )}

      {hit.length > 0 && (
        <section className="section">
          <h2 className="eyebrow">Reached</h2>
          <ul className="goals">
            {hit.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                habit={habits.find((h) => h.id === g.habitId && !h.deleted)}
                progress={goalProgress(g)}
                onBump={() => {}}
                onEdit={() => setEditing(g)}
                onDelete={() => deleteGoal(g.id)}
              />
            ))}
          </ul>
        </section>
      )}

      {editing && (
        <GoalForm
          habits={activeHabits}
          goal={editing === 'new' ? null : editing}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
