import { useCallback, useEffect, useState } from 'react';

const KEY = 'tally-theme'; // 'light' | 'dark' | 'system'

function apply() {
  document.documentElement.setAttribute('data-theme', 'dark');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', '#04070e');
}

/** Theme preference: follow the system, or pin light/dark. Defaults to light. */
export function useTheme() {
  const [pref, setPref] = useState(() => localStorage.getItem(KEY) || 'light');

  useEffect(() => {
    apply();
    localStorage.setItem(KEY, pref);

    if (pref !== 'system' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [pref]);

  const isDark = true;

  /** Cycle light → dark → system. */
  const cycle = useCallback(() => {
    setPref((p) => (p === 'light' ? 'dark' : p === 'dark' ? 'system' : 'light'));
  }, []);

  return { pref, setPref, isDark, cycle };
}
