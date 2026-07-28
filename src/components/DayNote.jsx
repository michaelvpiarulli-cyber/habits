import { useEffect, useRef, useState } from 'react';
import { useData } from '../context/DataProvider';

/**
 * A line about the day.
 *
 * Collapsed to a single button until there is something to say, because an
 * always-open empty textarea on the main screen reads as a chore. Saves on blur
 * rather than behind a button — there is no wrong content, so there is nothing
 * to confirm.
 */
export function DayNote({ day }) {
  const { noteFor, setDayNote } = useData();
  const saved = noteFor(day);
  const [open, setOpen] = useState(Boolean(saved));
  const [draft, setDraft] = useState(saved);
  const area = useRef(null);

  // Adopt the stored value when the day rolls over or a sync brings one down,
  // but never clobber something being typed right now.
  useEffect(() => {
    if (document.activeElement !== area.current) setDraft(saved);
  }, [saved]);

  if (!open) {
    return (
      <button
        type="button"
        className="daynote__open"
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => area.current?.focus());
        }}
      >
        + Add a note about today
      </button>
    );
  }

  return (
    <div className="daynote">
      <label className="eyebrow" htmlFor="daynote-text">
        Note
      </label>
      <textarea
        id="daynote-text"
        ref={area}
        className="daynote__area"
        rows={2}
        value={draft}
        placeholder="How the day actually went."
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== saved) setDayNote(day, draft);
          if (!draft.trim()) setOpen(false);
        }}
      />
    </div>
  );
}
