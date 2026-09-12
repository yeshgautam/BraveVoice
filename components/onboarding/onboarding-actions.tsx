import { Pressable, StyleSheet, Text } from 'react-native';

import { OnboardingFonts, OnboardingPalette } from '@/constants/onboarding-theme';

type Props = {
  continueLabel?: string;
  onContinue: () => void;
  continueDisabled?: boolean;
  onBack?: () => void;
  backDisabled?: boolean;
};

export function OnboardingActions({
  continueLabel = 'Continue',
  onContinue,
  continueDisabled = false,
  onBack,
  backDisabled = false,
}: Props) {
  return (
    <>
      <Pressable
        disabled={continueDisabled}
        style={({ pressed }) => [
          styles.button,
          continueDisabled && styles.buttonDisabled,
          pressed && !continueDisabled && styles.buttonPressed,
        ]}
        onPress={onContinue}>
        <Text style={styles.buttonText}>{continueLabel}</Text>
      </Pressable>
      <Pressable
        disabled={backDisabled || !onBack}
        style={({ pressed }) => [
          styles.backButton,
          (backDisabled || !onBack) && styles.backButtonDisabled,
          pressed && !backDisabled && !!onBack && styles.buttonPressed,
        ]}
        onPress={onBack}>
        <Text style={[styles.buttonText, styles.backButtonText]}>Back</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: OnboardingPalette.button,
    borderRadius: 32,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: OnboardingPalette.buttonDisabled,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontFamily: OnboardingFonts.bodyBold,
    fontSize: 17,
    color: OnboardingPalette.buttonText,
  },
  backButton: {
    backgroundColor: OnboardingPalette.progressTrack,
    borderRadius: 32,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  backButtonDisabled: {
    opacity: 0.6,
  },
  backButtonText: {
    color: OnboardingPalette.subtitle,
  },
});
