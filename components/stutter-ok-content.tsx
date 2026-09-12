// Shared content for the "It's OK to Stutter" moment — reused by the onboarding step and the
// always-accessible Profile/Help entry, so the message stays identical wherever it's shown.

import { StyleSheet, Text, View } from 'react-native';

import { Fonts } from '@/constants/theme';
import { OnboardingPalette } from '@/constants/onboarding-theme';
import { FinCharacter } from '@/game-engine/FinCharacter';

export function StutterOkContent() {
  return (
    <View style={styles.container}>
      <FinCharacter state="celebrating" size={120} />
      <Text style={styles.thumbsUp}>👍</Text>
      <Text style={styles.title}>It&apos;s OK to Stutter</Text>
      <Text style={styles.body}>
        Even while you&apos;re practicing your strategies, it&apos;s completely okay to still stutter sometimes.
      </Text>
      <Text style={styles.body}>
        Worrying about it can actually make your speech feel more tense and harder to control. Thinking positively —
        and being kind to yourself — helps way more.
      </Text>
      <View style={styles.closeCard}>
        <Text style={styles.closeText}>You may still have some bumps in your speech, and that&apos;s OK! 💙</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 4,
  },
  thumbsUp: {
    fontSize: 32,
    marginTop: -8,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 26,
    fontWeight: '800',
    color: OnboardingPalette.title,
    textAlign: 'center',
    marginTop: 8,
  },
  body: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    color: OnboardingPalette.subtitle,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 12,
  },
  closeCard: {
    backgroundColor: '#EAF6FF',
    borderWidth: 2,
    borderColor: OnboardingPalette.cardBorder,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  closeText: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    fontWeight: '800',
    color: OnboardingPalette.title,
    textAlign: 'center',
    lineHeight: 22,
  },
});
