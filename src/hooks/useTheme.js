import { useCallback, useEffect, useState } from 'react';

const KEY = 'tally-theme'; // 'light' | 'dark' | 'system'

const systemPrefersDark = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-color-scheme: dark)').matches;

function resolveDark(pref) {
  return pref === 'dark' || (pref === 'system' && systemPrefersDark());
}

function apply(pref) {
  const dark = resolveDark(pref);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  // Keep the mobile browser chrome in step with the page.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#0F1216' : '#ECEDE7');
  return dark;
}

/** Theme preference: follow the system, or pin light/dark. */
export function useTheme() {
  const [pref, setPref] = useState(() => localStorage.getItem(KEY) || 'system');
  const [isDark, setIsDark] = useState(() => resolveDark(localStorage.getItem(KEY) || 'system'));

  useEffect(() => {
    setIsDark(apply(pref));
    localStorage.setItem(KEY, pref);

    if (pref !== 'system' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setIsDark(apply('system'));
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [pref]);

  /** Cycle light → dark → system. */
  const cycle = useCallback(() => {
    setPref((p) => (p === 'light' ? 'dark' : p === 'dark' ? 'system' : 'light'));
  }, []);

  return { pref, setPref, isDark, cycle };
}
