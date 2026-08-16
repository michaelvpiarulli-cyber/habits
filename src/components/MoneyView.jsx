import { useMemo, useState } from 'react';
import { useLife } from '../context/LifeProvider';
import {
  addMonths,
  endOfMonth,
  formatShort,
  monthTitle,
  startOfMonth,
  todayISO,
} from '../lib/dates';
import {
  accountBalance,
  budgetProgress,
  EXPENSE_CATEGORIES,
  FINANCE_ACCOUNT_KINDS,
  formatMoney,
  INCOME_CATEGORIES,
  labelOf,
  moneyForMonth,
} from '../lib/life';
import { FormSheet } from './FormSheet';

function AccountForm({ account, onSave, onClose }) {
  const [form, setForm] = useState(() => ({
    name: account?.name || '',
    kind: account?.kind || 'checking',
    openingBalance: account?.openingBalance ?? '',
  }));
  const set = (patch) => setForm((current) => ({ ...current, ...patch }));

  return (
    <FormSheet title={account ? 'Edit account' : 'New account'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.name.trim()) return;
          onSave(form);
        }}
      >
        <div className="field">
          <label className="field__label" htmlFor="acct-name">
            Name
          </label>
          <input
            id="acct-name"
            className="field__input"
            value={form.name}
            onChange={(e) => set({ name: e.target.value })}
            placeholder="Checking"
            autoFocus
          />
        </div>
        <div className="field field--split">
          <label className="field__label" htmlFor="acct-kind">
            Type
          </label>
          <select
            id="acct-kind"
            className="field__input"
            value={form.kind}
            onChange={(e) => set({ kind: e.target.value })}
          >
            {FINANCE_ACCOUNT_KINDS.map(([id, label]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <label className="field__label" htmlFor="acct-open">
            Starting
          </label>
          <input
            id="acct-open"
            className="field__input field__input--num"
            type="number"
            step="0.01"
            value={form.openingBalance}
            onChange={(e) => set({ openingBalance: e.target.value })}
          />
        </div>
        <button type="submit" className="btn btn--primary" disabled={!form.name.trim()}>
          Save
        </button>
      </form>
    </FormSheet>
  );
}

function EntryForm({ accounts, entry, onSave, onClose }) {
  const [form, setForm] = useState(() => ({
    direction: entry?.direction || 'out',
    amount: entry?.amount ?? '',
    day: entry?.day || todayISO(),
    category: entry?.category || 'Food',
    payee: entry?.payee || '',
    accountId: entry?.accountId || accounts[0]?.id || '',
    notes: entry?.notes || '',
  }));
  const set = (patch) => setForm((current) => ({ ...current, ...patch }));
  const categories = form.direction === 'in' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <FormSheet title={entry ? 'Edit entry' : 'New entry'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!(Number(form.amount) > 0)) return;
          onSave(form);
        }}
      >
        <div className="segmented">
          <label className={`segmented__item ${form.direction === 'out' ? 'is-on' : ''}`}>
            <input
              type="radio"
              checked={form.direction === 'out'}
              onChange={() => set({ direction: 'out', category: 'Food' })}
            />
            Spent
          </label>
          <label className={`segmented__item ${form.direction === 'in' ? 'is-on' : ''}`}>
            <input
              type="radio"
              checked={form.direction === 'in'}
              onChange={() => set({ direction: 'in', category: 'Pay' })}
            />
            Received
          </label>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="entry-amount">
            Amount
          </label>
          <input
            id="entry-amount"
            className="field__input"
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => set({ amount: e.target.value })}
            autoFocus
          />
        </div>
        <div className="field field--split">
          <label className="field__label" htmlFor="entry-day">
            Date
          </label>
          <input
            id="entry-day"
            className="field__input"
            type="date"
            value={form.day}
            onChange={(e) => set({ day: e.target.value })}
          />
          <label className="field__label" htmlFor="entry-cat">
            Category
          </label>
          <select
            id="entry-cat"
            className="field__input"
            value={form.category}
            onChange={(e) => set({ category: e.target.value })}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="entry-payee">
            {form.direction === 'in' ? 'From' : 'Payee'}
          </label>
          <input
            id="entry-payee"
            className="field__input"
            value={form.payee}
            onChange={(e) => set({ payee: e.target.value })}
          />
        </div>
        {accounts.length > 0 && (
          <div className="field">
            <label className="field__label" htmlFor="entry-account">
              Account
            </label>
            <select
              id="entry-account"
              className="field__input"
              value={form.accountId}
              onChange={(e) => set({ accountId: e.target.value })}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <button type="submit" className="btn btn--primary" disabled={!(Number(form.amount) > 0)}>
          Save
        </button>
      </form>
    </FormSheet>
  );
}

function BudgetForm({ month, budget, onSave, onClose }) {
  const [form, setForm] = useState(() => ({
    category: budget?.category || 'Food',
    amount: budget?.amount ?? '',
  }));
  const set = (patch) => setForm((current) => ({ ...current, ...patch }));

  return (
    <FormSheet title="Budget category" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!(Number(form.amount) >= 0) || !form.category) return;
          onSave({ ...form, month });
        }}
      >
        <div className="field">
          <label className="field__label" htmlFor="bud-cat">
            Category
          </label>
          <select
            id="bud-cat"
            className="field__input"
            value={form.category}
            onChange={(e) => set({ category: e.target.value })}
            disabled={Boolean(budget)}
          >
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field__label" htmlFor="bud-amt">
            Limit this month
          </label>
          <input
            id="bud-amt"
            className="field__input"
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={(e) => set({ amount: e.target.value })}
          />
        </div>
        <button type="submit" className="btn btn--primary">
          Save
        </button>
      </form>
    </FormSheet>
  );
}

export function MoneyView() {
  const {
    accounts,
    entries,
    budgets,
    addAccount,
    updateAccount,
    deleteAccount,
    addEntry,
    deleteEntry,
    addBudget,
    updateBudget,
  } = useLife();
  const today = todayISO();
  const [month, setMonth] = useState(startOfMonth(today));
  const [sheet, setSheet] = useState(null);
  const monthEnd = endOfMonth(month);
  const summary = useMemo(
    () => moneyForMonth(entries, month, monthEnd),
    [entries, month, monthEnd]
  );
  const bars = useMemo(
    () => budgetProgress(budgets, entries, month, monthEnd),
    [budgets, entries, month, monthEnd]
  );
  const monthEntries = entries.filter((entry) => entry.day >= month && entry.day <= monthEnd);

  return (
    <div className="view">
      <header className="view__head">
        <p className="eyebrow">Money</p>
        <h1 className="view__title">{monthTitle(month)}</h1>
      </header>

      <div className="cal-nav">
        <button type="button" className="day-nav__btn" onClick={() => setMonth(addMonths(month, -1))} aria-label="Previous month">
          ‹
        </button>
        <button type="button" className="chip" onClick={() => setMonth(startOfMonth(today))}>
          This month
        </button>
        <button type="button" className="day-nav__btn" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month">
          ›
        </button>
      </div>

      <section className="dash-grid">
        <div className="dash-card">
          <p className="eyebrow">In</p>
          <p className="dash-card__num">{formatMoney(summary.income)}</p>
        </div>
        <div className="dash-card">
          <p className="eyebrow">Out</p>
          <p className="dash-card__num">{formatMoney(summary.spend)}</p>
        </div>
        <div className="dash-card">
          <p className="eyebrow">Net</p>
          <p className="dash-card__num">{formatMoney(summary.net)}</p>
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="eyebrow">Accounts</h2>
          <button type="button" className="chip" onClick={() => setSheet({ type: 'account' })}>
            Add
          </button>
        </div>
        {accounts.length === 0 ? (
          <p className="empty__body">Add a checking or cash account so entries have a home.</p>
        ) : (
          <ul className="cards">
            {accounts.map((account) => (
              <li key={account.id} className="card card--row">
                <div>
                  <p className="card__name">{account.name}</p>
                  <p className="card__meta">{labelOf(FINANCE_ACCOUNT_KINDS, account.kind)}</p>
                </div>
                <div className="card__right">
                  <p className="card__name">{formatMoney(accountBalance(account, entries), account.currency)}</p>
                  <div className="goal__actions">
                    <button type="button" className="chip" onClick={() => setSheet({ type: 'account', record: account })}>
                      Edit
                    </button>
                    <button type="button" className="chip chip--danger" onClick={() => deleteAccount(account.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="eyebrow">Budget</h2>
          <button type="button" className="chip" onClick={() => setSheet({ type: 'budget' })}>
            Add
          </button>
        </div>
        {bars.length === 0 ? (
          <p className="empty__body">Set a monthly limit per category. Spend against it as you log.</p>
        ) : (
          <ul className="cards">
            {bars.map((budget) => {
              const pct = Math.round(budget.fraction * 100);
              return (
                <li key={budget.id} className="card">
                  <div className="card__head">
                    <p className="card__name">{budget.category}</p>
                    <p className="card__meta">
                      {formatMoney(budget.used)} of {formatMoney(budget.amount)}
                    </p>
                  </div>
                  <div className="goal__bar" role="img" aria-label={`${pct} percent`}>
                    <span className="goal__fill" style={{ width: `${pct}%` }} />
                  </div>
                  <button
                    type="button"
                    className="chip"
                    onClick={() => setSheet({ type: 'budget', record: budget })}
                  >
                    Edit
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="eyebrow">Activity</h2>
          <button type="button" className="chip" onClick={() => setSheet({ type: 'entry' })}>
            Add
          </button>
        </div>
        {monthEntries.length === 0 ? (
          <p className="empty__body">No money moved this month yet.</p>
        ) : (
          <ul className="cards">
            {monthEntries.map((entry) => (
              <li key={entry.id} className="card card--row">
                <div>
                  <p className="card__name">{entry.payee || entry.category}</p>
                  <p className="card__meta">
                    {formatShort(entry.day)} · {entry.category}
                  </p>
                </div>
                <div className="card__right">
                  <p className={`card__name ${entry.direction === 'in' ? 'is-in' : ''}`}>
                    {entry.direction === 'in' ? '+' : '−'}
                    {formatMoney(entry.amount)}
                  </p>
                  <button type="button" className="chip chip--danger" onClick={() => deleteEntry(entry.id)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {sheet?.type === 'account' && (
        <AccountForm
          account={sheet.record}
          onSave={(form) => {
            const fields = {
              name: form.name.trim(),
              kind: form.kind,
              openingBalance: form.openingBalance,
            };
            if (sheet.record) updateAccount(sheet.record.id, fields);
            else addAccount(fields);
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.type === 'entry' && (
        <EntryForm
          accounts={accounts}
          onSave={(form) => {
            addEntry({
              ...form,
              accountId: form.accountId || null,
            });
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.type === 'budget' && (
        <BudgetForm
          month={month}
          budget={sheet.record}
          onSave={(form) => {
            if (sheet.record) updateBudget(sheet.record.id, { amount: form.amount });
            else {
              const existing = budgets.find(
                (row) => row.category === form.category && row.month === month
              );
              if (existing) updateBudget(existing.id, { amount: form.amount });
              else addBudget(form);
            }
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}
