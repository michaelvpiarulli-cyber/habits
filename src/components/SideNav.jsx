import { CORE_NAV, LIFE_SPACES, PAGE_DETAILS, spaceForPage } from '../lib/spaces';

/**
 * Left tool rail — every space and page in one calm map.
 * Desktop: persistent. Mobile: drawer opened from the top bar.
 */
export function SideNav({ tab, morePage, onNavigate, open, onClose }) {
  const activeSpace = morePage ? spaceForPage(morePage)?.id : null;

  const go = (target) => {
    onNavigate(target);
    onClose?.();
  };

  return (
    <>
      <button
        type="button"
        className={`side-nav__scrim ${open ? 'is-open' : ''}`}
        aria-label="Close tools"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
      />
      <aside id="side-nav" className={`side-nav ${open ? 'is-open' : ''}`} aria-label="Tools">
        <header className="side-nav__head">
          <div>
            <p className="eyebrow">Tools</p>
            <h2 className="side-nav__title">Spaces</h2>
          </div>
          <button type="button" className="side-nav__close text-btn" onClick={onClose}>
            Close
          </button>
        </header>

        <p className="side-nav__hint">
          Spaces group your tools. Open a tool to create — todos, notes, boards, books, habits.
        </p>

        <nav className="side-nav__scroll">
          <section className="side-nav__group">
            <h3 className="side-nav__group-label">Daily loop</h3>
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
                      <span className="side-nav__item-detail">{item.detail}</span>
                    </button>
                  </li>
                );
              })}
              <li>
                <button
                  type="button"
                  className={`side-nav__item ${tab === 'more' && !morePage ? 'is-on' : ''}`}
                  aria-current={tab === 'more' && !morePage ? 'page' : undefined}
                  onClick={() => go({ tab: 'more' })}
                >
                  <span className="side-nav__item-label">Life home</span>
                  <span className="side-nav__item-detail">Pulse and shortcuts</span>
                </button>
              </li>
            </ul>
          </section>

          {LIFE_SPACES.map((space) => (
            <section
              key={space.id}
              className={`side-nav__group ${activeSpace === space.id ? 'is-active-space' : ''}`}
            >
              <h3 className="side-nav__group-label">{space.label}</h3>
              <p className="side-nav__group-blurb">{space.blurb}</p>
              <ul className="side-nav__list">
                {space.pages.map((page) => {
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
            </section>
          ))}
        </nav>
      </aside>
    </>
  );
}
