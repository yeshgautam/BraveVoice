// Drop-in pre-game gate: shows the friendly explanation before the OS prompt, then a clear
// "no mic access" screen with a Settings deep-link if denied. Renders children only once
// permission is actually granted.

import { Image } from 'expo-image';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { OnboardingPalette } from '@/constants/onboarding-theme';
import { useMicPermissions } from '@/game-engine/useMicPermissions';

export function MicPermissionGate({
  children,
  includeSpeechRecognition = false,
}: {
  children: ReactNode;
  /** Young-mode games use speech recognition in addition to plain mic access — request both
   * through the one friendly explanation instead of surprising the child with a second dialog
   * mid-game. */
  includeSpeechRecognition?: boolean;
}) {
  const { state, requestPermission, openSettings } = useMicPermissions({ includeSpeechRecognition });

  if (state === 'checking') {
    return <View style={styles.safeArea} />;
  }

  if (state === 'granted') {
    return <>{children}</>;
  }

  if (state === 'denied') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Image source={require('@/assets/images/fin-character.png')} style={styles.finImage} contentFit="contain" />
          <Text style={styles.title}>We need your mic!</Text>
          <Text style={styles.body}>
            BraveVoice listens to your practice so it can cheer you on. Mic access is turned off right now — a
            grown-up can turn it back on in Settings.
          </Text>
          <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={openSettings}>
            <Text style={styles.primaryButtonText}>Open Settings</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // not-asked — friendly explanation before the OS dialog appears.
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.center}>
        <Image source={require('@/assets/images/fin-character.png')} style={styles.finImage} contentFit="contain" />
        <Text style={styles.title}>Let's hear you practice!</Text>
        <Text style={styles.body}>
          This game listens to you say each word so Fin knows when you did it. Tap below and say "Allow" when your
          phone asks.
        </Text>
        <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Turn On Mic</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: OnboardingPalette.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  finImage: {
    width: 170,
    height: 219,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 26,
    fontWeight: '800',
    color: OnboardingPalette.title,
    marginTop: 12,
    textAlign: 'center',
  },
  body: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    color: OnboardingPalette.subtitle,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 21,
  },
  primaryButton: {
    backgroundColor: OnboardingPalette.progressActive,
    borderRadius: 32,
    paddingVertical: 16,
    paddingHorizontal: 48,
    marginTop: 24,
  },
  primaryButtonText: {
    fontFamily: Fonts.rounded,
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.85,
  },
});
