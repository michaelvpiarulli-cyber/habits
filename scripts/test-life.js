/**
 * Life-dashboard domain rules — run with `npm test`.
 */
import assert from 'node:assert/strict';
import {
  addMinutes,
  endOfMonth,
  formatClock,
  monthCells,
  startOfMonth,
} from '../src/lib/dates.js';
import { googleEventBody, normalizeGoogleEvent, normalizeGmailMessage } from '../src/lib/google.js';
import {
  accountBalance,
  agendaForDay,
  bookProgress,
  budgetProgress,
  clampPage,
  groupTasks,
  moneyForMonth,
  pipelineCounts,
  roundMoney,
} from '../src/lib/life.js';

let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  FAIL  ${name}`);
    console.error(`        ${err.message}`);
  }
}

console.log('life');

const stamp = (id, extra = {}) => ({
  id,
  deleted: false,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
  ...extra,
});

test('groupTasks splits overdue, today, upcoming, undated, and done', () => {
  const grouped = groupTasks(
    [
      stamp('a', { title: 'Late', dueDate: '2026-08-01', done: false }),
      stamp('b', { title: 'Now', dueDate: '2026-08-16', dueTime: '09:00', done: false }),
      stamp('c', { title: 'Soon', dueDate: '2026-08-20', done: false }),
      stamp('d', { title: 'Someday', dueDate: null, done: false }),
      stamp('e', { title: 'Finished', dueDate: '2026-08-16', done: true, completedAt: '2026-08-16T12:00:00.000Z' }),
      stamp('f', { title: 'Gone', dueDate: '2026-08-16', done: false, deleted: true }),
    ],
    '2026-08-16'
  );
  assert.deepEqual(
    grouped.overdue.map((t) => t.id),
    ['a']
  );
  assert.deepEqual(
    grouped.dueToday.map((t) => t.id),
    ['b']
  );
  assert.deepEqual(
    grouped.upcoming.map((t) => t.id),
    ['c']
  );
  assert.deepEqual(
    grouped.later.map((t) => t.id),
    ['d']
  );
  assert.deepEqual(
    grouped.done.map((t) => t.id),
    ['e']
  );
  assert.equal(grouped.open.length, 4);
});

test('book progress is current/total and finishing clamps to the last page', () => {
  assert.equal(bookProgress({ currentPage: 50, totalPages: 200 }), 0.25);
  assert.equal(bookProgress({ currentPage: 0, totalPages: 0 }), 0);
  assert.equal(bookProgress({ status: 'done', currentPage: 10, totalPages: 200 }), 1);
  assert.equal(clampPage({ totalPages: 200 }, 250), 200);
  assert.equal(clampPage({ totalPages: 0 }, -4), 0);
});

test('job pipeline counts active applications separately from closed ones', () => {
  const counts = pipelineCounts([
    stamp('1', { status: 'applied' }),
    stamp('2', { status: 'interview' }),
    stamp('3', { status: 'rejected' }),
    stamp('4', { status: 'saved', deleted: true }),
  ]);
  assert.equal(counts.applied, 1);
  assert.equal(counts.interview, 1);
  assert.equal(counts.rejected, 1);
  assert.equal(counts.active, 2);
});

test('account balance is opening plus signed entries, in cents', () => {
  const account = stamp('cash', { openingBalance: 100.1 });
  const balance = accountBalance(account, [
    stamp('in', { accountId: 'cash', amount: 20.15, direction: 'in' }),
    stamp('out', { accountId: 'cash', amount: 5.2, direction: 'out' }),
    stamp('other', { accountId: 'bank', amount: 999, direction: 'out' }),
  ]);
  assert.equal(balance, 115.05);
  assert.equal(roundMoney(0.1 + 0.2), 0.3);
});

test('monthly money and budgets roll up by category', () => {
  const entries = [
    stamp('pay', { day: '2026-08-01', amount: 2000, direction: 'in', category: 'Pay' }),
    stamp('rent', { day: '2026-08-02', amount: 900, direction: 'out', category: 'Housing' }),
    stamp('food', { day: '2026-08-10', amount: 120.4, direction: 'out', category: 'Food' }),
    stamp('old', { day: '2026-07-31', amount: 50, direction: 'out', category: 'Food' }),
  ];
  const month = moneyForMonth(entries, '2026-08-01', '2026-08-31');
  assert.equal(month.income, 2000);
  assert.equal(month.spend, 1020.4);
  assert.equal(month.net, 979.6);
  assert.equal(month.byCategory.Housing, 900);

  const budgets = budgetProgress(
    [stamp('b', { category: 'Housing', month: '2026-08-01', amount: 1000 })],
    entries,
    '2026-08-01',
    '2026-08-31'
  );
  assert.equal(budgets[0].used, 900);
  assert.equal(budgets[0].remaining, 100);
  assert.equal(budgets[0].fraction, 0.9);
});

test('agenda stacks all-day items first, then timed local/google/task rows', () => {
  const items = agendaForDay(
    {
      events: [
        stamp('e', {
          title: 'Dentist',
          day: '2026-08-16',
          startTime: '14:00',
          endTime: '14:30',
          allDay: false,
        }),
      ],
      tasks: [
        stamp('t', { title: 'Ship PR', dueDate: '2026-08-16', dueTime: '', done: false, list: 'work' }),
      ],
      goals: [stamp('g', { title: 'Lift 200', dueDate: '2026-08-16', done: false })],
      googleEvents: [
        {
          id: 'gc',
          title: 'Standup',
          day: '2026-08-16',
          startTime: '09:00',
          endTime: '09:15',
          allDay: false,
        },
      ],
    },
    '2026-08-16'
  );
  assert.deepEqual(
    items.map((item) => item.source),
    ['task', 'goal', 'google', 'event']
  );
  assert.equal(items[2].title, 'Standup');
});

test('month grid is Monday-first and pads to whole weeks', () => {
  assert.equal(startOfMonth('2026-08-16'), '2026-08-01');
  assert.equal(endOfMonth('2026-08-16'), '2026-08-31');
  const cells = monthCells('2026-08-16');
  assert.equal(cells.length % 7, 0);
  assert.equal(cells.filter(Boolean)[0], '2026-08-01');
  assert.equal(formatClock('09:05'), '9:05 am');
  assert.equal(addMinutes('09:45', 30), '10:15');
});

test('Google event bodies use dates for all-day and dateTime otherwise', () => {
  const allDay = googleEventBody({ title: 'Move', day: '2026-08-16', allDay: true });
  assert.deepEqual(allDay.start, { date: '2026-08-16' });
  const timed = googleEventBody({
    title: 'Call',
    day: '2026-08-16',
    startTime: '09:00',
    endTime: '09:30',
    allDay: false,
  });
  assert.equal(timed.start.dateTime, '2026-08-16T09:00:00');
  assert.ok(timed.start.timeZone);

  const normalized = normalizeGoogleEvent({
    id: '1',
    summary: 'Sync',
    start: { dateTime: '2026-08-16T09:00:00-07:00' },
    end: { dateTime: '2026-08-16T09:30:00-07:00' },
    htmlLink: 'https://calendar.google.com/event?eid=1',
  });
  assert.equal(normalized.day, '2026-08-16');
  assert.equal(normalized.allDay, false);
  assert.equal(normalized.href.endsWith('eid=1'), true);
});

test('Gmail metadata becomes a readable row with an inbox link', () => {
  const mail = normalizeGmailMessage({
    id: 'abc',
    threadId: 'abc',
    snippet: 'See you Monday',
    labelIds: ['INBOX', 'UNREAD'],
    payload: {
      headers: [
        { name: 'From', value: 'Ada <ada@example.com>' },
        { name: 'Subject', value: 'Offer' },
        { name: 'Date', value: 'Sun, 16 Aug 2026 09:00:00 -0700' },
      ],
    },
  });
  assert.equal(mail.subject, 'Offer');
  assert.equal(mail.unread, true);
  assert.equal(mail.href.includes('abc'), true);
});

if (failed) {
  console.error(`\n${failed} failed`);
  process.exit(1);
}
console.log('  all passed');
