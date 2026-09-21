import { useState } from 'react';
import { useData } from '../context/DataProvider';
import { relativeDay, todayISO } from '../lib/dates';
import { childrenOf, isHit, nextProgress, targetOf, topLevelGoals } from '../lib/goals';
import { feelTap } from '../lib/haptic';

function GoalCard({
  goal,
  habit,
  progress,
  target,
  micros,
  microProgress,
  onBump,
  onToggleMicro,
  onBumpMicro,
  onAddMicro,
  onEdit,
  onEditMicro,
  onDelete,
  onDeleteMicro,
}) {
  const pct = Math.min(100, Math.round((progress / target) * 100));
  const hit = progress >= target;
  const overdue = goal.dueDate && !hit && goal.dueDate < todayISO();
  const scoredByMicros = micros.length > 0 && !habit;
  const [draft, setDraft] = useState('');

  const addMicro = (e) => {
    e.preventDefault();
    const title = draft.trim();
    if (!title) return;
    onAddMicro(title);
    setDraft('');
  };

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
          <b>{progress}</b> of {target}
          {scoredByMicros ? ' steps' : goal.unit ? ` ${goal.unit}` : ''}
          {habit && <span className="goal__link"> · from {habit.name}</span>}
        </span>

        <span className="goal__actions">
          {!habit && micros.length === 0 && !hit && (
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

      <ul className="micros" aria-label="Micro-goals">
        {micros.map((micro) => {
          const value = microProgress(micro);
          const microTarget = targetOf(micro);
          const done = isHit(micro, value);
          const countable = microTarget > 1 && !micro.habitId;
          return (
            <li key={micro.id} className={`micro ${done ? 'is-done' : ''}`}>
              <button
                type="button"
                className="micro__mark"
                onClick={() => onToggleMicro(micro)}
                aria-pressed={done}
                aria-label={done ? `Clear ${micro.title}` : `Mark ${micro.title} done`}
              />
              <button type="button" className="micro__body" onClick={() => (countable ? onBumpMicro(micro) : onToggleMicro(micro))}>
                <span className="micro__name">{micro.title}</span>
                {(countable || micro.dueDate) && (
                  <span className="micro__meta">
                    {countable ? `${value} of ${microTarget}${micro.unit ? ` ${micro.unit}` : ''}` : ''}
                    {micro.dueDate ? `${countable ? ' · ' : ''}${relativeDay(micro.dueDate)}` : ''}
                  </span>
                )}
              </button>
              {countable && !done && (
                <button type="button" className="chip" onClick={() => onBumpMicro(micro)}>
                  +1
                </button>
              )}
              <button type="button" className="micro__edit" onClick={() => onEditMicro(micro)}>
                Edit
              </button>
              <button
                type="button"
                className="micro__edit"
                onClick={() => onDeleteMicro(micro)}
                aria-label={`Delete ${micro.title}`}
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>

      <form className="micro-add" onSubmit={addMicro}>
        <input
          className="field__input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a micro-goal"
          aria-label={`Add a micro-goal under ${goal.title}`}
          maxLength={80}
        />
        <button type="submit" className="chip" disabled={!draft.trim()}>
          Add
        </button>
      </form>
    </li>
  );
}

function GoalForm({ habits, goal, parent, onSave, onClose }) {
  const isMicro = Boolean(parent);
  const [form, setForm] = useState(() => ({
    title: goal?.title || '',
    detail: goal?.detail || '',
    target: goal?.target ?? 1,
    unit: goal?.unit || '',
    habitId: goal?.habitId || '',
    dueDate: goal?.dueDate || '',
  }));

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const canSave = form.title.trim() && Number(form.target) > 0;

  return (
    <div
      className="sheet"
      role="dialog"
      aria-modal="true"
      aria-label={goal ? (isMicro ? 'Edit micro-goal' : 'Edit goal') : isMicro ? 'New micro-goal' : 'New goal'}
    >
      <button type="button" className="sheet__scrim" onClick={onClose} aria-label="Close" />
      <form
        className="sheet__panel"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSave) return;
          onSave({
            title: form.title.trim(),
            detail: form.detail.trim(),
            target: Number(form.target) || 1,
            unit: form.unit.trim(),
            habitId: form.habitId || null,
            dueDate: form.dueDate || null,
            parentId: parent?.id || goal?.parentId || null,
          });
        }}
      >
        <header className="sheet__head">
          <h2 className="sheet__title">
            {goal
              ? isMicro
                ? 'Edit micro-goal'
                : 'Edit goal'
              : isMicro
                ? `Micro-goal of ${parent.title}`
                : 'New goal'}
          </h2>
          <button type="button" className="sheet__close" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="sheet__body">
          <div className="field">
            <label className="field__label" htmlFor="goal-title">
              {isMicro ? 'Micro-goal' : 'Goal'}
            </label>
            <input
              id="goal-title"
              className="field__input"
              value={form.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder={isMicro ? 'Run a 5K' : 'Run a marathon this year'}
              autoFocus
            />
          </div>

          {!isMicro && (
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
          )}

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
              placeholder={isMicro ? '1' : '200'}
            />
            <label className="field__label" htmlFor="goal-unit">
              Unit
            </label>
            <input
              id="goal-unit"
              className="field__input field__input--unit"
              value={form.unit}
              onChange={(e) => set({ unit: e.target.value })}
              placeholder={isMicro ? 'times' : 'days'}
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
              <option value="">{isMicro ? 'Tick it by hand' : 'Count it by hand'}</option>
              {habits.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
            <p className="field__hint">
              {isMicro
                ? 'Leave this blank for a step you tick. Link a habit if the micro is a streak of days.'
                : 'Linked goals fill from that habit’s completed days. Micro-goals underneath are the plan.'}
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
            {goal ? 'Save changes' : isMicro ? 'Add micro-goal' : 'Add goal'}
          </button>
        </footer>
      </form>
    </div>
  );
}

export function GoalsView() {
  const { goals, habits, activeHabits, addGoal, updateGoal, deleteGoal, goalProgress } = useData();
  const [editing, setEditing] = useState(null);

  const parents = topLevelGoals(goals);
  const open = parents.filter((g) => !isHit(g, goalProgress(g), goals));
  const hit = parents.filter((g) => isHit(g, goalProgress(g), goals));

  const save = (fields) => {
    if (editing === 'new' || editing?.mode === 'micro-new') addGoal(fields);
    else updateGoal(editing.id, fields);
    setEditing(null);
  };

  const toggleMicro = (micro) => {
    if (micro.habitId) return;
    const current = goalProgress(micro);
    const next = current >= (Number(micro.target) || 1) ? 0 : Number(micro.target) || 1;
    feelTap(next > current ? 'close' : 'undo');
    updateGoal(micro.id, { progress: next, done: next > 0 });
  };

  const bumpMicro = (micro) => {
    if (micro.habitId) return;
    const next = nextProgress(micro, goalProgress(micro));
    feelTap(next === 0 ? 'undo' : next >= (Number(micro.target) || 1) ? 'close' : 'tick');
    updateGoal(micro.id, { progress: next, done: next >= (Number(micro.target) || 1) });
  };

  const renderCard = (g) => (
    <GoalCard
      key={g.id}
      goal={g}
      habit={habits.find((h) => h.id === g.habitId && !h.deleted)}
      progress={goalProgress(g)}
      target={targetOf(g, goals)}
      micros={childrenOf(goals, g.id)}
      microProgress={goalProgress}
      onBump={(n) => {
        feelTap('tick');
        updateGoal(g.id, { progress: (g.progress || 0) + n });
      }}
      onToggleMicro={toggleMicro}
      onBumpMicro={bumpMicro}
      onAddMicro={(title) => addGoal({ title, target: 1, parentId: g.id })}
      onEdit={() => setEditing(g)}
      onEditMicro={(micro) => setEditing(micro)}
      onDelete={() => deleteGoal(g.id)}
      onDeleteMicro={(micro) => deleteGoal(micro.id)}
    />
  );

  return (
    <div className="view">
      <header className="view__head view__head--row">
        <div>
          <p className="eyebrow">{open.length} in progress</p>
          <h1 className="view__title">Goals</h1>
        </div>
        <button type="button" className="text-btn" onClick={() => setEditing('new')}>
          New
        </button>
      </header>

      {parents.length === 0 && (
        <div className="empty">
          <p className="empty__title">No goals yet.</p>
          <p className="empty__body">
            A goal is the destination. Micro-goals are the steps you tick to get there. Tie the big
            one to a habit and it keeps its own score.
          </p>
        </div>
      )}

      {open.length > 0 && <ul className="goals">{open.map(renderCard)}</ul>}

      {hit.length > 0 && (
        <section className="section">
          <h2 className="eyebrow">Reached</h2>
          <ul className="goals">{hit.map(renderCard)}</ul>
        </section>
      )}

      {editing && (
        <GoalForm
          habits={activeHabits}
          goal={editing === 'new' || editing?.mode === 'micro-new' ? null : editing}
          parent={
            editing?.mode === 'micro-new'
              ? editing.parent
              : goals.find((g) => g.id === editing?.parentId) || null
          }
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
