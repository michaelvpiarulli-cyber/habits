import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { useData } from './context/DataProvider';
import { TodayView } from './components/TodayView';
import { CaloriesView } from './components/CaloriesView';
import { ProgressView } from './components/ProgressView';
import { GoalsView } from './components/GoalsView';
import { HabitsView } from './components/HabitsView';
import { IdentityView } from './components/IdentityView';
import { BottomNav } from './components/BottomNav';
import { AccountMenu } from './components/AccountMenu';
import './App.css';

const VIEWS = {
  today: TodayView,
  calories: CaloriesView,
  record: ProgressView,
  goals: GoalsView,
  habits: HabitsView,
  identity: IdentityView,
};

export default function App() {
  const auth = useAuth();
  const theme = useTheme();
  const { syncState, syncAvailable, dataReady } = useData();
  const [tab, setTab] = useState('today');
  const [accountOpen, setAccountOpen] = useState(false);

  const View = VIEWS[tab];

  if (auth.loading || !dataReady) {
    return (
      <div className="app">
        <main className="main">
          <div className="empty">
            <p className="empty__title">Loading your account…</p>
          </div>
        </main>
      </div>
    );
  }

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
