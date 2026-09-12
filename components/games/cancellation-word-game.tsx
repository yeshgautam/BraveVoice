import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { bestStarsToTier, TIER_STYLES } from '@/components/games/game-badge';
import { Fonts } from '@/constants/theme';
import { OnboardingPalette } from '@/constants/onboarding-theme';
import { CategoryKey, useProgress } from '@/contexts/progress-context';
import { useStutterDetector } from '@/hooks/use-stutter-detector';
import { StutterType } from '@/modules/stutter-detector';
import {
  getFeedbackMessage,
  getFeedbackTier,
  scoreCancellationPause,
  scoreCancellationRetryOnset,
  wordMatches,
} from '@/utils/speech-analysis';

export const WORDS_PER_ROUND = 7;
// Ceiling per listen segment (finish or retry), not a silence-based cutoff — continuous ASR
// mode here doesn't auto-stop on trailing silence, and the deliberate pause between the two
// segments happens entirely with the mic off (see proceedToPause), so this just needs to be
// generous enough for one word.
const GRACE_MS = 5500;
const PAUSE_MS = 2000;
const VOLUME_INTERVAL_MS = 100;
const BAR_COUNT = 5;
const ONSET_SAMPLE_CAP = 3;
// Little Voices (young mode) spans ages 4-7 — Cancellations games only appear in that
// mode. There's no per-child age field in onboarding state, so this is a representative
// default for the native detector's age-based sensitivity curve.
const DEFAULT_AGE_YEARS = 6;
const STUTTER_SETTLE_MS = 300;

export type CancellationStep = 'finish' | 'pause' | 'retry';

export type CancellationVisualProps = {
  completedIndices: boolean[];
  activeIndex: number;
  step: CancellationStep | null;
};

export type CancellationWordGameProps = {
  gameKey: string;
  categoryKey: CategoryKey;
  title: string;
  words: string[];
  wordEmojis: string[];
  hint: string;
  micHint?: string;
  resultCompleteText: string;
  resultPartialText?: (score: number) => string;
  formatScore?: (completedCount: number) => string;
  renderVisual: (props: CancellationVisualProps) => ReactNode;
  renderFinale?: (ctx: { score: number; stars: number; badgeUnlock: string | null; onPlayAgain: () => void }) => ReactNode;
};

type Phase = 'ready-finish' | 'listening-finish' | 'pausing' | 'ready-retry' | 'listening-retry' | 'success' | 'finished';

export function CancellationWordGame({
  gameKey,
  categoryKey,
  title,
  words,
  wordEmojis,
  hint,
  micHint,
  resultCompleteText,
  resultPartialText,
  formatScore,
  renderVisual,
  renderFinale,
}: CancellationWordGameProps) {
  const router = useRouter();
  const { recordGameResult, gameStats } = useProgress();

  const [phase, setPhase] = useState<Phase>('ready-finish');
  const [wordIndex, setWordIndex] = useState(0);
  const [completedIndices, setCompletedIndices] = useState<boolean[]>(Array(WORDS_PER_ROUND).fill(false));
  const [score, setScore] = useState(0);
  const [bars, setBars] = useState<number[]>(Array(BAR_COUNT).fill(6));
  const [pauseCountdown, setPauseCountdown] = useState(2);
  const [resultStars, setResultStars] = useState(0);
  const [badgeUnlock, setBadgeUnlock] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [successStep, setSuccessStep] = useState<'finish' | 'retry'>('finish');
  const [permissionDenied, setPermissionDenied] = useState(false);

  const phaseRef = useRef<Phase>('ready-finish');
  const wordIndexRef = useRef(0);
  const matchedRef = useRef(false);
  const attemptNumberRef = useRef(0);
  const pauseStartRef = useRef(0);
  const retryOnsetSamplesRef = useRef<number[]>([]);
  const strategyScoresRef = useRef<number[]>([]);
  const sessionStartRef = useRef(Date.now());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Real on-device stutter detection (iOS only, native module). When unavailable, the
  // cancellation ritual runs unconditionally on every word, same as before.
  const stutterOccurredRef = useRef(false);
  const stutterCountsRef = useRef({ blocks: 0, repetitions: 0, prolongations: 0 });
  const stutterDetector = useStutterDetector({
    onSpeechResult: (event) => {
      if (phaseRef.current !== 'listening-finish' && phaseRef.current !== 'listening-retry') return;
      if (matchedRef.current) return;
      if (wordMatches(event.transcript, words[wordIndexRef.current])) {
        matchedRef.current = true;
        if (phaseRef.current === 'listening-finish') {
          handleFinishStepComplete();
        } else {
          handleRetryMatched();
        }
      }
    },
    onStutterDetected: (event) => {
      if (phaseRef.current === 'listening-finish' || phaseRef.current === 'listening-retry') {
        stutterOccurredRef.current = true;
        incrementStutterCount(event.type);
      }
    },
    onAmplitudeChange: (event) => {
      if (phaseRef.current !== 'listening-finish' && phaseRef.current !== 'listening-retry') return;
      // The native module reports true dB (~-40 to 0); rescale onto the ~0-10 range the
      // existing onset-scoring formulas and waveform bars were calibrated against.
      const normalized = Math.max(0, Math.min(10, (event.amplitude + 40) / 4));
      if (phaseRef.current === 'listening-retry' && retryOnsetSamplesRef.current.length < ONSET_SAMPLE_CAP) {
        retryOnsetSamplesRef.current = [...retryOnsetSamplesRef.current, normalized];
      }
      setBars((prev) => [...prev.slice(1), Math.max(6, Math.min(46, 6 + normalized * 4))]);
    },
  });

  const incrementStutterCount = (type: StutterType) => {
    if (type === 'block') stutterCountsRef.current.blocks += 1;
    else if (type === 'repetition') stutterCountsRef.current.repetitions += 1;
    else if (type === 'prolongation') stutterCountsRef.current.prolongations += 1;
  };

  const micScale = useSharedValue(1);
  const pauseScale = useSharedValue(1);

  useEffect(() => {
    if (phase === 'listening-finish' || phase === 'listening-retry') {
      micScale.value = withRepeat(withSequence(withTiming(1.15, { duration: 400 }), withTiming(1, { duration: 400 })), -1, true);
    } else {
      micScale.value = withTiming(1, { duration: 200 });
    }
  }, [phase, micScale]);

  useEffect(() => {
    if (phase === 'pausing') {
      pauseScale.value = withRepeat(withSequence(withTiming(1.12, { duration: 700 }), withTiming(1, { duration: 700 })), -1, true);
    }
  }, [phase, pauseScale]);

  const micAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: micScale.value }] }));
  const pauseAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: pauseScale.value }] }));

  useSpeechRecognitionEvent('result', (event) => {
    if ((phaseRef.current !== 'listening-finish' && phaseRef.current !== 'listening-retry') || matchedRef.current) return;
    const transcript = event.results[0]?.transcript ?? '';
    if (wordMatches(transcript, words[wordIndexRef.current])) {
      matchedRef.current = true;
      if (phaseRef.current === 'listening-finish') {
        handleFinishMatched();
      } else {
        handleRetryMatched();
      }
    }
  });

  useSpeechRecognitionEvent('volumechange', (event) => {
    if (phaseRef.current !== 'listening-finish' && phaseRef.current !== 'listening-retry') return;
    if (phaseRef.current === 'listening-retry' && retryOnsetSamplesRef.current.length < ONSET_SAMPLE_CAP) {
      retryOnsetSamplesRef.current = [...retryOnsetSamplesRef.current, event.value];
    }
    setBars((prev) => [...prev.slice(1), Math.max(6, Math.min(46, 6 + event.value * 4))]);
  });

  const startListening = async (mode: 'finish' | 'retry') => {
    if (stutterDetector.isSupported) {
      const granted = await stutterDetector.requestPermissions();
      if (!granted) {
        setPermissionDenied(true);
        return;
      }
      matchedRef.current = false;
      stutterOccurredRef.current = false;
      setFeedbackMessage('');
      setBars(Array(BAR_COUNT).fill(6));
      if (mode === 'retry') retryOnsetSamplesRef.current = [];
      const nextPhase: Phase = mode === 'finish' ? 'listening-finish' : 'listening-retry';
      setPhase(nextPhase);
      phaseRef.current = nextPhase;

      stutterDetector.setTargetWord(words[wordIndexRef.current], DEFAULT_AGE_YEARS);
      stutterDetector.startListening();

      timeoutRef.current = setTimeout(() => {
        if (!matchedRef.current) {
          stutterDetector.stopListening();
          handleCycleFailed();
        }
      }, GRACE_MS);
      return;
    }

    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      setPermissionDenied(true);
      return;
    }
    matchedRef.current = false;
    setFeedbackMessage('');
    setBars(Array(BAR_COUNT).fill(6));
    if (mode === 'retry') retryOnsetSamplesRef.current = [];
    const nextPhase: Phase = mode === 'finish' ? 'listening-finish' : 'listening-retry';
    setPhase(nextPhase);
    phaseRef.current = nextPhase;

    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: true,
      volumeChangeEventOptions: { enabled: true, intervalMillis: VOLUME_INTERVAL_MS },
    });

    timeoutRef.current = setTimeout(() => {
      if (!matchedRef.current) {
        ExpoSpeechRecognitionModule.stop();
        handleCycleFailed();
      }
    }, GRACE_MS);
  };

  /** Manual stop — always available while listening, regardless of the automatic GRACE_MS
   * ceiling. Waits a brief window for a match that was already in flight before treating the
   * attempt as unmatched, so a tap right as the child finishes the word doesn't race the
   * recognizer's own 'result' event. */
  const stopListening = () => {
    if (phaseRef.current !== 'listening-finish' && phaseRef.current !== 'listening-retry') return;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (stutterDetector.isSupported) {
      stutterDetector.stopListening();
    } else {
      ExpoSpeechRecognitionModule.stop();
    }
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      if (!matchedRef.current) {
        handleCycleFailed();
      }
    }, 500);
  };

  const handleCycleFailed = () => {
    attemptNumberRef.current += 1;
    const tier = getFeedbackTier(0, attemptNumberRef.current);
    setFeedbackMessage(getFeedbackMessage(tier));
    setPhase('ready-finish');
    phaseRef.current = 'ready-finish';

    if (tier === 'skip') {
      attemptNumberRef.current = 0;
      setTimeout(() => {
        setFeedbackMessage('');
        advanceWord();
      }, 1400);
    }
  };

  const advanceWord = () => {
    const index = wordIndexRef.current;
    if (index + 1 >= WORDS_PER_ROUND) {
      finishGame();
    } else {
      const nextIndex = index + 1;
      setWordIndex(nextIndex);
      wordIndexRef.current = nextIndex;
      setPhase('ready-finish');
      phaseRef.current = 'ready-finish';
    }
  };

  const proceedToPause = () => {
    setPhase('pausing');
    phaseRef.current = 'pausing';
    setPauseCountdown(2);
    pauseStartRef.current = Date.now();

    let remaining = 2;
    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1;
      setPauseCountdown(remaining);
      if (remaining <= 0) {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        setPhase('ready-retry');
        phaseRef.current = 'ready-retry';
      }
    }, PAUSE_MS / 2);
  };

  /** Fallback path (no native detector) — every finished word runs the cancellation ritual. */
  const handleFinishMatched = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    ExpoSpeechRecognitionModule.stop();
    proceedToPause();
  };

  /** Native path — only run the ritual if a real stutter was actually caught on this attempt. */
  const handleFinishStepComplete = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
    // A trailing block can resolve just after the transcript match fires — give it a
    // brief moment to land before deciding whether this attempt was clean.
    settleTimeoutRef.current = setTimeout(() => {
      stutterDetector.stopListening();
      if (stutterOccurredRef.current) {
        proceedToPause();
      } else {
        handleCleanFinishSuccess();
      }
    }, STUTTER_SETTLE_MS);
  };

  /** Said the word smoothly on the first try — no cancellation technique needed. */
  const handleCleanFinishSuccess = () => {
    const index = wordIndexRef.current;
    attemptNumberRef.current = 0;
    setFeedbackMessage(getFeedbackMessage('excellent'));
    setSuccessStep('finish');
    setPhase('success');
    phaseRef.current = 'success';
    setScore((s) => s + 1);
    strategyScoresRef.current.push(100);
    setCompletedIndices((prev) => {
      const next = [...prev];
      next[index] = true;
      return next;
    });

    setTimeout(() => {
      advanceWord();
    }, 700);
  };

  const handleRetryMatched = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (stutterDetector.isSupported) {
      stutterDetector.stopListening();
    } else {
      ExpoSpeechRecognitionModule.stop();
    }

    const index = wordIndexRef.current;

    // 4-part rubric: finish (25) + pause in range (25) + smooth retry onset (25) + retry recognized (25)
    const pauseDurationMs = Date.now() - pauseStartRef.current;
    const retryOnsetScore =
      stutterDetector.isSupported && stutterOccurredRef.current
        ? 5 // the retry itself was still bumpy — minimal onset credit
        : scoreCancellationRetryOnset(retryOnsetSamplesRef.current);
    const totalScore = 25 + scoreCancellationPause(pauseDurationMs) + retryOnsetScore + 25;
    attemptNumberRef.current = 0;
    strategyScoresRef.current.push(totalScore);
    setFeedbackMessage(getFeedbackMessage(getFeedbackTier(totalScore, 1)));
    setSuccessStep('retry');

    setPhase('success');
    phaseRef.current = 'success';
    setScore((s) => s + 1);
    setCompletedIndices((prev) => {
      const next = [...prev];
      next[index] = true;
      return next;
    });

    setTimeout(() => {
      advanceWord();
    }, 700);
  };

  const finishGame = () => {
    setScore((finalScore) => {
      const stars = finalScore >= 7 ? 3 : finalScore >= 6 ? 2 : finalScore >= 5 ? 1 : 0;
      setResultStars(stars);
      const prevPlays = gameStats[gameKey]?.plays ?? 0;
      setBadgeUnlock(prevPlays === 0 && stars >= 1 ? TIER_STYLES[bestStarsToTier(stars)].label : null);

      const scores = strategyScoresRef.current;
      const avgStrategyScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length / 100 : 0;
      const durationSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);
      const { blocks, repetitions, prolongations } = stutterCountsRef.current;

      recordGameResult({
        gameKey,
        categoryKey,
        stars,
        gameName: title,
        wordsAttempted: WORDS_PER_ROUND,
        wordsCorrect: finalScore,
        durationSeconds,
        strategyScore: avgStrategyScore,
        stutterEvents: stutterDetector.isSupported
          ? { total: blocks + repetitions + prolongations, blocks, repetitions, prolongations }
          : undefined,
      });
      setPhase('finished');
      phaseRef.current = 'finished';
      return finalScore;
    });
  };

  const resetGame = () => {
    setPhase('ready-finish');
    phaseRef.current = 'ready-finish';
    setWordIndex(0);
    wordIndexRef.current = 0;
    attemptNumberRef.current = 0;
    stutterOccurredRef.current = false;
    stutterCountsRef.current = { blocks: 0, repetitions: 0, prolongations: 0 };
    strategyScoresRef.current = [];
    sessionStartRef.current = Date.now();
    setCompletedIndices(Array(WORDS_PER_ROUND).fill(false));
    setScore(0);
    setResultStars(0);
    setBadgeUnlock(null);
    setFeedbackMessage('');
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (settleTimeoutRef.current) clearTimeout(settleTimeoutRef.current);
      ExpoSpeechRecognitionModule.stop();
      stutterDetector.stopListening();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentWord = words[wordIndex];
  const currentEmoji = wordEmojis[wordIndex];
  const step: CancellationStep | null =
    phase === 'ready-finish' || phase === 'listening-finish'
      ? 'finish'
      : phase === 'pausing'
        ? 'pause'
        : phase === 'ready-retry' || phase === 'listening-retry'
          ? 'retry'
          : phase === 'success'
            ? successStep
            : null;
  const isListening = phase === 'listening-finish' || phase === 'listening-retry';
  const micDisabled = phase !== 'ready-finish' && phase !== 'ready-retry' && !isListening;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {permissionDenied ? (
        <View style={styles.resultContainer}>
          <Image source={require('@/assets/images/fin-character.png')} style={styles.resultFin} resizeMode="contain" />
          <Text style={styles.resultTitle}>Oh no!</Text>
          <Text style={styles.resultSubtitle}>
            We need your microphone to play! Ask a grown-up to help turn it on in Settings.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.backToGamesButton, pressed && styles.pressed]}
            onPress={() => router.back()}>
            <Text style={styles.backToGamesButtonText}>Back to Games</Text>
          </Pressable>
        </View>
      ) : phase !== 'finished' ? (
        <>
          <View style={styles.topBar}>
            <Pressable
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
              onPress={() => router.back()}>
              <Text style={styles.backButtonText}>← Back</Text>
            </Pressable>
            <Text style={styles.screenTitle}>{title}</Text>
            <Text style={styles.scoreText}>{formatScore ? formatScore(score) : `${score} / ${WORDS_PER_ROUND}`}</Text>
          </View>

          <View style={styles.wordCard}>
            <View style={styles.wordIllustration}>
              <Text style={styles.wordIllustrationEmoji}>{currentEmoji}</Text>
            </View>
            <View style={styles.wordTextColumn}>
              <Text style={styles.wordText}>{currentWord}</Text>
              <Text style={styles.wordHint}>{hint}</Text>
            </View>
          </View>

          <View style={styles.stepRow}>
            <View style={[styles.stepPill, step === 'finish' && styles.stepPillActive]}>
              <Text style={[styles.stepPillText, step === 'finish' && styles.stepPillTextActive]}>1. Finish ✓</Text>
            </View>
            <View style={[styles.stepPill, step === 'pause' && styles.stepPillActive]}>
              <Text style={[styles.stepPillText, step === 'pause' && styles.stepPillTextActive]}>2. Pause ⏸</Text>
            </View>
            <View style={[styles.stepPill, step === 'retry' && styles.stepPillActive]}>
              <Text style={[styles.stepPillText, step === 'retry' && styles.stepPillTextActive]}>3. Try again 🔄</Text>
            </View>
          </View>

          <View style={styles.gameArea}>
            {renderVisual({ completedIndices, activeIndex: wordIndex, step })}

            {phase === 'pausing' && (
              <View style={styles.pauseOverlay} pointerEvents="none">
                <Animated.View style={[styles.pauseCircle, pauseAnimatedStyle]}>
                  <Text style={styles.pauseCircleText}>{pauseCountdown}</Text>
                </Animated.View>
                <Text style={styles.pauseLabel}>Pause and breathe…</Text>
              </View>
            )}
          </View>

          <View style={styles.bottomSection}>
            {isListening && (
              <View style={styles.waveformRow}>
                {bars.map((height, i) => (
                  <View key={i} style={[styles.waveformBar, { height }]} />
                ))}
              </View>
            )}
            <Animated.View style={micAnimatedStyle}>
              <Pressable
                style={({ pressed }) => [styles.micButton, isListening && styles.micButtonActive, pressed && styles.pressed]}
                disabled={micDisabled}
                onPress={isListening ? stopListening : () => startListening(step === 'retry' ? 'retry' : 'finish')}>
                <Text style={styles.micIcon}>🎤</Text>
              </Pressable>
            </Animated.View>
            <Text style={styles.tapToSpeak}>
              {phase === 'pausing'
                ? 'Take a breath…'
                : isListening
                  ? 'Listening…'
                  : feedbackMessage
                    ? feedbackMessage
                    : step === 'retry'
                      ? 'Now say it smooth!'
                      : micHint ?? 'Tap to speak!'}
            </Text>
          </View>
        </>
      ) : renderFinale ? (
        renderFinale({ score, stars: resultStars, badgeUnlock, onPlayAgain: resetGame })
      ) : (
        <View style={styles.resultContainer}>
          <Image source={require('@/assets/images/fin-allset.png')} style={styles.resultFin} resizeMode="contain" />
          <Text style={styles.resultTitle}>Amazing! 🎉</Text>
          <Text style={styles.resultStars}>{'⭐'.repeat(resultStars) || '💪'}</Text>
          <Text style={styles.resultSubtitle}>
            {score >= WORDS_PER_ROUND
              ? resultCompleteText
              : (resultPartialText ?? ((s: number) => `You got ${s} of ${WORDS_PER_ROUND}!`))(score)}
          </Text>

          {badgeUnlock && (
            <View style={styles.badgeCard}>
              <Text style={styles.badgeCardEmoji}>🏅</Text>
              <Text style={styles.badgeCardText}>New badge unlocked! {title} {badgeUnlock} 🏅</Text>
            </View>
          )}

          <Pressable style={({ pressed }) => [styles.playAgainButton, pressed && styles.pressed]} onPress={resetGame}>
            <Text style={styles.playAgainButtonText}>Play Again</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.backToGamesButton, pressed && styles.pressed]}
            onPress={() => router.back()}>
            <Text style={styles.backToGamesButtonText}>Back to Games</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: OnboardingPalette.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: OnboardingPalette.progressActive,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  backButtonText: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    fontWeight: '700',
    color: OnboardingPalette.progressActive,
  },
  screenTitle: {
    fontFamily: Fonts.rounded,
    fontSize: 20,
    fontWeight: '800',
    color: OnboardingPalette.title,
  },
  scoreText: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '600',
    color: OnboardingPalette.subtitle,
    minWidth: 64,
    textAlign: 'right',
  },
  pressed: {
    opacity: 0.85,
  },
  wordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#C8DFF0',
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: 12,
    padding: 12,
    gap: 12,
  },
  wordIllustration: {
    width: 70,
    height: 70,
    borderRadius: 18,
    backgroundColor: OnboardingPalette.speechBubble,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordIllustrationEmoji: {
    fontSize: 36,
  },
  wordTextColumn: {
    flex: 1,
  },
  wordText: {
    fontFamily: Fonts.rounded,
    fontSize: 22,
    fontWeight: '800',
    color: OnboardingPalette.title,
    textTransform: 'capitalize',
  },
  wordHint: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    color: OnboardingPalette.subtitle,
    marginTop: 3,
  },
  stepRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 10,
  },
  stepPill: {
    flex: 1,
    backgroundColor: OnboardingPalette.speechBubble,
    borderRadius: 12,
    paddingVertical: 6,
    alignItems: 'center',
  },
  stepPillActive: {
    backgroundColor: OnboardingPalette.progressActive,
  },
  stepPillText: {
    fontFamily: Fonts.rounded,
    fontSize: 10.5,
    fontWeight: '700',
    color: OnboardingPalette.progressActive,
  },
  stepPillTextActive: {
    color: '#FFFFFF',
  },
  gameArea: {
    flex: 1,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  pauseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  pauseCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: OnboardingPalette.progressActive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseCircleText: {
    fontFamily: Fonts.rounded,
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pauseLabel: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    fontWeight: '700',
    color: OnboardingPalette.title,
    marginTop: 12,
  },
  bottomSection: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    height: 46,
    marginBottom: 10,
  },
  waveformBar: {
    width: 6,
    borderRadius: 3,
    backgroundColor: '#E8724A',
  },
  micButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#E8724A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B8492C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  micButtonActive: {
    backgroundColor: '#D65A38',
  },
  micIcon: {
    fontSize: 30,
  },
  tapToSpeak: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    color: OnboardingPalette.subtitle,
    marginTop: 8,
  },
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  resultFin: {
    width: 170,
    height: 219,
  },
  resultTitle: {
    fontFamily: Fonts.rounded,
    fontSize: 36,
    fontWeight: '800',
    color: OnboardingPalette.title,
    marginTop: 8,
  },
  resultStars: {
    fontSize: 32,
    marginTop: 12,
  },
  resultSubtitle: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    color: OnboardingPalette.subtitle,
    textAlign: 'center',
    marginTop: 8,
  },
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FCEFC7',
    borderWidth: 2,
    borderColor: '#F0B429',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginTop: 20,
  },
  badgeCardEmoji: {
    fontSize: 24,
  },
  badgeCardText: {
    flex: 1,
    fontFamily: Fonts.rounded,
    fontSize: 14,
    fontWeight: '700',
    color: '#8B6A0E',
  },
  playAgainButton: {
    backgroundColor: OnboardingPalette.progressActive,
    borderRadius: 32,
    paddingVertical: 16,
    paddingHorizontal: 48,
    marginTop: 24,
  },
  playAgainButtonText: {
    fontFamily: Fonts.rounded,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  backToGamesButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: OnboardingPalette.progressActive,
    borderRadius: 32,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginTop: 12,
  },
  backToGamesButtonText: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    fontWeight: '700',
    color: OnboardingPalette.progressActive,
  },
});
