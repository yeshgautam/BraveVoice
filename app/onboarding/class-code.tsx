import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnboardingActions } from '@/components/onboarding/onboarding-actions';
import { OnboardingProgressBar } from '@/components/onboarding/progress-bar';
import { SpeechBubble } from '@/components/onboarding/speech-bubble';
import { OnboardingFonts, OnboardingPalette } from '@/constants/onboarding-theme';
import { useOnboarding } from '@/contexts/onboarding-context';

export default function ClassCodeScreen() {
  const router = useRouter();
  const { classCode, setClassCode, connectToTherapist } = useOnboarding();
  const hasCode = classCode.trim().length > 0;

  const connect = () => {
    connectToTherapist(classCode.trim());
    router.push('/onboarding/class-code-connected');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <OnboardingProgressBar step={5} />

        <View style={styles.header}>
          <SpeechBubble text="Got a code from your therapist?" style={styles.bubble} />
          <Image
            source={require('@/assets/images/fin-classcode.png')}
            style={styles.finImage}
            contentFit="contain"
          />
        </View>

        <View style={styles.fields}>
          <TextInput
            style={styles.input}
            placeholder="e.g. YG011"
            placeholderTextColor={OnboardingPalette.subtitle}
            value={classCode}
            onChangeText={(text) => setClassCode(text.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={5}
          />

          <Pressable
            disabled={!hasCode}
            style={({ pressed }) => [
              styles.connectButton,
              !hasCode && styles.connectButtonDisabled,
              pressed && hasCode && styles.buttonPressed,
            ]}
            onPress={connect}>
            <Text style={styles.connectButtonText}>Connect To Therapist</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.skipButton, pressed && styles.buttonPressed]}
            onPress={() => router.push('/onboarding/stutter-ok')}>
            <Text style={styles.skipButtonText}>Skip, I will do it later</Text>
          </Pressable>
        </View>

        <View style={styles.spacer} />

        <OnboardingActions onContinue={connect} continueDisabled={!hasCode} onBack={() => router.back()} />
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
    width: 190,
    height: 160,
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
  connectButton: {
    backgroundColor: OnboardingPalette.progressTrack,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
  },
  connectButtonDisabled: {
    opacity: 0.7,
  },
  connectButtonText: {
    fontFamily: OnboardingFonts.bodyBold,
    fontSize: 16,
    color: OnboardingPalette.buttonText,
  },
  skipButton: {
    borderWidth: 1.5,
    borderColor: OnboardingPalette.cardBorder,
    backgroundColor: OnboardingPalette.cardBackground,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
  },
  skipButtonText: {
    fontFamily: OnboardingFonts.bodySemiBold,
    fontSize: 16,
    color: OnboardingPalette.title,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  spacer: {
    flex: 1,
  },
});
