import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { useData } from './context/DataProvider';
import { TodayView } from './components/TodayView';
import { ProgressView } from './components/ProgressView';
import { GoalsView } from './components/GoalsView';
import { HabitsView } from './components/HabitsView';
import { BottomNav } from './components/BottomNav';
import { AccountMenu } from './components/AccountMenu';
import './App.css';

const VIEWS = {
  today: TodayView,
  record: ProgressView,
  goals: GoalsView,
  habits: HabitsView,
};

export default function App() {
  const auth = useAuth();
  const theme = useTheme();
  const { syncState, syncAvailable } = useData();
  const [tab, setTab] = useState('today');
  const [accountOpen, setAccountOpen] = useState(false);

  const View = VIEWS[tab];

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="wordmark">
          Tally
          <span className="wordmark__rule" aria-hidden="true" />
        </h1>

        <button
          type="button"
          className={`account ${syncState === 'error' ? 'is-error' : ''}`}
          onClick={() => setAccountOpen(true)}
        >
          <span className={`account__dot account__dot--${syncAvailable && auth.user ? syncState : 'local'}`} />
          {auth.user ? 'Account' : syncAvailable ? 'Sign in' : 'Settings'}
        </button>
      </header>

      <main className="main">
        <View />
      </main>

      <BottomNav tab={tab} onChange={setTab} />

      {accountOpen && <AccountMenu auth={auth} theme={theme} onClose={() => setAccountOpen(false)} />}
    </div>
  );
}
