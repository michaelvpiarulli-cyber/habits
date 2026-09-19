/**
 * How Tally is running: Safari tab, home-screen web app, or native Capacitor shell.
 */

function env(win) {
  if (win) return win;
  if (typeof window !== 'undefined') return window;
  return undefined;
}

export function isNativeApp(win) {
  try {
    const w = env(win);
    return Boolean(w?.Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

export function isStandaloneDisplay(win) {
  const w = env(win);
  if (!w) return false;
  if (w.navigator?.standalone === true) return true;
  return Boolean(w.matchMedia?.('(display-mode: standalone)')?.matches);
}

export function isIosDevice(win) {
  const nav = env(win)?.navigator;
  if (!nav) return false;
  const ua = nav.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return nav.platform === 'MacIntel' && nav.maxTouchPoints > 1;
}

/** Safari on iPhone/iPad that is not yet installed as an app. */
export function needsIosInstallHint(win) {
  return isIosDevice(win) && !isStandaloneDisplay(win) && !isNativeApp(win);
}
