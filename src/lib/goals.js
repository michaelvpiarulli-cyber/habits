/**
 * Goals and the micro-goals under them.
 *
 * A goal is the destination. Micro-goals are the steps that get you there —
 * one level deep, never nested under each other. Score is:
 *
 *   1. completions of a linked habit, when one is set
 *   2. otherwise, how many micro-goals are done, when the goal has children
 *   3. otherwise the handwritten +1 counter
 *
 * `parentId` is local for now (the goals table has no parent column yet).
 * keepLocalGoalNesting copies it back after a remote merge so a pull cannot
 * flatten the tree.
 */

export function livingGoals(goals) {
  return (Array.isArray(goals) ? goals : []).filter((goal) => goal && !goal.deleted);
}

export function isMicro(goal) {
  return Boolean(goal?.parentId);
}

export function childrenOf(goals, parentId) {
  if (!parentId) return [];
  return livingGoals(goals)
    .filter((goal) => goal.parentId === parentId)
    .sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
}

export function topLevelGoals(goals) {
  return livingGoals(goals).filter((goal) => !goal.parentId);
}

export function targetOf(goal, goals = []) {
  const set = Number(goal?.target) || 1;
  if (goal?.habitId) return set;
  const kids = childrenOf(goals, goal?.id);
  if (kids.length > 0) return kids.length;
  return set;
}

function rawProgress(goal) {
  return Number(goal?.progress) || 0;
}

/**
 * How far a goal has actually moved. Micro-goals score themselves the same
 * way, so a micro linked to a habit still fills from that habit.
 */
export function progressOf(goal, { goals = [], doneSets } = {}) {
  if (!goal) return 0;
  if (goal.habitId) return doneSets?.get(goal.habitId)?.size ?? 0;

  const kids = childrenOf(goals, goal.id);
  if (kids.length > 0) {
    return kids.filter((kid) => isHit(kid, progressOf(kid, { goals, doneSets }), goals)).length;
  }

  return rawProgress(goal);
}

export function isHit(goal, progress, goals = []) {
  return progress >= targetOf(goal, goals);
}

/** Next handwritten value for a +1 / toggle. Caps at the target, then wraps to 0. */
export function nextProgress(goal, current) {
  const target = Number(goal?.target) || 1;
  const value = Number(current) || 0;
  if (value >= target) return 0;
  return Math.min(target, value + 1);
}

/**
 * Remote rows do not carry `parentId` yet. After a merge, copy a local parent
 * onto a winning remote record so a pull does not orphan micro-goals.
 */
export function keepLocalGoalNesting(merged, local) {
  if (!Array.isArray(merged) || !Array.isArray(local)) return merged || [];
  const localById = new Map(local.map((goal) => [goal.id, goal]));
  return merged.map((goal) => {
    if (goal?.parentId) return goal;
    const fromLocal = localById.get(goal?.id)?.parentId;
    return fromLocal ? { ...goal, parentId: fromLocal } : goal;
  });
}
