import { isNativeApp } from './install.js';

export function registerServiceWorker() {
  if (typeof window === 'undefined' || isNativeApp()) return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* private mode / missing file in dev */
    });
  });
}
