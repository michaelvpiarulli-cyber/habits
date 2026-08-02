/**
 * Translation between Postgres rows (snake_case) and app records (camelCase).
 *
 * Every record carries `id`, `updatedAt` and `deleted`, which is the whole
 * contract the sync layer needs: merge by id, newest updatedAt wins, tombstones
 * travel like any other edit.
 */

export const nowISO = () => new Date().toISOString();

export const newId = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : // Safari < 15.4 and any non-secure origin; ids only need to be unique.
      `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;

const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

export const habitFromRow = (r) => ({
  id: r.id,
  name: r.name,
  emoji: r.emoji || '',
  cadence: r.cadence,
  weekdays: r.weekdays || [],
  perWeek: r.per_week ?? 3,
  kind: r.kind || 'check',
  target: num(r.target),
  unit: r.unit || '',
  floor: num(r.floor),
  identityId: r.identity_id || null,
  cue: r.cue || '',
  afterId: r.after_id || null,
  archived: !!r.archived,
  sortOrder: r.sort_order ?? 0,
  deleted: !!r.deleted,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const habitToRow = (h, userId) => ({
  id: h.id,
  user_id: userId,
  name: h.name,
  emoji: h.emoji || null,
  cadence: h.cadence,
  weekdays: h.weekdays || [],
  per_week: h.perWeek ?? 3,
  kind: h.kind || 'check',
  target: h.target ?? null,
  unit: h.unit || null,
  floor: h.floor ?? null,
  identity_id: h.identityId || null,
  cue: h.cue || null,
  after_id: h.afterId || null,
  archived: !!h.archived,
  sort_order: h.sortOrder ?? 0,
  deleted: !!h.deleted,
  created_at: h.createdAt,
  updated_at: h.updatedAt,
});

export const logFromRow = (r) => ({
  id: r.id,
  habitId: r.habit_id,
  day: r.day,
  amount: num(r.amount),
  note: r.note || '',
  deleted: !!r.deleted,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const logToRow = (l, userId) => ({
  id: l.id,
  user_id: userId,
  habit_id: l.habitId,
  day: l.day,
  amount: l.amount ?? null,
  note: l.note || null,
  deleted: !!l.deleted,
  created_at: l.createdAt,
  updated_at: l.updatedAt,
});

export const statementFromRow = (r) => ({
  id: r.id,
  name: r.name,
  note: r.note || '',
  verseRef: r.verse_ref || '',
  verseText: r.verse_text || '',
  sortOrder: r.sort_order ?? 0,
  deleted: !!r.deleted,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const statementToRow = (v, userId) => ({
  id: v.id,
  user_id: userId,
  name: v.name,
  note: v.note || null,
  verse_ref: v.verseRef || null,
  verse_text: v.verseText || null,
  sort_order: v.sortOrder ?? 0,
  deleted: !!v.deleted,
  created_at: v.createdAt,
  updated_at: v.updatedAt,
});

export const noteFromRow = (r) => ({
  id: r.id,
  day: r.day,
  text: r.text || '',
  deleted: !!r.deleted,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const noteToRow = (n, userId) => ({
  id: n.id,
  user_id: userId,
  day: n.day,
  text: n.text || '',
  deleted: !!n.deleted,
  created_at: n.createdAt,
  updated_at: n.updatedAt,
});

export const reviewFromRow = (r) => ({
  id: r.id,
  weekStart: r.week_start,
  held: r.held || '',
  compromised: r.compromised || '',
  focus: r.focus || '',
  scores: r.scores && typeof r.scores === 'object' ? r.scores : {},
  deleted: !!r.deleted,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const reviewToRow = (v, userId) => ({
  id: v.id,
  user_id: userId,
  week_start: v.weekStart,
  held: v.held || '',
  compromised: v.compromised || '',
  focus: v.focus || '',
  scores: v.scores || {},
  deleted: !!v.deleted,
  created_at: v.createdAt,
  updated_at: v.updatedAt,
});

export const nutritionFromRow = (r) => ({
  id: r.id,
  day: r.day,
  calories: Number(r.calories) || 0,
  protein: Number(r.protein) || 0,
  carbs: Number(r.carbs) || 0,
  fat: Number(r.fat) || 0,
  deleted: !!r.deleted,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const nutritionToRow = (n, userId) => ({
  id: n.id,
  user_id: userId,
  day: n.day,
  calories: n.calories || 0,
  protein: n.protein || 0,
  carbs: n.carbs || 0,
  fat: n.fat || 0,
  deleted: !!n.deleted,
  created_at: n.createdAt,
  updated_at: n.updatedAt,
});

export const liftLogFromRow = (r) => ({
  id: r.id,
  day: r.day,
  move: r.move,
  loadKind: r.load_kind || 'barbell',
  loadLb: num(r.load_lb),
  sets: num(r.sets),
  reps: num(r.reps),
  deleted: !!r.deleted,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const liftLogToRow = (l, userId) => ({
  id: l.id,
  user_id: userId,
  day: l.day,
  move: l.move,
  load_kind: l.loadKind || 'barbell',
  load_lb: l.loadLb ?? null,
  sets: l.sets ?? null,
  reps: l.reps ?? null,
  deleted: !!l.deleted,
  created_at: l.createdAt,
  updated_at: l.updatedAt,
});

export const goalFromRow = (r) => ({
  id: r.id,
  title: r.title,
  detail: r.detail || '',
  target: Number(r.target) || 1,
  progress: Number(r.progress) || 0,
  unit: r.unit || '',
  habitId: r.habit_id || null,
  dueDate: r.due_date || null,
  done: !!r.done,
  deleted: !!r.deleted,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const goalToRow = (g, userId) => ({
  id: g.id,
  user_id: userId,
  title: g.title,
  detail: g.detail || null,
  target: g.target,
  progress: g.progress,
  unit: g.unit || null,
  habit_id: g.habitId || null,
  due_date: g.dueDate || null,
  done: !!g.done,
  deleted: !!g.deleted,
  created_at: g.createdAt,
  updated_at: g.updatedAt,
});
