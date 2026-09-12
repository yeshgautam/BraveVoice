// One-time mic calibration: Fin asks the child to say "Hi Fin!" so we can (a) confirm the mic
// actually works before they hit a game and hit a wall, and (b) capture this device's ambient
// noise floor as a baseline that every recording pipeline in the app seeds its automatic-gain
// normalization from afterward, instead of guessing from a fixed constant on the first attempt.
// Skippable — a quiet or shy first try shouldn't block onboarding; games fall back to the
// shared default calibration if this was never completed.

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LiveWaveform } from '@/components/games/live-waveform';
import { OnboardingActions } from '@/components/onboarding/onboarding-actions';
import { OnboardingProgressBar } from '@/components/onboarding/progress-bar';
import { SpeechBubble } from '@/components/onboarding/speech-bubble';
import { OnboardingFonts, OnboardingPalette } from '@/constants/onboarding-theme';
import { useMicCalibration } from '@/contexts/mic-calibration-context';
import { FinCharacter } from '@/game-engine/FinCharacter';
import { useVoiceRecorder } from '@/game-engine/useVoiceRecorder';

const MIC_CHECK_MAX_DURATION_MS = 5000;

export default function MicCheckOnboardingScreen() {
  const router = useRouter();
  const { calibrated, setBaseline } = useMicCalibration();
  const [noSpeechNote, setNoSpeechNote] = useState(false);
  const recorder = useVoiceRecorder({ endMode: 'auto', maxDurationMs: MIC_CHECK_MAX_DURATION_MS });

  const micScale = useSharedValue(1);
  const micAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: micScale.value }] }));

  const handleMicPress = async () => {
    if (recorder.isRecording) {
      recorder.stop();
      return;
    }
    if (recorder.isPrepping) return;
    setNoSpeechNote(false);
    micScale.value = withRepeat(withSequence(withTiming(1.12, { duration: 380 }), withTiming(1, { duration: 380 })), -1, true);
    const result = await recorder.start();
    micScale.value = withTiming(1, { duration: 200 });
    if (recorder.permissionDenied || result.interrupted) return;
    if (result.noSpeechDetected) {
      setNoSpeechNote(true);
      return;
    }
    setBaseline(result.ambientFloorDb);
  };

  const finState = recorder.isProcessing ? 'thinking' : recorder.isRecording ? 'listening' : calibrated ? 'celebrating' : 'idle';

  const statusText = recorder.isPrepping
    ? 'Get ready…'
    : recorder.isRecording
      ? 'Listening…'
      : recorder.isProcessing
        ? 'Thinking…'
        : calibrated
          ? "Got it — your mic's all set! 🎉"
          : noSpeechNote
            ? "Didn't quite catch that — want to try again?"
            : 'Say "Hi Fin!" so I know your mic is working';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <OnboardingProgressBar step={8} />

        <View style={styles.textHeader}>
          <Text style={styles.title}>Let&apos;s check your mic</Text>
        </View>

        <View style={styles.middle}>
          <View style={styles.finRow}>
            <FinCharacter state={finState} size={150} />
            <SpeechBubble text={statusText} style={styles.bubble} />
          </View>

          {recorder.isRecording && (
            <View style={styles.waveformSlot}>
              <LiveWaveform levels={recorder.liveWaveform} color={OnboardingPalette.progressActive} height={40} />
            </View>
          )}

          <Animated.View style={micAnimatedStyle}>
            <Pressable
              style={({ pressed }) => [
                styles.micButton,
                recorder.isRecording && styles.micButtonActive,
                pressed && styles.pressed,
              ]}
              disabled={recorder.isPrepping || recorder.isProcessing}
              onPress={handleMicPress}>
              <Text style={styles.micIcon}>🎤</Text>
            </Pressable>
          </Animated.View>
        </View>

        <OnboardingActions
          continueLabel={calibrated ? 'Continue' : 'Skip for now'}
          onContinue={() => router.push('/onboarding/all-set')}
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
  middle: {
    flex: 1,
    justifyContent: 'center',
  },
  finRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bubble: {
    flex: 1,
    marginLeft: 4,
    marginTop: 28,
  },
  waveformSlot: {
    marginTop: 20,
    minHeight: 40,
    justifyContent: 'center',
  },
  micButton: {
    alignSelf: 'center',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: OnboardingPalette.progressActive,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  micButtonActive: {
    opacity: 0.88,
  },
  micIcon: {
    fontSize: 30,
  },
  pressed: {
    opacity: 0.85,
  },
});
