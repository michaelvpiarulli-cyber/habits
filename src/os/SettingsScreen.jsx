import { useState } from 'react';
import { useData } from '../context/DataProvider';
import { useLife } from '../context/LifeProvider';
import { useGoogle } from '../context/GoogleProvider';
import { GOOGLE_CALENDAR_ACCOUNT } from '../lib/google';
import { useTheme } from '../hooks/useTheme';

export function SettingsScreen({ onClose }) {
  const theme = useTheme();
  const data = useData();
  const life = useLife();
  const google = useGoogle();
  const [name, setName] = useState('');
  const [kind, setKind] = useState('check');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('');

  return (
    <main className="os-scroll">
      <header className="os-head">
        <div>
          <p className="os-kicker">Household</p>
          <h1 className="os-title">Settings</h1>
        </div>
        <button type="button" className="text-btn" onClick={onClose}>Done</button>
      </header>

      <section className="card">
        <h2>Google Calendar</h2>
        <p className="quiet">Read-only. Connect {GOOGLE_CALENDAR_ACCOUNT} so Today and Plan can see the primary calendar.</p>
        {google.accountEmail ? <p className="faint">Connected as {google.accountEmail}</p> : null}
        {google.error ? <p className="error">{google.error}</p> : null}
        <div className="btn-row">
          {google.connected ? (
            <button type="button" className="btn secondary" onClick={google.disconnect}>Disconnect</button>
          ) : (
            <button type="button" className="btn" onClick={google.connect} disabled={google.busy}>{google.busy ? 'Waiting…' : 'Connect Google'}</button>
          )}
        </div>
      </section>

      <section className="card">
        <h2>Appearance</h2>
        <div className="btn-row">
          {['light', 'dark', 'system'].map((pref) => (
            <button key={pref} type="button" className={theme.pref === pref ? 'btn' : 'btn secondary'} onClick={() => theme.setPref(pref)}>
              {pref}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Sync</h2>
        <p className="quiet">No login. This phone shares the household project. Food goal is 2,100 kcal and 210 g protein.</p>
        <p className="faint">Habits {data.syncState} · Life {life.syncState}</p>
        {data.syncError ? <p className="error">{data.syncError}</p> : null}
        {life.syncError ? <p className="error">{life.syncError}</p> : null}
        <div className="btn-row">
          <button type="button" className="btn secondary" onClick={() => { data.syncNow(); life.syncNow(); }}>Sync now</button>
        </div>
      </section>

      <section className="card">
        <h2>Habits</h2>
        <ul className="food-list">
          {data.activeHabits.map((habit) => (
            <li key={habit.id}>
              <span>{habit.name}</span>
              <button type="button" className="text-btn" onClick={() => data.deleteHabit(habit.id)}>Remove</button>
            </li>
          ))}
        </ul>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            data.addHabit({
              name,
              kind,
              target: kind === 'check' ? null : Number(target) || 1,
              unit,
            });
            setName('');
            setTarget('');
            setUnit('');
          }}
        >
          <label className="field"><span>Name</span><input value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label className="field">
            <span>Kind</span>
            <select value={kind} onChange={(event) => setKind(event.target.value)}>
              <option value="check">Done or not</option>
              <option value="count">Count</option>
              <option value="amount">Amount</option>
              <option value="measure">Measure</option>
            </select>
          </label>
          {kind !== 'check' && (
            <label className="field"><span>Target</span><input inputMode="decimal" value={target} onChange={(event) => setTarget(event.target.value)} /></label>
          )}
          <label className="field"><span>Unit</span><input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="g, min, walks" /></label>
          <div className="btn-row"><button className="btn" type="submit">Add habit</button></div>
        </form>
      </section>
    </main>
  );
}
