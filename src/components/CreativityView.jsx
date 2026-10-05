import { useMemo, useState } from 'react';
import { useLife } from '../context/LifeProvider';
import { groupBoardCards } from '../lib/boards';
import { noteSnippet, noteTitle, recentNotes } from '../lib/notes';

/**
 * Creativity hub — a quiet room for sparks, with doors into boards and notes.
 */
export function CreativityView({ onOpen }) {
  const { notes, addNote, boardCards } = useLife();
  const [spark, setSpark] = useState('');
  const preview = useMemo(() => recentNotes(notes, 6), [notes]);
  const boardPreview = useMemo(() => {
    const cols = groupBoardCards(boardCards);
    return cols.flatMap((col) => col.cards.map((card) => ({ ...card, columnLabel: col.label }))).slice(0, 4);
  }, [boardCards]);
  const openBoardCount = useMemo(
    () => boardCards.filter((c) => c.column !== 'done').length,
    [boardCards]
  );

  const capture = (e) => {
    e.preventDefault();
    const text = spark.trim();
    if (!text) return;
    const [first, ...rest] = text.split('\n');
    const note = addNote({
      title: first.slice(0, 80),
      body: rest.join('\n').trim() || (first.length > 80 ? text : ''),
      emoji: '✦',
      pinned: false,
    });
    setSpark('');
    onOpen?.('more', 'notes', { noteId: note.id });
  };

  return (
    <div className="view creativity-view">
      <header className="view__head">
        <p className="eyebrow">Create</p>
        <h1 className="view__title">Creativity</h1>
        <p className="creativity-view__lede">
          Catch a spark before it cools. Boards and notes wait one tap away.
        </p>
      </header>

      <form className="creativity-capture" onSubmit={capture}>
        <label className="field__label" htmlFor="spark-input">
          New spark
        </label>
        <textarea
          id="spark-input"
          className="creativity-capture__input"
          rows={4}
          value={spark}
          onChange={(e) => setSpark(e.target.value)}
          placeholder="A line, a melody, a scene, a half-baked idea…"
        />
        <button type="submit" className="btn btn--primary" disabled={!spark.trim()}>
          Keep it
        </button>
      </form>

      <section className="section life-section">
        <div className="section__head">
          <h2 className="eyebrow">Rooms</h2>
        </div>
        <ul className="creativity-doors">
          <li>
            <button type="button" className="creativity-door" onClick={() => onOpen?.('more', 'boards')}>
              <span className="creativity-door__label">Boards</span>
              <span className="creativity-door__meta">
                {openBoardCount ? `${openBoardCount} open` : 'Empty board'}
              </span>
            </button>
          </li>
          <li>
            <button type="button" className="creativity-door" onClick={() => onOpen?.('more', 'notes')}>
              <span className="creativity-door__label">Notes</span>
              <span className="creativity-door__meta">
                {notes.length ? `${notes.length} pages` : 'Blank notebook'}
              </span>
            </button>
          </li>
        </ul>
      </section>

      <section className="section life-section">
        <div className="section__head">
          <h2 className="eyebrow">Recent sparks</h2>
          <button type="button" className="text-btn" onClick={() => onOpen?.('more', 'notes')}>
            All
          </button>
        </div>
        {preview.length === 0 ? (
          <p className="quiet">Nothing captured yet — the first line becomes the title.</p>
        ) : (
          <ul className="page-list">
            {preview.map((note) => (
              <li key={note.id}>
                <button
                  type="button"
                  className="page-row"
                  onClick={() => onOpen?.('more', 'notes', { noteId: note.id })}
                >
                  <span className="page-row__mark" aria-hidden="true">
                    {note.emoji || '○'}
                  </span>
                  <span className="page-row__copy">
                    <span className="page-row__title">{noteTitle(note)}</span>
                    {noteSnippet(note.body) && (
                      <span className="page-row__meta">{noteSnippet(note.body)}</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {boardPreview.length > 0 && (
        <section className="section life-section">
          <div className="section__head">
            <h2 className="eyebrow">On the board</h2>
            <button type="button" className="text-btn" onClick={() => onOpen?.('more', 'boards')}>
              Board
            </button>
          </div>
          <ul className="page-list">
            {boardPreview.map((card) => (
              <li key={card.id}>
                <button
                  type="button"
                  className="page-row"
                  onClick={() => onOpen?.('more', 'boards')}
                >
                  <span className="page-row__mark" aria-hidden="true">
                    ▢
                  </span>
                  <span className="page-row__copy">
                    <span className="page-row__title">{card.title}</span>
                    <span className="page-row__meta">{card.columnLabel}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
