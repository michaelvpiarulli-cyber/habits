/**
 * Tiny device feedback for the daily loop. Desktop and unsupported browsers
 * no-op. The action always completes without it — this is the stamp, not the
 * press.
 */
export function feelTap(kind = 'tick') {
  try {
    const pattern = kind === 'close' ? [10, 16, 22] : kind === 'undo' ? 6 : 8;
    navigator.vibrate?.(pattern);
  } catch {
    /* ignore */
  }
}
