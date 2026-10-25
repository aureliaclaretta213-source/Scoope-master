/**
 * Android Vibration / Haptic Feedback Utility
 * Gracefully checks for navigator.vibrate support.
 */

export const triggerHaptic = (pattern: number | number[]) => {
  if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore if blocked by browser policy
    }
  }
};

export const haptics = {
  light: () => triggerHaptic(12),
  medium: () => triggerHaptic(25),
  heavy: () => triggerHaptic(45),
  scoopClink: () => triggerHaptic([15, 20, 15]),
  scoopPlunge: () => triggerHaptic([35, 25, 45]),
  chuteScore: () => triggerHaptic([20, 30, 40]),
  victory: () => triggerHaptic([60, 40, 100, 50, 160]),
  hazard: () => triggerHaptic([80, 50, 80]),
};
