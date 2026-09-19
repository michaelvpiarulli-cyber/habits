/**
 * Tiny device feedback for the daily loop. Desktop and unsupported browsers
 * no-op. The action always completes without it — this is the stamp, not the
 * press.
 *
 * On a Capacitor iPhone build this uses the native Taptic Engine. Safari still
 * falls back to `navigator.vibrate`, which iOS often ignores.
 */
export function feelTap(kind = 'tick') {
  void tap(kind);
}

async function tap(kind) {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (Capacitor.isNativePlatform()) {
      const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
      if (kind === 'treat') {
        await Haptics.notification({ type: NotificationType.Success });
        return;
      }
      const style = kind === 'close' ? ImpactStyle.Medium : ImpactStyle.Light;
      await Haptics.impact({ style });
      return;
    }
  } catch {
    /* plugin missing in web-only builds */
  }

  try {
    const pattern =
      kind === 'treat' ? [10, 28, 14, 28, 36] : kind === 'close' ? [10, 16, 22] : kind === 'undo' ? 6 : 8;
    navigator.vibrate?.(pattern);
  } catch {
    /* ignore */
  }
}
