import { StyleSheet, View } from 'react-native';

import { ONBOARDING_TOTAL_STEPS, OnboardingPalette } from '@/constants/onboarding-theme';

export function OnboardingProgressBar({ step }: { step: number }) {
  const fraction = step / ONBOARDING_TOTAL_STEPS;

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${Math.min(fraction, 1) * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    alignSelf: 'center',
    width: '70%',
    height: 6,
    borderRadius: 3,
    backgroundColor: OnboardingPalette.progressTrack,
    overflow: 'hidden',
    marginTop: 16,
    marginBottom: 32,
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: OnboardingPalette.progressActive,
  },
});
