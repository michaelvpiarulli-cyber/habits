import { useState } from 'react';
import { addDays, formatLong, todayISO } from '../lib/dates';
import { isDayComplete, missedDays, readingsForDate, slotsFor, yearProgress } from '../lib/biblePlan';
import { useBible } from './hooks';

export function WordScreen() {
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
    <div className="board">
      <p className="quiet">{progress.yearDone} of 365</p>

      <section>
        <h2>{day === today ? 'Today' : formatLong(day)}</h2>
        <div className="btn-row">
          <button type="button" className="btn secondary" onClick={() => setDay(addDays(day, -1))}>Previous</button>
          {day !== today && <button type="button" className="btn secondary" onClick={() => setDay(today)}>Today</button>}
          <button type="button" className="btn secondary" onClick={() => setDay(addDays(day, 1))} disabled={day >= today}>Next</button>
        </div>
        {reading.catchUpDay ? (
          <p className="quiet" style={{ marginTop: 12 }}>No passage. Catch up day.</p>
        ) : (
          <>
            <ul className="food-list" style={{ marginTop: 12 }}>
              {reading.readings.map((item) => (
                <li key={item.slot}>
                  <button type="button" className={`check ${slots.has(item.slot) ? 'is-done' : ''}`} onClick={() => bible.toggle(year, reading.index, item.slot)}>
                    <span className="box" aria-hidden="true" />
                    <span>{item.ref}</span>
                  </button>
                </li>
              ))}
            </ul>
            {!done && <div className="btn-row"><button type="button" className="btn" onClick={() => bible.completeDay(year, reading.index)}>Mark day read</button></div>}
          </>
        )}
      </section>

      <section>
        <h2>Catch up</h2>
        {missed.length === 0 ? <p className="quiet">None.</p> : (
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
      </section>
    </div>
  );
}
