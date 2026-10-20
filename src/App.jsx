import { useEffect, useState } from 'react';
import { useData } from './context/DataProvider';
import { useLife } from './context/LifeProvider';
import { usePages } from './context/PagesProvider';
import { useTheme } from './hooks/useTheme';
import { NativeShell } from './components/NativeShell';
import { BodyScreen } from './os/BodyScreen';
import { JenoScreen } from './os/JenoScreen';
import { LogScreen } from './os/LogScreen';
import { PlanScreen } from './os/PlanScreen';
import { SettingsScreen } from './os/SettingsScreen';
import { TodayScreen } from './os/TodayScreen';
import { WordScreen } from './os/WordScreen';
import { BlockEditor } from './shell/BlockEditor';
import { Sidebar } from './shell/Sidebar';
import {
  COVERS,
  breadcrumbs,
  pageById,
  systemPageByKey,
} from './lib/pages';
import './os/os.css';
import './shell/shell.css';

const ICONS = ['📄', '☀️', '📅', '💪', '📖', '✦', '✎', '⚙', '⭐', '🏠', '🎯', '🍎', '🧠', '📝'];

function useWide() {
  const [wide, setWide] = useState(() => window.matchMedia('(min-width: 960px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 960px)');
    const onChange = () => setWide(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return wide;
}

export default function App() {
  const theme = useTheme();
  const data = useData();
  const life = useLife();
  const notebook = usePages();
  const wide = useWide();
  const today = systemPageByKey('today');
  const [pageId, setPageId] = useState(today.id);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('tally-sidebar') === 'closed');
  const [drawer, setDrawer] = useState(false);
  const [query, setQuery] = useState('');
  const [iconOpen, setIconOpen] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [coverUrl, setCoverUrl] = useState('');

  const page = pageById(notebook.pages, pageId) || today;
  const crumbs = breadcrumbs(notebook.pages, page.id);
  const ready = data.dataReady && life.dataReady;

  const openPage = (id) => {
    setPageId(id);
    setDrawer(false);
    setQuery('');
    setIconOpen(false);
    setCoverOpen(false);
    setMoreOpen(false);
  };

  const jump = (key) => {
    const target = systemPageByKey(key);
    if (target) openPage(target.id);
  };

  const create = (parentId) => {
    const created = notebook.createPage(parentId);
    if (created) openPage(created.id);
  };

  const toggleCollapsed = () => {
    if (!wide) {
      setDrawer((value) => !value);
      return;
    }
    setCollapsed((value) => {
      localStorage.setItem('tally-sidebar', value ? 'open' : 'closed');
      return !value;
    });
  };

  const coverStyle = page.cover?.startsWith('http')
    ? { backgroundImage: `url(${page.cover})` }
    : page.cover && COVERS[page.cover]
      ? { backgroundImage: COVERS[page.cover] }
      : null;

  let module = null;
  if (!ready) module = <p className="quiet">Loading…</p>;
  else if (page.systemKey === 'today') module = <TodayScreen onLog={() => jump('log')} onSettings={() => jump('settings')} onJump={jump} />;
  else if (page.systemKey === 'plan') module = <PlanScreen onLog={() => jump('log')} onSettings={() => jump('settings')} />;
  else if (page.systemKey === 'body') module = <BodyScreen onLog={() => jump('log')} onSettings={() => jump('settings')} />;
  else if (page.systemKey === 'word') module = <WordScreen onLog={() => jump('log')} onSettings={() => jump('settings')} />;
  else if (page.systemKey === 'jeno') module = <JenoScreen onLog={() => jump('log')} onSettings={() => jump('settings')} />;
  else if (page.systemKey === 'log') module = <LogScreen onClose={() => jump('today')} />;
  else if (page.systemKey === 'settings') module = <SettingsScreen onClose={() => jump('today')} />;

  return (
    <div className="app">
      <NativeShell isDark={theme.isDark} />
      {!wide && drawer && <button type="button" className="scrim" aria-label="Close menu" onClick={() => setDrawer(false)} />}
      <Sidebar
        className={!wide ? `sidebar is-drawer ${drawer ? 'is-open' : ''}` : `sidebar ${collapsed ? 'is-collapsed' : ''}`}
        pages={notebook.pages}
        blocks={notebook.blocks}
        currentId={page.id}
        query={query}
        onQuery={setQuery}
        onOpen={openPage}
        onCreate={create}
        onCollapse={() => (wide ? toggleCollapsed() : setDrawer(false))}
      />
      <div className="workspace">
        <header className="topbar">
          <button type="button" className="icon-btn menu-btn" aria-label={wide && !collapsed ? 'Collapse sidebar' : 'Open sidebar'} onClick={toggleCollapsed}>
            ☰
          </button>
          <nav className="crumbs" aria-label="Breadcrumb">
            <span className="crumb">Tally</span>
            {crumbs.map((crumb) => (
              <span key={crumb.id}>
                <span className="sep">/</span>
                <button type="button" className={`crumb ${crumb.id === page.id ? 'is-on' : ''}`} onClick={() => openPage(crumb.id)}>
                  {crumb.icon} {crumb.title || 'Untitled'}
                </button>
              </span>
            ))}
          </nav>
          <div className="page-actions">
            <button type="button" aria-pressed={page.favorite} onClick={() => notebook.updatePage(page.id, { favorite: !page.favorite })}>
              {page.favorite ? '★' : '☆'}
            </button>
            <button type="button" onClick={() => { setCoverOpen((value) => !value); setIconOpen(false); setMoreOpen(false); }}>Cover</button>
            <button type="button" onClick={() => create(page.id)}>New</button>
            <button type="button" aria-label="Page actions" onClick={() => { setMoreOpen((value) => !value); setCoverOpen(false); }}>···</button>
          </div>
        </header>
        {notebook.warning ? <p className="notice" style={{ padding: '0 16px' }}>{notebook.warning}</p> : null}
        <div className="page-scroll">
          {coverStyle && <div className="cover" style={coverStyle} role="img" aria-label="Page cover" />}
          <article className="page-body">
            <div style={{ position: 'relative' }}>
              <button type="button" className="icon-pick" aria-label="Change icon" onClick={() => { setIconOpen((value) => !value); setCoverOpen(false); }}>
                {page.icon || '📄'}
              </button>
              {iconOpen && (
                <div className="icon-pop">
                  {ICONS.map((icon) => (
                    <button key={icon} type="button" onClick={() => { notebook.updatePage(page.id, { icon }); setIconOpen(false); }}>{icon}</button>
                  ))}
                  <input
                    aria-label="Custom emoji"
                    placeholder="Paste emoji"
                    onChange={(event) => {
                      const icon = [...event.target.value].slice(-2).join('');
                      if (icon) notebook.updatePage(page.id, { icon });
                    }}
                  />
                </div>
              )}
              {coverOpen && (
                <div className="cover-pop">
                  <button type="button" className="swatch" aria-label="Remove cover" onClick={() => notebook.updatePage(page.id, { cover: '' })} />
                  {Object.entries(COVERS).map(([key, image]) => (
                    <button key={key} type="button" className="swatch" aria-label={`${key} cover`} style={{ backgroundImage: image }} onClick={() => notebook.updatePage(page.id, { cover: key })} />
                  ))}
                  <input
                    aria-label="Cover image URL"
                    placeholder="https:// image"
                    value={coverUrl}
                    onChange={(event) => setCoverUrl(event.target.value)}
                    onBlur={() => {
                      if (/^https?:\/\//i.test(coverUrl)) notebook.updatePage(page.id, { cover: coverUrl });
                    }}
                  />
                </div>
              )}
              {moreOpen && (
                <div className="more-menu" style={{ right: 0 }}>
                  <button
                    type="button"
                    disabled={Boolean(page.systemKey)}
                    onClick={() => {
                      const parent = crumbs[crumbs.length - 2];
                      notebook.deletePage(page.id);
                      openPage(parent?.id || today.id);
                    }}
                  >
                    {page.systemKey ? 'Life pages stay' : 'Delete page'}
                  </button>
                </div>
              )}
            </div>
            <input
              className="page-title"
              aria-label="Page title"
              value={page.title}
              onChange={(event) => notebook.updatePage(page.id, { title: event.target.value })}
            />
            {module && <div className="module">{module}</div>}
            <BlockEditor
              pageId={page.id}
              blocks={notebook.blocks}
              autoFocus={!page.systemKey}
              onAdd={notebook.addBlock}
              onUpdate={notebook.updateBlock}
              onDelete={notebook.deleteBlock}
              onReorder={notebook.reorder}
              onMove={notebook.move}
            />
          </article>
        </div>
      </div>
    </div>
  );
}
