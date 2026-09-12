import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnboardingActions } from '@/components/onboarding/onboarding-actions';
import { OnboardingProgressBar } from '@/components/onboarding/progress-bar';
import { SpeechBubble } from '@/components/onboarding/speech-bubble';
import { OnboardingFonts, OnboardingPalette } from '@/constants/onboarding-theme';
import { OnboardingMode, useOnboarding } from '@/contexts/onboarding-context';

const MODE_OPTIONS: { value: OnboardingMode; title: string; subtitle: string }[] = [
  { value: 'young', title: 'Age 4-7', subtitle: 'Play, practice and have fun' },
  { value: 'older', title: 'Age 8 and over', subtitle: 'Level up your speaking skills' },
];

export default function ModeSelectScreen() {
  const router = useRouter();
  const { mode, setMode } = useOnboarding();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <OnboardingProgressBar step={4} />

        <View style={styles.header}>
          <Image
            source={require('@/assets/images/fin-modeselect.png')}
            style={styles.finImage}
            contentFit="contain"
          />
          <SpeechBubble text="Which mode fits best?" style={styles.bubble} />
        </View>

        <View style={styles.options}>
          {MODE_OPTIONS.map((option) => {
            const selected = mode === option.value;
            return (
              <Pressable
                key={option.value}
                style={[styles.card, selected && styles.cardSelected]}
                onPress={() => setMode(option.value)}>
                <Text style={[styles.cardTitle, selected && styles.cardTitleSelected]}>{option.title}</Text>
                <Text style={styles.cardSubtitle}>{option.subtitle}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.spacer} />

        <OnboardingActions
          onContinue={() => router.push('/onboarding/class-code')}
          continueDisabled={!mode}
          onBack={() => router.back()}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: OnboardingPalette.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  finImage: {
    width: 150,
    height: 202,
  },
  bubble: {
    marginTop: 8,
    maxWidth: '48%',
  },
  options: {
    marginTop: 32,
    flexDirection: 'row',
    gap: 14,
  },
  card: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: OnboardingPalette.cardBorder,
    backgroundColor: OnboardingPalette.cardBackground,
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  cardSelected: {
    borderColor: OnboardingPalette.cardBorderSelected,
  },
  cardTitle: {
    fontFamily: OnboardingFonts.bodyBold,
    fontSize: 17,
    color: OnboardingPalette.title,
    textAlign: 'center',
  },
  cardTitleSelected: {
    color: OnboardingPalette.cardBorderSelected,
  },
  cardSubtitle: {
    fontFamily: OnboardingFonts.bodyRegular,
    fontSize: 13,
    color: OnboardingPalette.subtitle,
    textAlign: 'center',
    marginTop: 6,
  },
  spacer: {
    flex: 1,
  },
});
