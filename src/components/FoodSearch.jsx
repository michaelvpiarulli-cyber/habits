import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  parseFoodQuery,
  searchFoods,
  searchLocalFoods,
  withSearchQuantity,
  DEFAULT_SEARCH_LIMIT,
  FOOD_UNIVERSE,
} from '../lib/foodSearch';
import { rememberLibraryFoods } from '../lib/foodLibrary';
import { recentBoost, rememberFood, suggestRecentFoods } from '../lib/recentFoods';

/**
 * Type-ahead food search. Empty focus shows recent foods; typing merges
 * local catalog + USDA + Open Food Facts (3.5M+). Supports "3 eggs".
 */
export function FoodSearch({
  onPick,
  placeholder = 'Search foods…',
  autoFocus = false,
  showRecents = true,
  compact = false,
}) {
  const listId = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [recents, setRecents] = useState(() => suggestRecentFoods());
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const abortRef = useRef(null);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const typedQuantity = useMemo(() => parseFoodQuery(query).quantity, [query]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults([]);
      setLoading(false);
      if (showRecents) setRecents(suggestRecentFoods());
      return undefined;
    }

    const { quantity } = parseFoodQuery(q);
    const local = searchLocalFoods(q, DEFAULT_SEARCH_LIMIT)
      .map((food) => ({ food, boost: recentBoost(food) }))
      .sort((a, b) => b.boost - a.boost)
      .map(({ food }) => withSearchQuantity(food, quantity));
    setResults(local);
    setOpen(true);
    setActive(0);
    setLoading(true);

    const handle = window.setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      searchFoods(q, { signal: controller.signal, limit: DEFAULT_SEARCH_LIMIT })
        .then((foods) => {
          if (!controller.signal.aborted) {
            const ranked = foods
              .map((food) => ({ food, boost: recentBoost(food) }))
              .sort((a, b) => b.boost - a.boost)
              .map(({ food }) => food);
            setResults(ranked);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 180);

    return () => {
      window.clearTimeout(handle);
      abortRef.current?.abort();
    };
  }, [query, showRecents]);

  useEffect(() => {
    const onPointer = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, []);

  const pick = (food) => {
    if (!food) return;
    rememberFood(food);
    rememberLibraryFoods([food]);
    setRecents(suggestRecentFoods());
    onPick?.(food);
    setQuery('');
    setResults([]);
    setOpen(false);
    setLoading(false);
  };

  const suggestions = query.trim() ? results : showRecents ? recents : [];
  const showingRecents = !query.trim() && showRecents && recents.length > 0;

  const onKeyDown = (event) => {
    if (!open || suggestions.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      pick(suggestions[active]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className={`food-search ${compact ? 'food-search--compact' : ''}`} ref={wrapRef}>
      <label className="nutrition__field">
        <span className="nutrition__label">{compact ? 'Quick add' : 'Search'}</span>
        <span className="nutrition__control nutrition__control--wide">
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              open && suggestions[active] ? `${listId}-${active}` : undefined
            }
            value={query}
            placeholder={placeholder}
            autoComplete="off"
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => {
              if (showRecents) setRecents(suggestRecentFoods());
              setOpen(true);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
          />
        </span>
      </label>

      {open && (suggestions.length > 0 || loading) && (
        <ul className="food-search__list" id={listId} role="listbox">
          {showingRecents && (
            <li className="food-search__status">Recent — tap to log again</li>
          )}
          {suggestions.map((food, index) => (
            <li key={`${food.id}-${index}`} role="option" aria-selected={index === active}>
              <button
                type="button"
                id={`${listId}-${index}`}
                className={`food-search__option ${index === active ? 'is-active' : ''}`}
                onMouseEnter={() => setActive(index)}
                onClick={() => pick(food)}
              >
                <span className="food-search__name">
                  {typedQuantity !== 1 && query.trim() ? `${typedQuantity} × ` : ''}
                  {food.name}
                </span>
                <span className="food-search__meta">
                  {typedQuantity !== 1 && query.trim()
                    ? `${typedQuantity} × ${food.serving || 'serving'}`
                    : food.serving}
                  {food.brand && food.brand !== 'Generic' ? ` · ${food.brand}` : ''}
                  {food.recentCount > 1 ? ` · ×${food.recentCount}` : ''}
                </span>
                <span className="food-search__macros">
                  {food.calories} kcal · {food.protein}g P
                </span>
              </button>
            </li>
          ))}
          {loading && results.length === 0 && query.trim() && (
            <li className="food-search__status">
              Searching {FOOD_UNIVERSE.label} foods…
            </li>
          )}
          {loading && results.length > 0 && (
            <li className="food-search__status">
              Pulling more from {FOOD_UNIVERSE.label} database…
            </li>
          )}
          {!loading && query.trim() && suggestions.length > 0 && (
            <li className="food-search__status food-search__status--quiet">
              Local + USDA + Open Food Facts
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
