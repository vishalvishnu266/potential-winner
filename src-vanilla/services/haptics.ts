/**
 * Haptics service — the only place `@capacitor/haptics` is called.
 *
 * On web/desktop, `navigator.vibrate` is used as a graceful fallback.
 * All methods swallow errors — haptics are cosmetic, never critical.
 */

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

const isNative = (): boolean => Capacitor.isNativePlatform();

async function impact(style: ImpactStyle, webMs: number): Promise<void> {
  try {
    if (isNative()) await Haptics.impact({ style });
    else if ('vibrate' in navigator) navigator.vibrate(webMs);
  } catch { /* noop */ }
}

export const haptics = {
  light:  () => impact(ImpactStyle.Light,  10),
  medium: () => impact(ImpactStyle.Medium, 20),
  heavy:  () => impact(ImpactStyle.Heavy,  30),
  async success(): Promise<void> {
    try {
      if (isNative()) await Haptics.notification({ type: NotificationType.Success });
      else if ('vibrate' in navigator) navigator.vibrate([12, 40, 12]);
    } catch { /* noop */ }
  },
  async warning(): Promise<void> {
    try {
      if (isNative()) await Haptics.notification({ type: NotificationType.Warning });
      else if ('vibrate' in navigator) navigator.vibrate([20, 40, 20]);
    } catch { /* noop */ }
  },
  async error(): Promise<void> {
    try {
      if (isNative()) await Haptics.notification({ type: NotificationType.Error });
      else if ('vibrate' in navigator) navigator.vibrate([30, 60, 30]);
    } catch { /* noop */ }
  },
  async selection(): Promise<void> {
    try {
      if (isNative()) await Haptics.selectionChanged();
      else if ('vibrate' in navigator) navigator.vibrate(5);
    } catch { /* noop */ }
  },
};
