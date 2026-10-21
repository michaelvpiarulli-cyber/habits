import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { NAV_GROUPS, childrenOf, systemPageByKey, withSystemPages } from '../lib/pages';
import { PageIcon } from './PageIcon';

function RowMenu({ page, top, left, onFavorite, onDelete, onClose }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    const onPointer = (event) => {
      if (event.target.closest('.row-menu') || event.target.closest('.row-more')) return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [onClose]);

  return createPortal(
    <div className="pop row-menu" role="menu" style={{ top, left }}>
      <button type="button" role="menuitem" onClick={() => { onFavorite(page); onClose(); }}>
        {page.favorite ? 'Remove from favorites' : 'Add to favorites'}
      </button>
      {!page.systemKey && (
        <button type="button" role="menuitem" onClick={() => { onDelete(page); onClose(); }}>
          Move to trash
        </button>
      )}
    </div>,
    document.body,
  );
}

function PageRow({ page, currentId, depth = 0, onOpen, onCreate, onFavorite, onDelete, twisty }) {
  const [menu, setMenu] = useState(null);
  const openMenu = (event) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const width = 200;
    const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
    const top = Math.min(rect.bottom + 4, window.innerHeight - 96);
    setMenu({ top, left });
  };

  return (
    <div
      className={`tree-row ${currentId === page.id ? 'is-on' : ''} ${menu ? 'is-menu' : ''}`}
      style={{ paddingLeft: 2 + depth * 14 }}
    >
      {twisty}
      <button type="button" className="row-main" onClick={() => onOpen(page.id)}>
        <PageIcon page={page} />
        <span className="row-label">{page.title || 'Untitled'}</span>
      </button>
      <span className="row-actions">
        <button type="button" className="row-plus row-more" aria-label={`Page options for ${page.title}`} aria-expanded={menu ? 'true' : 'false'} onClick={openMenu}>
          ···
        </button>
        <button type="button" className="row-plus" aria-label={`New subpage under ${page.title}`} onClick={() => onCreate(page.id)}>
          +
        </button>
      </span>
      {menu && (
        <RowMenu
          page={page}
          top={menu.top}
          left={menu.left}
          onFavorite={onFavorite}
          onDelete={onDelete}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}

function Node({ page, pages, depth, currentId, onOpen, onCreate, onFavorite, onDelete }) {
  const kids = childrenOf(pages, page.id).filter((child) => !child.systemKey);
  const [open, setOpen] = useState(depth < 1);
  const twisty = (
    <button
      type="button"
      className="twisty"
      aria-label={kids.length ? (open ? 'Collapse' : 'Expand') : undefined}
      tabIndex={kids.length ? 0 : -1}
      onClick={() => kids.length && setOpen((value) => !value)}
    >
      {kids.length ? (open ? '▾' : '▸') : ''}
    </button>
  );

  return (
    <div>
      <PageRow
        page={page}
        currentId={currentId}
        depth={depth}
        onOpen={onOpen}
        onCreate={onCreate}
        onFavorite={onFavorite}
        onDelete={onDelete}
        twisty={twisty}
      />
      {open && kids.map((child) => (
        <Node
          key={child.id}
          page={child}
          pages={pages}
          depth={depth + 1}
          currentId={currentId}
          onOpen={onOpen}
          onCreate={onCreate}
          onFavorite={onFavorite}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

export function Sidebar({
  className = 'sidebar',
  pages,
  currentId,
  onOpen,
  onCreate,
  onFavorite,
  onDelete,
  onCollapse,
  onSearch,
  onTrash,
  trashCount = 0,
}) {
  const pagesByKey = new Map(
    withSystemPages(pages).filter((page) => page.systemKey && !page.deleted).map((page) => [page.systemKey, page])
  );
  const notes = childrenOf(pages, null).filter((page) => !page.systemKey);
  const settings = pagesByKey.get('settings') || null;

  return (
    <aside className={className} aria-label="Pages">
      <div className="side-head">
        <span className="mark" aria-hidden="true">T</span>
        <span className="grow">Tally</span>
        <button type="button" className="icon-btn" aria-label="Close sidebar" onClick={onCollapse}>«</button>
      </div>
      <button type="button" className="side-search" onClick={onSearch}>
        <span className="twisty" aria-hidden="true" />
        <span className="row-main">
          <PageIcon name="search" />
          <span className="row-label">Search</span>
        </span>
      </button>
      <div className="side-scroll">
        {NAV_GROUPS.map((group) => (
          <div key={group.label || group.keys[0]}>
            {group.label ? <div className="side-label"><span>{group.label}</span></div> : null}
            {group.keys.map((key) => {
              const page = pagesByKey.get(key);
              if (!page || !systemPageByKey(key)) return null;
              return (
                <Node
                  key={page.id}
                  page={page}
                  pages={pages}
                  depth={0}
                  currentId={currentId}
                  onOpen={onOpen}
                  onCreate={onCreate}
                  onFavorite={onFavorite}
                  onDelete={onDelete}
                />
              );
            })}
          </div>
        ))}
        <div className="side-label">
          <span>Notes</span>
          <button type="button" className="row-plus" aria-label="Add a page" onClick={() => onCreate(null)}>+</button>
        </div>
        {notes.map((page) => (
          <Node
            key={page.id}
            page={page}
            pages={pages}
            depth={0}
            currentId={currentId}
            onOpen={onOpen}
            onCreate={onCreate}
            onFavorite={onFavorite}
            onDelete={onDelete}
          />
        ))}
        {settings && (
          <div className="side-gap">
            <Node
              page={settings}
              pages={pages}
              depth={0}
              currentId={currentId}
              onOpen={onOpen}
              onCreate={onCreate}
              onFavorite={onFavorite}
              onDelete={onDelete}
            />
          </div>
        )}
      </div>
      <button type="button" className={`side-action ${currentId === '__trash__' ? 'is-on' : ''}`} onClick={onTrash}>
        <span className="twisty" aria-hidden="true" />
        <span className="row-main">
          <PageIcon name="trash" />
          <span className="row-label">Trash{trashCount ? ` ${trashCount}` : ''}</span>
        </span>
      </button>
      <button type="button" className="side-action" onClick={() => onCreate(null)}>
        <span className="twisty" aria-hidden="true" />
        <span className="row-main">
          <PageIcon name="plus" />
          <span className="row-label">New page</span>
        </span>
      </button>
    </aside>
  );
}
