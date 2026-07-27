import { useCallback, useEffect, useState } from 'react';

const KEY = 'tally-theme'; // 'light' | 'dark' | 'system'

const systemPrefersDark = () =>
  window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

function apply(pref) {
  const dark = pref === 'dark' || (pref === 'system' && systemPrefersDark());
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  // Keep the mobile browser chrome in step with the page.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#0F1216' : '#ECEDE7');
}

/** Theme preference: follow the system, or pin light/dark. */
export function useTheme() {
  const [pref, setPref] = useState(() => localStorage.getItem(KEY) || 'system');

  useEffect(() => {
    apply(pref);
    localStorage.setItem(KEY, pref);

    if (pref !== 'system' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [pref]);

  const isDark = pref === 'dark' || (pref === 'system' && systemPrefersDark());

  /** Cycle light → dark → system. */
  const cycle = useCallback(() => {
    setPref((p) => (p === 'light' ? 'dark' : p === 'dark' ? 'system' : 'light'));
  }, []);

  return { pref, setPref, isDark, cycle };
}
