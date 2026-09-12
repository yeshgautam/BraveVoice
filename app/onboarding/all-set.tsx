import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect } from 'react';

import { OnboardingActions } from '@/components/onboarding/onboarding-actions';
import { OnboardingProgressBar } from '@/components/onboarding/progress-bar';
import { SpeechBubble } from '@/components/onboarding/speech-bubble';
import { OnboardingFonts, OnboardingPalette } from '@/constants/onboarding-theme';
import { useOnboarding } from '@/contexts/onboarding-context';

export default function AllSetScreen() {
  const router = useRouter();
  const { mode } = useOnboarding();

  const bounce = useSharedValue(0);
  const wiggle = useSharedValue(0);

  useEffect(() => {
    bounce.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 700, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );
    wiggle.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 350, easing: Easing.inOut(Easing.sin) }),
        withTiming(4, { duration: 700, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 350, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );
  }, [bounce, wiggle]);

  const finStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounce.value }, { rotate: `${wiggle.value}deg` }],
  }));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <OnboardingProgressBar step={9} />

        <View style={styles.textHeader}>
          <Text style={styles.title}>You&apos;re all set!</Text>
          <Text style={styles.subtitle}>Fin will be here whenever you need help</Text>
        </View>

        <View style={styles.middle}>
          <View style={styles.finRow}>
            <Animated.Image
              source={require('@/assets/images/fin-allset.png')}
              style={[styles.finImage, finStyle]}
              resizeMode="contain"
            />
            <SpeechBubble text="You did it! Let's start practicing!" style={styles.bubble} />
          </View>
        </View>

        <OnboardingActions
          continueLabel="Let's Go!"
          onContinue={() =>
            router.replace(mode === 'older' ? '/(tabs)/games' : '/(tabs)')
          }
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
  textHeader: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  title: {
    fontFamily: OnboardingFonts.title,
    fontSize: 26,
    color: OnboardingPalette.title,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: OnboardingFonts.bodySemiBold,
    fontSize: 15,
    color: OnboardingPalette.subtitle,
    textAlign: 'center',
    marginTop: 8,
  },
  middle: {
    flex: 1,
    justifyContent: 'center',
  },
  finRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  finImage: {
    width: 170,
    height: 219,
  },
  bubble: {
    flex: 1,
    marginLeft: 4,
    marginTop: 28,
  },
});
