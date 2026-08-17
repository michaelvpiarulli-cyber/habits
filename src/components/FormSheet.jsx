import { useEffect } from 'react';

export function FormSheet({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="sheet__scrim" onClick={onClose} aria-label="Close" />
      <div className="sheet__panel">
        <header className="sheet__head">
          <h2 className="sheet__title">{title}</h2>
          <button type="button" className="sheet__close" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="sheet__body">{children}</div>
      </div>
    </div>
  );
}

export function SubpageBar({ title, onBack }) {
  return (
    <div className="subpage">
      <button type="button" className="subpage__back" onClick={onBack} aria-label="Back">
        ‹
      </button>
      <h1 className="subpage__title">{title}</h1>
    </div>
  );
}
