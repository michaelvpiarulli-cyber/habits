/**
 * Domain rules for the life-dashboard collections: tasks, books, jobs, money.
 * Pure functions so the views stay thin and the tests do not need a browser.
 */

import { addDays } from './dates.js';

export const TASK_LISTS = [
  ['inbox', 'Inbox'],
  ['work', 'Work'],
  ['personal', 'Personal'],
  ['errands', 'Errands'],
];

export const TASK_PRIORITIES = [
  ['none', 'None'],
  ['low', 'Low'],
  ['medium', 'Medium'],
  ['high', 'High'],
];

export const BOOK_STATUSES = [
  ['reading', 'Reading'],
  ['queued', 'Up next'],
  ['paused', 'Paused'],
  ['done', 'Finished'],
];

export const JOB_STATUSES = [
  ['saved', 'Saved'],
  ['applied', 'Applied'],
  ['screen', 'Screen'],
  ['interview', 'Interview'],
  ['offer', 'Offer'],
  ['accepted', 'Accepted'],
  ['rejected', 'Rejected'],
  ['withdrawn', 'Withdrawn'],
];

export const JOB_ACTIVE = new Set(['saved', 'applied', 'screen', 'interview', 'offer']);

export const FINANCE_ACCOUNT_KINDS = [
  ['checking', 'Checking'],
  ['savings', 'Savings'],
  ['credit', 'Credit'],
  ['cash', 'Cash'],
  ['other', 'Other'],
];

export const EXPENSE_CATEGORIES = [
  'Housing',
  'Food',
  'Transport',
  'Health',
  'Giving',
  'Fun',
  'Shopping',
  'Other',
];

export const INCOME_CATEGORIES = ['Pay', 'Gift', 'Other'];

export function roundMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export function formatMoney(n, currency = 'USD') {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(roundMoney(n));
}

export function labelOf(pairs, id) {
  return pairs.find(([value]) => value === id)?.[1] || id || '';
}

export function isKept(record) {
  return Boolean(record) && !record.deleted;
}

export function living(list) {
  return (list || []).filter(isKept);
}

/**
 * Split open tasks into overdue / today / upcoming / undated. Done tasks sit
 * in their own list so the working set stays short.
 */
export function groupTasks(tasks, today) {
  const open = living(tasks).filter((task) => !task.done);
  const done = living(tasks)
    .filter((task) => task.done)
    .sort((a, b) => (b.completedAt || b.updatedAt || '').localeCompare(a.completedAt || a.updatedAt || ''));

  const overdue = [];
  const dueToday = [];
  const upcoming = [];
  const later = [];

  for (const task of open) {
    if (!task.dueDate) later.push(task);
    else if (task.dueDate < today) overdue.push(task);
    else if (task.dueDate === today) dueToday.push(task);
    else upcoming.push(task);
  }

  const byDue = (a, b) => {
    const date = (a.dueDate || '').localeCompare(b.dueDate || '');
    if (date) return date;
    return (a.dueTime || '99:99').localeCompare(b.dueTime || '99:99');
  };
  overdue.sort(byDue);
  dueToday.sort(byDue);
  upcoming.sort(byDue);
  later.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

  return { overdue, dueToday, upcoming, later, done, open };
}

export function bookProgress(book) {
  const total = Math.max(0, Number(book?.totalPages) || 0);
  const current = Math.max(0, Number(book?.currentPage) || 0);
  if (book?.status === 'done' && total > 0) return 1;
  if (total <= 0) return current > 0 ? 1 : 0;
  return Math.min(1, current / total);
}

export function clampPage(book, page) {
  const total = Math.max(0, Number(book?.totalPages) || 0);
  const next = Math.max(0, Math.round(Number(page) || 0));
  return total > 0 ? Math.min(total, next) : next;
}

export function pipelineCounts(jobs) {
  const counts = Object.fromEntries(JOB_STATUSES.map(([id]) => [id, 0]));
  let active = 0;
  for (const job of living(jobs)) {
    counts[job.status] = (counts[job.status] || 0) + 1;
    if (JOB_ACTIVE.has(job.status)) active += 1;
  }
  return { ...counts, active };
}

export function accountBalance(account, entries) {
  let balance = roundMoney(account?.openingBalance);
  for (const entry of living(entries)) {
    if (entry.accountId !== account.id) continue;
    const amount = roundMoney(entry.amount);
    balance += entry.direction === 'in' ? amount : -amount;
  }
  return roundMoney(balance);
}

export function moneyForMonth(entries, monthStart, monthEnd) {
  let income = 0;
  let spend = 0;
  const byCategory = {};
  for (const entry of living(entries)) {
    if (entry.day < monthStart || entry.day > monthEnd) continue;
    const amount = roundMoney(entry.amount);
    if (entry.direction === 'in') income += amount;
    else {
      spend += amount;
      const category = entry.category || 'Other';
      byCategory[category] = roundMoney((byCategory[category] || 0) + amount);
    }
  }
  return {
    income: roundMoney(income),
    spend: roundMoney(spend),
    net: roundMoney(income - spend),
    byCategory,
  };
}

export function budgetProgress(budgets, entries, monthStart, monthEnd) {
  const spent = moneyForMonth(entries, monthStart, monthEnd).byCategory;
  return living(budgets)
    .filter((budget) => budget.month === monthStart)
    .map((budget) => {
      const used = roundMoney(spent[budget.category] || 0);
      const limit = roundMoney(budget.amount);
      return {
        ...budget,
        used,
        remaining: roundMoney(limit - used),
        fraction: limit > 0 ? Math.min(1, used / limit) : used > 0 ? 1 : 0,
      };
    })
    .sort((a, b) => a.category.localeCompare(b.category));
}

/**
 * Everything that belongs on a given day of the calendar: local events, tasks
 * with that due date, goals with that due date, and already-normalized Google
 * events.
 */
export function agendaForDay({ events = [], tasks = [], goals = [], googleEvents = [] }, day) {
  const items = [];

  for (const event of living(events)) {
    if (event.day !== day) continue;
    items.push({
      id: `event:${event.id}`,
      source: 'event',
      recordId: event.id,
      title: event.title,
      day,
      startTime: event.allDay ? '' : event.startTime || '',
      endTime: event.allDay ? '' : event.endTime || '',
      allDay: !!event.allDay,
      detail: event.location || event.notes || '',
    });
  }

  for (const task of living(tasks)) {
    if (task.dueDate !== day) continue;
    items.push({
      id: `task:${task.id}`,
      source: 'task',
      recordId: task.id,
      title: task.title,
      day,
      startTime: task.dueTime || '',
      endTime: '',
      allDay: !task.dueTime,
      done: !!task.done,
      detail: task.list ? labelOf(TASK_LISTS, task.list) : '',
    });
  }

  for (const goal of living(goals)) {
    if (goal.dueDate !== day || goal.done) continue;
    items.push({
      id: `goal:${goal.id}`,
      source: 'goal',
      recordId: goal.id,
      title: goal.title,
      day,
      startTime: '',
      endTime: '',
      allDay: true,
      detail: 'Goal',
    });
  }

  for (const event of googleEvents || []) {
    if (event.day !== day) continue;
    items.push({
      id: `google:${event.id}`,
      source: 'google',
      recordId: event.id,
      title: event.title,
      day,
      startTime: event.startTime || '',
      endTime: event.endTime || '',
      allDay: !!event.allDay,
      detail: event.location || '',
      href: event.href || '',
    });
  }

  items.sort((a, b) => {
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
    return (a.startTime || '99:99').localeCompare(b.startTime || '99:99');
  });
  return items;
}

export function daysWithItems(sources, from, to) {
  const set = new Set();
  for (const item of agendaRange(sources, from, to)) set.add(item.day);
  return set;
}

export function agendaRange(sources, from, to) {
  const days = [];
  for (let day = from; day <= to; day = addDays(day, 1)) {
    days.push(...agendaForDay(sources, day));
    if (day === to) break;
  }
  return days;
}
