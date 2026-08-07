import { useEffect, useId, useRef, useState } from 'react';
import { searchFoods, searchLocalFoods } from '../lib/foodSearch';

/**
 * Type-ahead food search. Local hits show instantly; USDA results fill in.
 */
export function FoodSearch({ onPick, placeholder = 'Type a food…' }) {
  const listId = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const abortRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      setLoading(false);
      return undefined;
    }

    // Instant local matches while the network search runs.
    setResults(searchLocalFoods(q, 8));
    setOpen(true);
    setActive(0);
    setLoading(true);

    const handle = window.setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      searchFoods(q, { signal: controller.signal, limit: 8 })
        .then((foods) => {
          if (!controller.signal.aborted) {
            setResults(foods);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 220);

    return () => {
      window.clearTimeout(handle);
      abortRef.current?.abort();
    };
  }, [query]);

  useEffect(() => {
    const onPointer = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, []);

  const pick = (food) => {
    if (!food) return;
    onPick?.(food);
    setQuery('');
    setResults([]);
    setOpen(false);
    setLoading(false);
  };

  const onKeyDown = (event) => {
    if (!open || results.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      pick(results[active]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="food-search" ref={wrapRef}>
      <label className="nutrition__field">
        <span className="nutrition__label">Add food</span>
        <span className="nutrition__control nutrition__control--wide">
          <input
            type="search"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
            value={query}
            placeholder={placeholder}
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => query.trim() && setOpen(true)}
            onKeyDown={onKeyDown}
          />
        </span>
      </label>

      {open && (results.length > 0 || loading) && (
        <ul className="food-search__list" id={listId} role="listbox">
          {results.map((food, index) => (
            <li key={`${food.id}-${index}`} role="option" aria-selected={index === active}>
              <button
                type="button"
                id={`${listId}-${index}`}
                className={`food-search__option ${index === active ? 'is-active' : ''}`}
                onMouseEnter={() => setActive(index)}
                onClick={() => pick(food)}
              >
                <span className="food-search__name">{food.name}</span>
                <span className="food-search__meta">
                  {food.serving}
                  {food.brand && food.brand !== 'Generic' ? ` · ${food.brand}` : ''}
                </span>
                <span className="food-search__macros">
                  {food.calories} kcal · {food.protein}g P
                </span>
              </button>
            </li>
          ))}
          {loading && results.length === 0 && (
            <li className="food-search__status">Looking up foods…</li>
          )}
          {loading && results.length > 0 && (
            <li className="food-search__status">Searching USDA…</li>
          )}
        </ul>
      )}
    </div>
  );
}
