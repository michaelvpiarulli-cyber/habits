import { useState } from 'react';
import { useData } from './context/DataProvider';
import { useLife } from './context/LifeProvider';
import { useTheme } from './hooks/useTheme';
import { NativeShell } from './components/NativeShell';
import { BodyScreen } from './os/BodyScreen';
import { JenoScreen } from './os/JenoScreen';
import { LogScreen } from './os/LogScreen';
import { PlanScreen } from './os/PlanScreen';
import { SettingsScreen } from './os/SettingsScreen';
import { TodayScreen } from './os/TodayScreen';
import { WordScreen } from './os/WordScreen';
import './os/os.css';

const TABS = [
  ['today', 'Today'],
  ['plan', 'Plan'],
  ['body', 'Body'],
  ['word', 'Word'],
  ['jeno', 'JENO'],
];

export default function App() {
  const theme = useTheme();
  const data = useData();
  const life = useLife();
  const [tab, setTab] = useState('today');
  const [overlay, setOverlay] = useState(null);

  if (!data.dataReady || !life.dataReady) {
    return (
      <div className="os">
        <NativeShell isDark={theme.isDark} />
        <main className="os-scroll"><p className="quiet">Loading…</p></main>
      </div>
    );
  }

  const jump = {
    onLog: () => setOverlay('log'),
    onSettings: () => setOverlay('settings'),
    onJump: setTab,
  };

  let screen = <TodayScreen {...jump} />;
  if (overlay === 'log') screen = <LogScreen onClose={() => setOverlay(null)} />;
  else if (overlay === 'settings') screen = <SettingsScreen onClose={() => setOverlay(null)} />;
  else if (tab === 'plan') screen = <PlanScreen {...jump} />;
  else if (tab === 'body') screen = <BodyScreen {...jump} />;
  else if (tab === 'word') screen = <WordScreen {...jump} />;
  else if (tab === 'jeno') screen = <JenoScreen {...jump} />;

  return (
    <div className={`os ${overlay ? 'is-overlay' : ''}`}>
      <NativeShell isDark={theme.isDark} />
      {screen}
      {!overlay && (
        <nav className="tabs" aria-label="Sections">
          {TABS.map(([id, label]) => (
            <button key={id} type="button" className={tab === id ? 'is-on' : ''} aria-current={tab === id ? 'page' : undefined} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
