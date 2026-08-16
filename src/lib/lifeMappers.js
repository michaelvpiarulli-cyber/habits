/**
 * Postgres snake_case ↔ app camelCase for the life-dashboard tables.
 * Same contract as mappers.js: id, updatedAt, deleted.
 */

const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

export const taskFromRow = (r) => ({
  id: r.id,
  title: r.title,
  notes: r.notes || '',
  dueDate: r.due_date || null,
  dueTime: r.due_time || '',
  list: r.list || 'inbox',
  priority: r.priority || 'none',
  done: !!r.done,
  completedAt: r.completed_at || null,
  googleEventId: r.google_event_id || '',
  deleted: !!r.deleted,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const taskToRow = (t, userId) => ({
  id: t.id,
  user_id: userId,
  title: t.title,
  notes: t.notes || null,
  due_date: t.dueDate || null,
  due_time: t.dueTime || null,
  list: t.list || 'inbox',
  priority: t.priority || 'none',
  done: !!t.done,
  completed_at: t.completedAt || null,
  google_event_id: t.googleEventId || null,
  deleted: !!t.deleted,
  created_at: t.createdAt,
  updated_at: t.updatedAt,
});

export const eventFromRow = (r) => ({
  id: r.id,
  title: r.title,
  notes: r.notes || '',
  day: r.day,
  startTime: r.start_time || '',
  endTime: r.end_time || '',
  allDay: !!r.all_day,
  location: r.location || '',
  googleEventId: r.google_event_id || '',
  deleted: !!r.deleted,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const eventToRow = (e, userId) => ({
  id: e.id,
  user_id: userId,
  title: e.title,
  notes: e.notes || null,
  day: e.day,
  start_time: e.startTime || null,
  end_time: e.endTime || null,
  all_day: !!e.allDay,
  location: e.location || null,
  google_event_id: e.googleEventId || null,
  deleted: !!e.deleted,
  created_at: e.createdAt,
  updated_at: e.updatedAt,
});

export const bookFromRow = (r) => ({
  id: r.id,
  title: r.title,
  author: r.author || '',
  totalPages: num(r.total_pages) || 0,
  currentPage: num(r.current_page) || 0,
  status: r.status || 'queued',
  startedOn: r.started_on || null,
  finishedOn: r.finished_on || null,
  notes: r.notes || '',
  deleted: !!r.deleted,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const bookToRow = (b, userId) => ({
  id: b.id,
  user_id: userId,
  title: b.title,
  author: b.author || null,
  total_pages: b.totalPages || 0,
  current_page: b.currentPage || 0,
  status: b.status || 'queued',
  started_on: b.startedOn || null,
  finished_on: b.finishedOn || null,
  notes: b.notes || null,
  deleted: !!b.deleted,
  created_at: b.createdAt,
  updated_at: b.updatedAt,
});

export const jobFromRow = (r) => ({
  id: r.id,
  company: r.company,
  role: r.role,
  status: r.status || 'saved',
  url: r.url || '',
  location: r.location || '',
  salary: r.salary || '',
  appliedOn: r.applied_on || null,
  dueDate: r.due_date || null,
  notes: r.notes || '',
  googleEventId: r.google_event_id || '',
  deleted: !!r.deleted,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const jobToRow = (j, userId) => ({
  id: j.id,
  user_id: userId,
  company: j.company,
  role: j.role,
  status: j.status || 'saved',
  url: j.url || null,
  location: j.location || null,
  salary: j.salary || null,
  applied_on: j.appliedOn || null,
  due_date: j.dueDate || null,
  notes: j.notes || null,
  google_event_id: j.googleEventId || null,
  deleted: !!j.deleted,
  created_at: j.createdAt,
  updated_at: j.updatedAt,
});

export const accountFromRow = (r) => ({
  id: r.id,
  name: r.name,
  kind: r.kind || 'checking',
  openingBalance: Number(r.opening_balance) || 0,
  currency: r.currency || 'USD',
  deleted: !!r.deleted,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const accountToRow = (a, userId) => ({
  id: a.id,
  user_id: userId,
  name: a.name,
  kind: a.kind || 'checking',
  opening_balance: a.openingBalance || 0,
  currency: a.currency || 'USD',
  deleted: !!a.deleted,
  created_at: a.createdAt,
  updated_at: a.updatedAt,
});

export const entryFromRow = (r) => ({
  id: r.id,
  accountId: r.account_id || null,
  day: r.day,
  amount: Number(r.amount) || 0,
  direction: r.direction || 'out',
  category: r.category || 'Other',
  payee: r.payee || '',
  notes: r.notes || '',
  deleted: !!r.deleted,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const entryToRow = (e, userId) => ({
  id: e.id,
  user_id: userId,
  account_id: e.accountId || null,
  day: e.day,
  amount: e.amount || 0,
  direction: e.direction || 'out',
  category: e.category || 'Other',
  payee: e.payee || null,
  notes: e.notes || null,
  deleted: !!e.deleted,
  created_at: e.createdAt,
  updated_at: e.updatedAt,
});

export const budgetFromRow = (r) => ({
  id: r.id,
  category: r.category,
  month: r.month,
  amount: Number(r.amount) || 0,
  deleted: !!r.deleted,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const budgetToRow = (b, userId) => ({
  id: b.id,
  user_id: userId,
  category: b.category,
  month: b.month,
  amount: b.amount || 0,
  deleted: !!b.deleted,
  created_at: b.createdAt,
  updated_at: b.updatedAt,
});
