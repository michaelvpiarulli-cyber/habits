import { useGoogle } from '../context/GoogleProvider';
import { useData } from '../context/DataProvider';
import { useLife } from '../context/LifeProvider';
import { MfpSyncCard } from './MfpSyncCard';
import { StepsKeyCard } from './StepsKeyCard';

export function SettingsScreen() {
  const data = useData();
  const life = useLife();
  const google = useGoogle();

  const tvUrl = `${window.location.origin}/tv`;
  const copyTv = async () => {
    try {
      await navigator.clipboard.writeText(tvUrl);
    } catch {
      /* The address stays on screen if the TV browser blocks clipboard. */
    }
  };

  return (
    <div className="board">
      <section>
        <h2>Open on TV</h2>
        <p className="quiet">The Visio dashboard fills the screen and refreshes on its own.</p>
        <p className="tv-url">{tvUrl}</p>
        <div className="btn-row">
          <a className="btn" href="/tv">Open the TV dashboard</a>
          <button type="button" className="btn secondary" onClick={copyTv}>Copy address</button>
        </div>
        <ol className="tv-steps">
          <li>On the Visio, open the SmartCast browser and type the address.</li>
          <li>Add the page to favorites if the browser offers it.</li>
          <li>From a phone, open the address in Chrome, tap Cast, choose the Visio, and cast the tab.</li>
        </ol>
        <p className="quiet">Cast the tab so the TV shows this page. The TV address also installs as a full screen web app when the browser can save a favorite.</p>
      </section>

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
        <p className="quiet">Command deck. The panels stay dark.</p>
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
