// Thin, semantic wrapper over expo-haptics so games call `haptics.success()` instead of
// re-deriving "which ImpactFeedbackStyle means what" in every file.

import * as Haptics from 'expo-haptics';
import { useCallback, useMemo } from 'react';

function fireImpact(style: Haptics.ImpactFeedbackStyle) {
  Haptics.impactAsync(style).catch(() => {
    // Haptics are a nice-to-have; never let a missing-hardware/permission glitch break gameplay.
  });
}

function fireNotification(type: Haptics.NotificationFeedbackType) {
  Haptics.notificationAsync(type).catch(() => {});
}

export function useHaptics() {
  const light = useCallback(() => fireImpact(Haptics.ImpactFeedbackStyle.Light), []);
  const medium = useCallback(() => fireImpact(Haptics.ImpactFeedbackStyle.Medium), []);
  const success = useCallback(() => fireNotification(Haptics.NotificationFeedbackType.Success), []);
  const tryAgain = useCallback(() => fireImpact(Haptics.ImpactFeedbackStyle.Soft), []);

  return useMemo(() => ({ light, medium, success, tryAgain }), [light, medium, success, tryAgain]);
}
