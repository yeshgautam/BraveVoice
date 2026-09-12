import { StyleSheet, Text, View, ViewStyle } from 'react-native';

import { OnboardingFonts, OnboardingPalette } from '@/constants/onboarding-theme';

export function SpeechBubble({ text, style }: { text: string; style?: ViewStyle }) {
  return (
    <View style={[styles.bubble, style]}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    backgroundColor: OnboardingPalette.speechBubble,
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: OnboardingFonts.bodySemiBold,
    fontSize: 17,
    color: OnboardingPalette.title,
    lineHeight: 22,
  },
});
