import { useEffect, useMemo, useState } from 'react';
import { useData } from './context/DataProvider';
import { useLife } from './context/LifeProvider';
import { usePages } from './context/PagesProvider';
import { useTheme } from './hooks/useTheme';
import { NativeShell } from './components/NativeShell';
import { BodyScreen } from './os/BodyScreen';
import { FoodScreen } from './os/FoodScreen';
import { HabitsScreen } from './os/HabitsScreen';
import { JenoScreen } from './os/JenoScreen';
import { LogScreen } from './os/LogScreen';
import { PlanScreen } from './os/PlanScreen';
import { SettingsScreen } from './os/SettingsScreen';
import { WeekScreen } from './os/WeekScreen';
import { TodayScreen } from './os/TodayScreen';
import { WordScreen } from './os/WordScreen';
import { BlockEditor } from './shell/BlockEditor';
import { PageIcon } from './shell/PageIcon';
import { Sidebar } from './shell/Sidebar';
import {
  COVERS,
  breadcrumbs,
  canonicalTitle,
  livingBlocks,
  pageById,
  searchPages,
  systemPageByKey,
  trashedPages,
} from './lib/pages';
import './os/os.css';
import './shell/shell.css';

const ICONS = ['📄', '☀️', '📅', '💪', '📖', '✦', '✎', '⚙️', '⭐', '🏠', '🎯', '🍎', '🧠', '📝', '❤️', '✅'];

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
  const [quick, setQuick] = useState(false);
  const [quickQuery, setQuickQuery] = useState('');
  const [iconOpen, setIconOpen] = useState(false);
  const [coverOpen, setCoverOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [coverUrl, setCoverUrl] = useState('');
  const [notice, setNotice] = useState('');

  const trash = pageId === '__trash__';
  const page = pageById(notebook.pages, pageId) || today;
  const crumbs = trash ? [] : breadcrumbs(notebook.pages, page.id);
  const ready = data.dataReady && life.dataReady;
  const deleted = trashedPages(notebook.pages);
  const results = useMemo(
    () => (quickQuery.trim() ? searchPages(notebook.pages, notebook.blocks, quickQuery) : []),
    [notebook.pages, notebook.blocks, quickQuery]
  );

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setQuick(true);
        setQuickQuery('');
      } else if (event.key === 'Escape') {
        setQuick(false);
        setMoreOpen(false);
        setShareOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const openPage = (id) => {
    setPageId(id);
    setDrawer(false);
    setQuick(false);
    setIconOpen(false);
    setCoverOpen(false);
    setMoreOpen(false);
    setShareOpen(false);
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

  const copyLink = async () => {
    const link = `${window.location.origin}/?page=${page.id}`;
    try {
      await navigator.clipboard.writeText(link);
      setNotice('Link copied');
    } catch {
      setNotice(link);
    }
    setShareOpen(false);
  };

  const coverStyle = !trash && page.cover?.startsWith('http')
    ? { backgroundImage: `url(${page.cover})` }
    : !trash && page.cover && COVERS[page.cover]
      ? { backgroundImage: COVERS[page.cover] }
      : null;

  let module = null;
  if (!trash && ready && page.systemKey === 'today') module = <TodayScreen />;
  else if (!trash && ready && page.systemKey === 'week') module = <WeekScreen />;
  else if (!trash && ready && page.systemKey === 'food') module = <FoodScreen onOpenDay={() => openPage(today.id)} />;
  else if (!trash && ready && page.systemKey === 'plan') module = <PlanScreen />;
  else if (!trash && ready && page.systemKey === 'body') module = <BodyScreen />;
  else if (!trash && ready && page.systemKey === 'habits') module = <HabitsScreen />;
  else if (!trash && ready && page.systemKey === 'word') module = <WordScreen />;
  else if (!trash && ready && page.systemKey === 'jeno') module = <JenoScreen />;
  else if (!trash && ready && page.systemKey === 'log') module = <LogScreen />;
  else if (!trash && ready && page.systemKey === 'settings') module = <SettingsScreen />;
  else if (!trash && !ready) module = <p className="quiet">Loading…</p>;

  const history = page.props?.history || [];
  const fullWidth = Boolean(page.systemKey) || page.props?.fullWidth !== false;
  const titled = canonicalTitle(page);
  const hasNotes = livingBlocks(notebook.blocks, page.id).some((block) => block.type !== 'text' || block.content);

  return (
    <div className="app">
      <NativeShell isDark={theme.isDark} />
      {!wide && drawer && <button type="button" className="scrim" aria-label="Close menu" onClick={() => setDrawer(false)} />}
      <Sidebar
        className={!wide ? `sidebar is-drawer ${drawer ? 'is-open' : ''}` : `sidebar ${collapsed ? 'is-collapsed' : ''}`}
        pages={notebook.pages}
        currentId={trash ? '__trash__' : page.id}
        onOpen={openPage}
        onCreate={create}
        onFavorite={(item) => notebook.updatePage(item.id, { favorite: !item.favorite })}
        onDelete={(item) => {
          if (item.systemKey) return;
          notebook.deletePage(item.id);
          if (item.id === page.id) openPage(today.id);
        }}
        onCollapse={() => (wide ? toggleCollapsed() : setDrawer(false))}
        onSearch={() => { setQuick(true); setQuickQuery(''); }}
        onTrash={() => openPage('__trash__')}
        trashCount={deleted.length}
      />
      <div className="workspace">
        <header className="topbar">
          <button type="button" className="icon-btn menu-btn" aria-label={wide && !collapsed ? 'Collapse sidebar' : 'Open sidebar'} onClick={toggleCollapsed}>☰</button>
          <nav className="crumbs" aria-label="Breadcrumb">
            {crumbs.map((crumb, index) => (
              <span key={crumb.id} className="crumb-wrap">
                {index > 0 && <span className="sep">/</span>}
                <button type="button" className={`crumb ${crumb.id === page.id ? 'is-on' : ''}`} onClick={() => openPage(crumb.id)}>
                  <PageIcon page={crumb} />
                  <span className="row-label">{crumb.title || 'Untitled'}</span>
                </button>
              </span>
            ))}
            {trash && <span className="crumb is-on">Trash</span>}
          </nav>
          {!trash && (
            <div className="page-actions">
              <button type="button" className="icon-btn" aria-label="Page actions" onClick={() => { setMoreOpen((value) => !value); setShareOpen(false); }}>···</button>
            </div>
          )}
          {shareOpen && (
            <div className="pop share-pop">
              <strong>Share</strong>
              <p>Only this household can open it.</p>
              <button type="button" onClick={copyLink}>Copy link</button>
            </div>
          )}
          {moreOpen && !trash && (
            <div className="pop more-menu" role="menu">
              <button type="button" onClick={() => { notebook.updatePage(page.id, { favorite: !page.favorite }); setMoreOpen(false); }}>
                {page.favorite ? 'Remove from favorites' : 'Add to favorites'}
              </button>
              <button type="button" onClick={() => { setShareOpen(true); setMoreOpen(false); }}>Share</button>
              <button type="button" onClick={() => notebook.updatePage(page.id, { props: { ...page.props, fullWidth: !fullWidth } })}>
                {fullWidth ? 'Default width' : 'Full width'}
              </button>
              <button type="button" onClick={() => notebook.updatePage(page.id, { props: { ...page.props, smallText: !page.props?.smallText } })}>
                {page.props?.smallText ? 'Default text' : 'Small text'}
              </button>
              <button type="button" onClick={() => { setCoverOpen(true); setMoreOpen(false); }}>Add cover</button>
              {!page.systemKey && <button type="button" onClick={() => notebook.applyTemplate(page.id, 'daily')}>Daily note</button>}
              {!page.systemKey && <button type="button" onClick={() => notebook.applyTemplate(page.id, 'weekly')}>Weekly review</button>}
              <button type="button" disabled={Boolean(page.systemKey)} onClick={() => { const copy = notebook.duplicatePage(page.id); if (copy) openPage(copy.id); }}>Duplicate</button>
              <button type="button" disabled={Boolean(page.systemKey)} onClick={() => { notebook.deletePage(page.id); openPage(today.id); }}>Move to trash</button>
              {history.length > 0 && <p className="side-label">History</p>}
              {history.slice(0, 6).map((shot) => (
                <button
                  key={shot.at}
                  type="button"
                  onClick={() => {
                    notebook.restoreSnapshot(page.id, shot);
                    setMoreOpen(false);
                  }}
                >
                  {new Date(shot.at).toLocaleString()}
                </button>
              ))}
            </div>
          )}
        </header>
        {notebook.warning ? <p className="notice">{notebook.warning}</p> : null}
        {notice ? <p className="notice">{notice}</p> : null}
        <div className="page-scroll">
          {coverStyle && <div className="cover" style={coverStyle} role="img" aria-label="Page cover" />}
          <article className={`page-body${fullWidth ? ' is-full' : ''}${page.props?.smallText ? ' is-small' : ''}`}>
            {trash ? (
              <div className="trash-list">
                <h1 className="page-title">Trash</h1>
                {deleted.length === 0 ? <p className="quiet">Trash is empty.</p> : deleted.map((item) => (
                  <div key={item.id} className="trash-row">
                    <span className="trash-title">
                      <PageIcon page={item} />
                      <span className="row-label">{item.title || 'Untitled'}</span>
                    </span>
                    <button type="button" onClick={() => { notebook.restorePage(item.id); openPage(item.id); }}>Restore</button>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {!page.systemKey && (
                  <div className="page-meta">
                    {!page.cover && <button type="button" className="meta-link" onClick={() => setCoverOpen((value) => !value)}>Add cover</button>}
                    <button type="button" className="meta-link" onClick={() => setIconOpen((value) => !value)}>{page.icon ? 'Change icon' : 'Add icon'}</button>
                  </div>
                )}
                {!page.systemKey && (page.icon || iconOpen) && (
                  <button type="button" className="icon-pick" aria-label="Change icon" onClick={() => setIconOpen((value) => !value)}>
                    <PageIcon page={page} large />
                  </button>
                )}
                {iconOpen && (
                  <div className="pop icon-pop">
                    {ICONS.map((icon) => (
                      <button key={icon} type="button" onClick={() => { notebook.updatePage(page.id, { icon }); setIconOpen(false); }}>{icon}</button>
                    ))}
                    <input aria-label="Custom emoji" placeholder="Paste emoji" onChange={(event) => {
                      const icon = [...event.target.value].slice(-2).join('');
                      if (icon) notebook.updatePage(page.id, { icon });
                    }}
                    />
                  </div>
                )}
                {coverOpen && (
                  <div className="pop cover-pop">
                    <button type="button" className="swatch" aria-label="Remove cover" onClick={() => notebook.updatePage(page.id, { cover: '' })} />
                    {Object.entries(COVERS).map(([key, image]) => (
                      <button key={key} type="button" className="swatch" aria-label={`${key} cover`} style={{ backgroundImage: image }} onClick={() => { notebook.updatePage(page.id, { cover: key }); setCoverOpen(false); }} />
                    ))}
                    <input
                      aria-label="Cover image URL"
                      placeholder="Paste an image link"
                      value={coverUrl}
                      onChange={(event) => setCoverUrl(event.target.value)}
                      onBlur={() => {
                        if (/^https?:\/\//i.test(coverUrl)) notebook.updatePage(page.id, { cover: coverUrl });
                      }}
                    />
                  </div>
                )}
                <input
                  className="page-title"
                  aria-label="Page title"
                  value={titled}
                  readOnly={Boolean(page.systemKey)}
                  placeholder="Untitled"
                  onChange={(event) => {
                    if (!page.systemKey) notebook.updatePage(page.id, { title: event.target.value });
                  }}
                />
                {module && <div className="module">{module}</div>}
                {(!page.systemKey || hasNotes) && (
                  <BlockEditor
                    pageId={page.id}
                    blocks={notebook.blocks}
                    pages={notebook.pages}
                    onOpenPage={openPage}
                    autoFocus={!page.systemKey}
                    onAdd={notebook.addBlock}
                    onUpdate={notebook.updateBlock}
                    onDelete={notebook.deleteBlock}
                    onReorder={notebook.reorder}
                  />
                )}
              </>
            )}
          </article>
        </div>
      </div>
      {!wide && (
        <nav className="tabs" aria-label="Daily">
          {[
            ['today', 'Today'],
            ['food', 'Food'],
            ['body', 'Workouts'],
            ['plan', 'Plan'],
          ].map(([key, label]) => (
            <button key={key} type="button" className={page.systemKey === key && !trash ? 'is-on' : ''} onClick={() => jump(key)}>
              {label}
            </button>
          ))}
          <button type="button" onClick={() => setDrawer(true)}>More</button>
        </nav>
      )}
      {quick && (
        <div className="quick-scrim" onMouseDown={() => setQuick(false)}>
          <div className="quick" role="dialog" aria-label="Search" onMouseDown={(event) => event.stopPropagation()}>
            <input
              autoFocus
              placeholder="Search pages"
              aria-label="Quick find"
              value={quickQuery}
              onChange={(event) => setQuickQuery(event.target.value)}
            />
            <div className="quick-list">
              {(quickQuery.trim() ? results : notebook.pages.filter((item) => !item.deleted).slice(0, 8)).map((item) => (
                <button key={item.id} type="button" onClick={() => openPage(item.id)}>
                  <PageIcon page={item} />
                  <span className="row-label">{item.title || 'Untitled'}</span>
                </button>
              ))}
              {quickQuery.trim() && results.length === 0 && <p className="quiet">No results</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
