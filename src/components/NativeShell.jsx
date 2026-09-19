import { useEffect } from 'react';
import { isNativeApp, isStandaloneDisplay } from '../lib/install';

/**
 * Home-screen / native chrome: safe-area class, plus Capacitor status bar
 * and splash when running inside the iOS shell.
 */
export function NativeShell({ isDark }) {
  useEffect(() => {
    const on = isStandaloneDisplay() || isNativeApp();
    document.documentElement.classList.toggle('is-app', on);
    return () => document.documentElement.classList.remove('is-app');
  }, []);

  useEffect(() => {
    if (!isNativeApp()) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        const { SplashScreen } = await import('@capacitor/splash-screen');
        if (cancelled) return;
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
        await SplashScreen.hide();
      } catch {
        /* plugins only exist in the native build */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isDark]);

  return null;
}

