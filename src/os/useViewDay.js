import { useCallback, useEffect, useState } from 'react';
import { todayISO } from '../lib/dates';
import { readViewDay, searchForViewDay } from '../lib/viewDay';

/** The day in `?date=`, kept in sync with the browser history. */
export function useViewDay() {
  const [today, setToday] = useState(todayISO);
  const [day, setDay] = useState(() => readViewDay(window.location.search, todayISO()));

  useEffect(() => {
    const sync = () => {
      const now = todayISO();
      setToday(now);
      setDay(readViewDay(window.location.search, now));
    };
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const go = useCallback((next) => {
    const now = todayISO();
    const search = searchForViewDay(window.location.search, next, now);
    const url = `${window.location.pathname}${search}${window.location.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (url !== current) window.history.pushState(null, '', url);
    setToday(now);
    setDay(readViewDay(search || '', now));
  }, []);

  return { day, today, go, isToday: day === today };
}
