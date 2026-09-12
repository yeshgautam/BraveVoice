import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnboardingProgressBar } from '@/components/onboarding/progress-bar';
import { SpeechBubble } from '@/components/onboarding/speech-bubble';
import { OnboardingFonts, OnboardingPalette as PALETTE } from '@/constants/onboarding-theme';

const BUBBLE_TEXT = "Hi! I'm Fin! Let's get you set up!";

export default function OnboardingWelcomeScreen() {
  const router = useRouter();

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

  useEffect(() => {
    let cancelled = false;

    Speech.getAvailableVoicesAsync().then((voices) => {
      if (cancelled) return;
      const ava = voices.find((v) => v.name.toLowerCase() === 'ava' && v.language.startsWith('en'));
      Speech.speak(BUBBLE_TEXT, {
        pitch: 1.15,
        rate: 0.85,
        voice: ava?.identifier,
      });
    });

    return () => {
      cancelled = true;
      Speech.stop();
    };
  }, []);

  const finStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounce.value }, { rotate: `${wiggle.value}deg` }],
  }));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <OnboardingProgressBar step={1} />

        <View style={styles.header}>
          <Text style={styles.title}>Welcome to BraveVoice</Text>
          <Text style={styles.subtitle}>A speech practice app that makes talking feel like a game</Text>
        </View>

        <View style={styles.middle}>
          <View style={styles.finRow}>
            <Animated.Image
              source={require('@/assets/images/fin-character.png')}
              style={[styles.finImage, finStyle]}
              resizeMode="contain"
            />
            <SpeechBubble text={BUBBLE_TEXT} style={styles.speechBubble} />
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={() => router.push('/onboarding/who-are-you')}>
          <Text style={styles.buttonText}>Let&apos;s get started</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PALETTE.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  title: {
    fontFamily: OnboardingFonts.title,
    fontSize: 26,
    color: PALETTE.title,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: OnboardingFonts.bodySemiBold,
    fontSize: 15,
    color: PALETTE.subtitle,
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
    height: 179,
  },
  speechBubble: {
    flex: 1,
    marginLeft: 4,
    marginTop: 28,
  },
  button: {
    backgroundColor: PALETTE.button,
    borderRadius: 32,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    fontFamily: OnboardingFonts.bodyBold,
    fontSize: 17,
    color: PALETTE.buttonText,
  },
});
