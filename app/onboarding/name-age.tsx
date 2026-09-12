import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnboardingActions } from '@/components/onboarding/onboarding-actions';
import { OnboardingProgressBar } from '@/components/onboarding/progress-bar';
import { SpeechBubble } from '@/components/onboarding/speech-bubble';
import { OnboardingFonts, OnboardingPalette } from '@/constants/onboarding-theme';
import { useOnboarding } from '@/contexts/onboarding-context';

export default function NameAgeScreen() {
  const router = useRouter();
  const { username, setUsername } = useOnboarding();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <OnboardingProgressBar step={3} />

        <View style={styles.header}>
          <SpeechBubble text="What's your username?" style={styles.bubble} />
          <Image
            source={require('@/assets/images/fin-nameage.png')}
            style={styles.finImage}
            contentFit="contain"
          />
        </View>

        <View style={styles.fields}>
          <TextInput
            style={styles.input}
            placeholder="Enter username e.g. YG011"
            placeholderTextColor={OnboardingPalette.subtitle}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>

        <View style={styles.spacer} />

        <OnboardingActions
          onContinue={() => router.push('/onboarding/mode-select')}
          continueDisabled={!username.trim()}
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
    maxWidth: '44%',
  },
  finImage: {
    width: 200,
    height: 194,
  },
  fields: {
    marginTop: 32,
    gap: 14,
  },
  input: {
    borderWidth: 1.5,
    borderColor: OnboardingPalette.cardBorder,
    backgroundColor: OnboardingPalette.cardBackground,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 20,
    fontFamily: OnboardingFonts.bodySemiBold,
    fontSize: 16,
    color: OnboardingPalette.title,
  },
  spacer: {
    flex: 1,
  },
});
