import { useEffect, useState } from 'react';
import { CORE_NAV, LIFE_SPACES, PAGE_DETAILS, PLANNING_NAV } from '../lib/spaces';

const MORE_OPEN_KEY = 'tally.sidebar.moreOpen';

/**
 * Notion-like retractable sidebar — Habits + Planning up top,
 * secondary tools folded under More.
 */
export function SideNav({ tab, morePage, onNavigate, open, onClose, onToggle }) {
  const [moreOpen, setMoreOpen] = useState(() => {
    try {
      return localStorage.getItem(MORE_OPEN_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(MORE_OPEN_KEY, moreOpen ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [moreOpen]);

  const activeSpace = morePage ? spaceIdForPage(morePage) : null;
  const moreSpace = LIFE_SPACES.find((s) => s.id === 'more-tools');
  const habitTools = LIFE_SPACES.find((s) => s.id === 'habits-tools');

  const go = (target) => {
    onNavigate(target);
    // Mobile drawer closes after navigate; desktop stays open unless collapsed.
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 899px)').matches) {
      onClose?.();
    }
  };

  return (
    <>
      <button
        type="button"
        className={`side-nav__scrim ${open ? 'is-open' : ''}`}
        aria-label="Close sidebar"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
      />
      <aside
        id="side-nav"
        className={`side-nav ${open ? 'is-open' : ''}`}
        aria-label="Workspace"
        aria-hidden={!open}
      >
        <header className="side-nav__head">
          <div className="side-nav__brand">
            <span className="side-nav__wordmark">
              Tally<span className="wordmark__dot" aria-hidden="true">.</span>
            </span>
          </div>
          <button
            type="button"
            className="side-nav__collapse"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            onClick={onToggle || onClose}
          >
            <CollapseIcon />
          </button>
        </header>

        <nav className="side-nav__scroll">
          <section className="side-nav__group">
            <ul className="side-nav__list">
              {CORE_NAV.map((item) => {
                const on = tab === item.id && !morePage;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`side-nav__item ${on ? 'is-on' : ''}`}
                      aria-current={on ? 'page' : undefined}
                      onClick={() => go({ tab: item.id })}
                    >
                      <span className="side-nav__item-label">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="side-nav__group">
            <h3 className="side-nav__group-label">Planning</h3>
            <ul className="side-nav__list">
              {PLANNING_NAV.map((item) => {
                const on =
                  item.kind === 'tab'
                    ? tab === (item.id === 'planning' ? 'more' : item.id) && !morePage
                    : tab === 'more' && morePage === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`side-nav__item ${on ? 'is-on' : ''}`}
                      aria-current={on ? 'page' : undefined}
                      onClick={() => {
                        if (item.kind === 'tab') {
                          go({ tab: item.id === 'planning' ? 'more' : item.id });
                        } else {
                          go({ tab: 'more', page: item.id });
                        }
                      }}
                    >
                      <span className="side-nav__item-label">{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {habitTools && (
            <section
              className={`side-nav__group ${activeSpace === habitTools.id ? 'is-active-space' : ''}`}
            >
              <h3 className="side-nav__group-label">{habitTools.label}</h3>
              <ul className="side-nav__list">
                {habitTools.pages.map((page) => {
                  const on = tab === 'more' && morePage === page.id;
                  return (
                    <li key={page.id}>
                      <button
                        type="button"
                        className={`side-nav__item ${on ? 'is-on' : ''}`}
                        aria-current={on ? 'page' : undefined}
                        onClick={() => go({ tab: 'more', page: page.id })}
                      >
                        <span className="side-nav__item-label">{page.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {moreSpace && (
            <section
              className={`side-nav__group side-nav__group--fold ${activeSpace === moreSpace.id ? 'is-active-space' : ''}`}
            >
              <button
                type="button"
                className="side-nav__fold"
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen((v) => !v)}
              >
                <span className="side-nav__group-label">More</span>
                <span className={`side-nav__chevron ${moreOpen ? 'is-open' : ''}`} aria-hidden="true">
                  ▾
                </span>
              </button>
              {moreOpen && (
                <ul className="side-nav__list">
                  {moreSpace.pages.map((page) => {
                    const on = tab === 'more' && morePage === page.id;
                    return (
                      <li key={page.id}>
                        <button
                          type="button"
                          className={`side-nav__item ${on ? 'is-on' : ''}`}
                          aria-current={on ? 'page' : undefined}
                          onClick={() => go({ tab: 'more', page: page.id })}
                        >
                          <span className="side-nav__item-label">{page.label}</span>
                          <span className="side-nav__item-detail">
                            {PAGE_DETAILS[page.id] || ''}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
        </nav>
      </aside>
    </>
  );
}

function spaceIdForPage(pageId) {
  const space = LIFE_SPACES.find((s) => s.pages.some((p) => p.id === pageId));
  return space?.id || null;
}

function CollapseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M5 3h8v1H5V3zm0 4.5h8v1H5v-1zM5 12h8v1H5v-1zM2.5 3.5v9l-1.5-1.5V5z"
        fill="currentColor"
      />
    </svg>
  );
}
