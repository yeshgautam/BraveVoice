import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnboardingActions } from '@/components/onboarding/onboarding-actions';
import { OnboardingProgressBar } from '@/components/onboarding/progress-bar';
import { SpeechBubble } from '@/components/onboarding/speech-bubble';
import { OnboardingFonts, OnboardingPalette } from '@/constants/onboarding-theme';
import { useOnboarding } from '@/contexts/onboarding-context';

export default function ClassCodeConnectedScreen() {
  const router = useRouter();
  const { therapistName: connectedTherapistName } = useOnboarding();
  const therapistName = connectedTherapistName ?? 'Your Therapist';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <OnboardingProgressBar step={6} />

        <SpeechBubble text={`Connected to ${therapistName}!`} />

        <View style={styles.middle}>
          <View style={styles.avatarColumn}>
            <Image
              source={require('@/assets/images/fin-avatar.png')}
              style={styles.avatar}
              contentFit="contain"
            />
            <View style={styles.classPill}>
              <Text style={styles.classPillText}>{therapistName} Class</Text>
            </View>
          </View>

          <Image
            source={require('@/assets/images/fin-classcode-connected.png')}
            style={styles.finImage}
            contentFit="contain"
          />
        </View>

        <OnboardingActions
          onContinue={() => router.push('/onboarding/stutter-ok')}
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
  middle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarColumn: {
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 90,
    height: 88,
  },
  classPill: {
    backgroundColor: OnboardingPalette.progressTrack,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  classPillText: {
    fontFamily: OnboardingFonts.bodySemiBold,
    fontSize: 13,
    color: OnboardingPalette.title,
  },
  finImage: {
    width: 200,
    height: 280,
  },
});
