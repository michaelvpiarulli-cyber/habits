import { useGoogle } from '../context/GoogleProvider';
import { useData } from '../context/DataProvider';
import { useLife } from '../context/LifeProvider';
import { useTheme } from '../hooks/useTheme';
import { MfpSyncCard } from './MfpSyncCard';
import { StepsKeyCard } from './StepsKeyCard';

export function SettingsScreen() {
  const theme = useTheme();
  const data = useData();
  const life = useLife();
  const google = useGoogle();

  return (
    <div className="board">
      <section>
        <h2>Google Calendar</h2>
        {google.accountEmail ? <p className="faint">Connected as {google.accountEmail}</p> : null}
        {google.error ? <p className="error">{google.error}</p> : null}
        <div className="btn-row">
          {google.connected ? (
            <button type="button" className="btn secondary" onClick={google.disconnect}>Disconnect</button>
          ) : (
            <button type="button" className="btn" onClick={google.connect} disabled={google.busy}>{google.busy ? 'Waiting' : 'Connect Google'}</button>
          )}
        </div>
      </section>

      <StepsKeyCard />

      <MfpSyncCard />

      <section>
        <h2>Appearance</h2>
        <div className="btn-row">
          {['light', 'dark', 'system'].map((pref) => (
            <button key={pref} type="button" className={theme.pref === pref ? 'btn' : 'btn secondary'} onClick={() => theme.setPref(pref)}>
              {pref}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2>Sync</h2>
        <p className="faint">Habits {data.syncState} · Life {life.syncState}</p>
        {data.syncError ? <p className="error">{data.syncError}</p> : null}
        {life.syncError ? <p className="error">{life.syncError}</p> : null}
        <div className="btn-row">
          <button type="button" className="btn secondary" onClick={() => { data.syncNow(); life.syncNow(); }}>Sync now</button>
        </div>
      </section>
    </div>
  );
}
