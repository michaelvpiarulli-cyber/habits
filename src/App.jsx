import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { useData } from './context/DataProvider';
import { useLife } from './context/LifeProvider';
import { TodayView } from './components/TodayView';
import { CaloriesView } from './components/CaloriesView';
import { ProgressView } from './components/ProgressView';
import { GoalsView } from './components/GoalsView';
import { HabitsView } from './components/HabitsView';
import { IdentityView } from './components/IdentityView';
import { TasksView } from './components/TasksView';
import { CalendarView } from './components/CalendarView';
import { BooksView } from './components/BooksView';
import { GroceryView } from './components/GroceryView';
import { JobsView } from './components/JobsView';
import { MoneyView } from './components/MoneyView';
import { MailView } from './components/MailView';
import { NotesView } from './components/NotesView';
import { BoardsView } from './components/BoardsView';
import { CreativityView } from './components/CreativityView';
import { MoreView } from './components/MoreView';
import { SubpageBar } from './components/FormSheet';
import { BottomNav } from './components/BottomNav';
import { AccountMenu } from './components/AccountMenu';
import { RewardSkin } from './components/RewardSkin';
import { NativeShell } from './components/NativeShell';
import './App.css';

const MORE_PAGES = {
  notes: { View: NotesView, title: 'Notes' },
  boards: { View: BoardsView, title: 'Boards' },
  creativity: { View: CreativityView, title: 'Creativity' },
  calories: { View: CaloriesView, title: 'Calories' },
  goals: { View: GoalsView, title: 'Goals' },
  habits: { View: HabitsView, title: 'Habits' },
  identity: { View: IdentityView, title: 'Identity' },
  books: { View: BooksView, title: 'Books' },
  grocery: { View: GroceryView, title: 'Fridge' },
  jobs: { View: JobsView, title: 'Jobs' },
  money: { View: MoneyView, title: 'Money' },
  mail: { View: MailView, title: 'Mail' },
  tasks: { View: TasksView, title: 'Todos' },
};

export default function App() {
  const auth = useAuth();
  const theme = useTheme();
  const { syncState, syncAvailable, dataReady } = useData();
  const life = useLife();
  const [tab, setTab] = useState('today');
  const [morePage, setMorePage] = useState(null);
  const [moreParams, setMoreParams] = useState(null);
  const [notesEditing, setNotesEditing] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const onOpen = (next, page = null, params = null) => {
    setTab(next);
    setMorePage(next === 'more' ? page : null);
    setMoreParams(next === 'more' ? params : null);
    if (next !== 'more' || page !== 'notes') setNotesEditing(false);
  };

  const onTab = (next) => {
    setTab(next);
    setMorePage(null);
    setMoreParams(null);
    setNotesEditing(false);
  };

  if (auth.loading || !dataReady || !life.dataReady) {
    return (
      <div className="app">
        <NativeShell isDark={theme.isDark} />
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
      <NativeShell isDark={theme.isDark} />
      <RewardSkin />
      <header className="topbar">
        <h1 className="wordmark">
          Tally<span className="wordmark__dot" aria-hidden="true">.</span>
        </h1>
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
        {tab === 'more' && more && !(morePage === 'notes' && notesEditing) && (
          <SubpageBar
            title={more.title}
            onBack={() => {
              setMorePage(null);
              setMoreParams(null);
              setNotesEditing(false);
            }}
          />
        )}
        {tab === 'today' && <TodayView onOpen={onOpen} />}
        {tab === 'record' && <ProgressView onOpen={onOpen} />}
        {tab === 'calendar' && <CalendarView />}
        {tab === 'more' && !more && <MoreView onOpen={onOpen} />}
        {tab === 'more' && MoreViewComp && (
          <MoreViewComp
            {...(morePage === 'notes'
              ? {
                  initialNoteId: moreParams?.noteId || null,
                  onEditingChange: setNotesEditing,
                  onLeaveEditor: () => setMoreParams(null),
                }
              : morePage === 'creativity'
                ? { onOpen }
                : {})}
          />
        )}
      </main>

      <BottomNav tab={tab} onChange={onTab} />

      {accountOpen && <AccountMenu auth={auth} theme={theme} onClose={() => setAccountOpen(false)} />}
    </div>
  );
}
