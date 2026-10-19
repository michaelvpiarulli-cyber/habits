import { useState } from 'react';
import { addDays, formatLong, todayISO } from '../lib/dates';
import { isDayComplete, missedDays, readingsForDate, slotsFor, yearProgress } from '../lib/biblePlan';
import { useBible } from './hooks';
import { Frame, Gear } from './ui';

export function WordScreen({ onLog, onSettings }) {
  const today = todayISO();
  const [day, setDay] = useState(today);
  const bible = useBible();
  const reading = readingsForDate(day);
  const year = Number(day.slice(0, 4));
  const slots = reading.index == null ? new Set() : slotsFor(bible.checks, year, reading.index);
  const progress = yearProgress(bible.checks, today);
  const missed = missedDays(bible.checks, today);
  const done = reading.index != null && isDayComplete(bible.checks, year, reading.index);

  return (
    <Frame
      kicker="M'Cheyne"
      title="Word"
      actions={(
        <>
          <button type="button" className="text-btn" onClick={onLog}>Log</button>
          <button type="button" className="icon-btn" aria-label="Settings" onClick={onSettings}><Gear /></button>
        </>
      )}
    >
      <section className="card">
        <p className="lede">{progress.yearDone} of 365</p>
        <p className="quiet">{missed.length === 0 ? 'You are current through yesterday.' : `${missed.length} open before today.`}</p>
        <div className="meter" aria-hidden="true"><span style={{ width: `${Math.round((progress.yearDone / 365) * 100)}%` }} /></div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>{day === today ? 'Today' : formatLong(day)}</h2>
          <span className="faint">{done ? 'Read' : ''}</span>
        </div>
        <div className="btn-row">
          <button type="button" className="btn secondary" onClick={() => setDay(addDays(day, -1))}>Previous</button>
          {day !== today && <button type="button" className="btn secondary" onClick={() => setDay(today)}>Today</button>}
          <button type="button" className="btn secondary" onClick={() => setDay(addDays(day, 1))} disabled={day >= today}>Next</button>
        </div>
        {reading.catchUpDay ? (
          <p className="quiet" style={{ marginTop: 12 }}>29 February has no new passage. Use it to catch up.</p>
        ) : (
          <>
            <ul className="food-list" style={{ marginTop: 12 }}>
              {reading.readings.map((item) => (
                <li key={item.slot}>
                  <button type="button" className={`check ${slots.has(item.slot) ? 'is-done' : ''}`} onClick={() => bible.toggle(year, reading.index, item.slot)}>
                    <span className="box" aria-hidden="true" />
                    <span>{item.ref}<div className="faint">{item.track}</div></span>
                  </button>
                </li>
              ))}
            </ul>
            {!done && <div className="btn-row"><button type="button" className="btn" onClick={() => bible.completeDay(year, reading.index)}>Mark day read</button></div>}
          </>
        )}
      </section>

      <section className="card">
        <div className="card-head"><h2>Catch up</h2><span className="faint">{missed.length}</span></div>
        {missed.length === 0 ? <p className="quiet">No missed days.</p> : (
          <ul className="food-list">
            {missed.slice(0, 8).map((item) => (
              <li key={item.iso}>
                <button type="button" onClick={() => setDay(item.iso)}>
                  <strong>{formatLong(item.iso)}</strong>
                  <div className="faint">{readingsForDate(item.iso).readings.map((readingItem) => readingItem.ref).join(' · ')}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
        {missed.length > 8 ? <p className="faint">{missed.length - 8} older days stay on the list.</p> : null}
        {missed[0] ? <div className="btn-row"><button type="button" className="btn secondary" onClick={() => setDay(missed[0].iso)}>Start with the oldest</button></div> : null}
      </section>
    </Frame>
  );
}
