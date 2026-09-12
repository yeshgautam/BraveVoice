import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnboardingActions } from '@/components/onboarding/onboarding-actions';
import { OnboardingProgressBar } from '@/components/onboarding/progress-bar';
import { SpeechBubble } from '@/components/onboarding/speech-bubble';
import { OnboardingFonts, OnboardingPalette } from '@/constants/onboarding-theme';
import { OnboardingRole, useOnboarding } from '@/contexts/onboarding-context';

const ROLE_OPTIONS: { value: OnboardingRole; label: string }[] = [
  { value: 'child', label: "I'm a Child" },
  { value: 'parent', label: "I'm a Parent" },
  { value: 'therapist', label: "I'm a Therapist" },
];

export default function WhoAreYouScreen() {
  const router = useRouter();
  const { role, setRole } = useOnboarding();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <OnboardingProgressBar step={2} />

        <View style={styles.header}>
          <SpeechBubble text="Who's using BraveVoice today?" style={styles.bubble} />
          <Image
            source={require('@/assets/images/fin-whoareyou.png')}
            style={styles.finImage}
            contentFit="contain"
          />
        </View>

        <View style={styles.options}>
          {ROLE_OPTIONS.map((option) => {
            const selected = role === option.value;
            return (
              <Pressable
                key={option.value}
                style={[styles.card, selected && styles.cardSelected]}
                onPress={() => setRole(option.value)}>
                <Text style={[styles.cardText, selected && styles.cardTextSelected]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.spacer} />

        <OnboardingActions
          onContinue={() =>
            router.push(
              role === 'therapist' ? '/therapist' : role === 'parent' ? '/parent' : '/onboarding/name-age'
            )
          }
          continueDisabled={!role}
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
  bubble: {
    marginTop: 24,
    maxWidth: '48%',
  },
  finImage: {
    width: 180,
    height: 159,
  },
  options: {
    marginTop: 32,
    gap: 14,
  },
  card: {
    borderWidth: 1.5,
    borderColor: OnboardingPalette.cardBorder,
    backgroundColor: OnboardingPalette.cardBackground,
    borderRadius: 18,
    paddingVertical: 20,
    alignItems: 'center',
  },
  cardSelected: {
    borderColor: OnboardingPalette.cardBorderSelected,
  },
  cardText: {
    fontFamily: OnboardingFonts.bodyBold,
    fontSize: 17,
    color: OnboardingPalette.title,
  },
  cardTextSelected: {
    color: OnboardingPalette.cardBorderSelected,
  },
  spacer: {
    flex: 1,
  },
});
