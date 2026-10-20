import { useState } from 'react';
import { childrenOf, favoritePages } from '../lib/pages';

function Node({ page, pages, depth, currentId, onOpen, onCreate }) {
  const kids = childrenOf(pages, page.id);
  const [open, setOpen] = useState(depth < 1);
  return (
    <div>
      <div className={`tree-row ${currentId === page.id ? 'is-on' : ''}`} style={{ paddingLeft: 6 + depth * 14 }}>
        <button type="button" className="twisty" aria-label={open ? 'Collapse' : 'Expand'} onClick={() => setOpen((value) => !value)}>
          {kids.length ? (open ? '▾' : '▸') : ''}
        </button>
        <button type="button" className="grow" onClick={() => onOpen(page.id)}>
          <span className="emoji" aria-hidden="true">{page.icon || '📄'}</span>
          {page.title || 'Untitled'}
        </button>
        <button type="button" className="row-plus" aria-label={`New subpage under ${page.title}`} onClick={() => onCreate(page.id)}>+</button>
      </div>
      {open && kids.map((child) => (
        <Node key={child.id} page={child} pages={pages} depth={depth + 1} currentId={currentId} onOpen={onOpen} onCreate={onCreate} />
      ))}
    </div>
  );
}

export function Sidebar({ className = 'sidebar', pages, currentId, onOpen, onCreate, onCollapse, onSearch, onTrash, trashCount = 0 }) {
  const favorites = favoritePages(pages);
  const roots = childrenOf(pages, null);

  return (
    <aside className={className} aria-label="Pages">
      <div className="side-head">
        <span className="mark" aria-hidden="true">T</span>
        <span className="grow">Tally</span>
        <button type="button" className="icon-btn" aria-label="Close sidebar" onClick={onCollapse}>«</button>
      </div>
      <button type="button" className="side-search" onClick={onSearch}>Search</button>
      <div className="side-scroll">
        {favorites.length > 0 && (
          <>
            <p className="side-label">Favorites</p>
            {favorites.map((page) => (
              <button key={page.id} type="button" className={`tree-row ${currentId === page.id ? 'is-on' : ''}`} onClick={() => onOpen(page.id)}>
                <span className="emoji" aria-hidden="true">{page.icon || '📄'}</span>
                <span className="grow">{page.title || 'Untitled'}</span>
              </button>
            ))}
          </>
        )}
        <p className="side-label">Private</p>
        {roots.map((page) => (
          <Node key={page.id} page={page} pages={pages} depth={0} currentId={currentId} onOpen={onOpen} onCreate={onCreate} />
        ))}
      </div>
      <button type="button" className={`side-action ${currentId === '__trash__' ? 'is-on' : ''}`} onClick={onTrash}>Trash{trashCount ? ` ${trashCount}` : ''}</button>
      <button type="button" className="side-action" onClick={() => onCreate(null)}>+ New page</button>
    </aside>
  );
}
