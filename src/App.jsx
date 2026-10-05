import { useEffect, useState } from 'react';
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
import { SideNav } from './components/SideNav';
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
  const [navOpen, setNavOpen] = useState(false);

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

  const onNavigate = ({ tab: nextTab, page = null }) => {
    if (page) onOpen(nextTab || 'more', page);
    else onTab(nextTab);
  };

  useEffect(() => {
    if (!navOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && setNavOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navOpen]);

  useEffect(() => {
    document.body.classList.toggle('is-side-nav-open', navOpen);
    return () => document.body.classList.remove('is-side-nav-open');
  }, [navOpen]);

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
    <div className={`app ${navOpen ? 'is-nav-open' : ''}`}>
      <NativeShell isDark={theme.isDark} />
      <RewardSkin />

      <SideNav
        tab={tab}
        morePage={morePage}
        open={navOpen}
        onClose={() => setNavOpen(false)}
        onNavigate={onNavigate}
      />

      <div className="app__shell">
        <header className="topbar">
          <div className="topbar__lead">
            <button
              type="button"
              className="nav-toggle"
              aria-expanded={navOpen}
              aria-controls="side-nav"
              onClick={() => setNavOpen(true)}
            >
              Tools
            </button>
            <h1 className="wordmark">
              Tally<span className="wordmark__dot" aria-hidden="true">.</span>
            </h1>
          </div>
          <button
            type="button"
            className={`account ${syncState === 'error' || life.syncState === 'error' ? 'is-error' : ''}`}
            onClick={() => setAccountOpen(true)}
          >
            <span
              className={`account__dot account__dot--${syncAvailable ? syncState : 'local'}`}
            />
            Settings
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
          {tab === 'more' && !more && (
            <MoreView onOpen={onOpen} onOpenTools={() => setNavOpen(true)} />
          )}
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
      </div>

      {accountOpen && <AccountMenu theme={theme} onClose={() => setAccountOpen(false)} />}
    </div>
  );
}
