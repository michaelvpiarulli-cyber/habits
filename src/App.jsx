import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { useData } from './context/DataProvider';
import { useLife } from './context/LifeProvider';
import { TodayView } from './components/TodayView';
import { HomeView } from './components/HomeView';
import { WorkoutView } from './components/WorkoutView';
import { CaloriesView } from './components/CaloriesView';
import { ProgressView } from './components/ProgressView';
import { GoalsView } from './components/GoalsView';
import { HabitsView } from './components/HabitsView';
import { IdentityView } from './components/IdentityView';
import { TasksView } from './components/TasksView';
import { CalendarView } from './components/CalendarView';
import { BooksView } from './components/BooksView';
import { JobsView } from './components/JobsView';
import { MoneyView } from './components/MoneyView';
import { MailView } from './components/MailView';
import { MoreView } from './components/MoreView';
import { SubpageBar } from './components/FormSheet';
import { BottomNav } from './components/BottomNav';
import { AccountMenu } from './components/AccountMenu';
import './App.css';

const MORE_PAGES = {
  calories: { View: CaloriesView, title: 'Calories' },
  record: { View: ProgressView, title: 'Record' },
  goals: { View: GoalsView, title: 'Goals' },
  habits: { View: HabitsView, title: 'Habits' },
  identity: { View: IdentityView, title: 'Identity' },
  books: { View: BooksView, title: 'Books' },
  jobs: { View: JobsView, title: 'Jobs' },
  money: { View: MoneyView, title: 'Money' },
  mail: { View: MailView, title: 'Mail' },
  tasks: { View: TasksView, title: 'Tasks' },
};

export default function App() {
  const auth = useAuth();
  const theme = useTheme();
  const { syncState, syncAvailable, dataReady } = useData();
  const life = useLife();
  const [tab, setTab] = useState('home');
  const [morePage, setMorePage] = useState(null);
  const [accountOpen, setAccountOpen] = useState(false);

  const onOpen = (next, page = null) => {
    setTab(next);
    setMorePage(next === 'more' ? page : null);
  };

  const onTab = (next) => {
    setTab(next);
    setMorePage(null);
  };

  if (auth.loading || !dataReady || !life.dataReady) {
    return (
      <div className="app">
        <main className="main">
          <p className="status">Loading…</p>
        </main>
      </div>
    );
  }

  const more = morePage ? MORE_PAGES[morePage] : null;
  const MoreViewComp = more?.View;

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="wordmark">Tally</h1>
        <button
          type="button"
          className={`account ${syncState === 'error' || life.syncState === 'error' ? 'is-error' : ''}`}
          onClick={() => setAccountOpen(true)}
        >
          <span
            className={`account__dot account__dot--${syncAvailable && auth.user ? syncState : 'local'}`}
          />
          {auth.user ? 'Account' : syncAvailable ? 'Sign in' : 'Settings'}
        </button>
      </header>

      <main className="main">
        {tab === 'more' && more && <SubpageBar title={more.title} onBack={() => setMorePage(null)} />}
        {tab === 'home' && <HomeView onOpen={onOpen} />}
        {tab === 'today' && <TodayView onOpen={onOpen} />}
        {tab === 'workout' && <WorkoutView />}
        {tab === 'calendar' && <CalendarView />}
        {tab === 'more' && !more && <MoreView onOpen={onOpen} />}
        {tab === 'more' && MoreViewComp && <MoreViewComp />}
      </main>

      <BottomNav tab={tab} onChange={onTab} />

      {accountOpen && <AccountMenu auth={auth} theme={theme} onClose={() => setAccountOpen(false)} />}
    </div>
  );
}
