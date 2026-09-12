// Shared shell for every young-mode ("under-8") game. Word-correctness verification needs real
// speech-to-text, which the amplitude-only engine the rest of the app uses (useSpeechMetric)
// fundamentally can't provide — so this keeps expo-speech-recognition for that one thing, while
// everything else (permission flow, prep beat, manual stop, long silence/duration tolerance,
// live waveform with noise-gating + automatic gain normalization, processing/thinking state,
// warm no-speech retry, interruption safety) now matches the same shared contract every other
// recording pipeline in the app follows. Technique scoring itself is no longer a fork — it
// calls the exact same scoreOnsetSoftness/scoreContactLightness math from speechScoring.ts that
// useSpeechMetric uses, just fed from this game's ASR volume stream instead of expo-audio
// metering.

import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { bestStarsToTier, TIER_STYLES } from '@/components/games/game-badge';
import { Fonts } from '@/constants/theme';
import { OnboardingPalette } from '@/constants/onboarding-theme';
import { CategoryKey, useProgress } from '@/contexts/progress-context';
import { FinCharacter } from '@/game-engine/FinCharacter';
import { MicPermissionGate } from '@/game-engine/MicPermissionGate';
import { PREP_BEAT_MS } from '@/game-engine/audioRecordingConfig';
import { Sample, scoreContactLightness, scoreOnsetSoftness } from '@/game-engine/speechScoring';
import { getFeedbackMessage, getFeedbackTier, isEnvironmentTooNoisy, wordMatches } from '@/utils/speech-analysis';

export const WORDS_PER_ROUND = 7;
const WRONG_POPUP_MS = 1300;
const CORRECT_POPUP_MS = 1500;
const VOLUME_INTERVAL_MS = 100;
const BAR_COUNT = 5;
const ONSET_SAMPLE_CAP = 3;
const NO_SPEECH_PROMPT_MS = 10000;
const MIN_PROCESSING_MS = 350; // deliberate Fin-thinking beat, matching the other pipelines' feel

// How long a round listens before giving up if no word match ever lands. Generous, and — since
// this game's `continuous: true` ASR session doesn't auto-stop on trailing silence at all — a
// child pausing mid-attempt (Cancellation's finish-pause-retry) is never cut off by this ceiling
// unless they genuinely go quiet for the whole window.
const DEFAULT_GRACE_MS = 5500;
const CATEGORY_GRACE_MS: Partial<Record<CategoryKey, number>> = {
  cancellation: 9000,
};

// expo-speech-recognition's volumechange value is documented as roughly -2..10, with anything
// below 0 "inaudible" — a different scale from expo-audio's dBFS metering, so it gets its own
// small normalization step here rather than forcing an ill-fitting reuse of the dBFS-tuned
// calibrateSamples(). The actual technique-scoring math below it (scoreOnsetSoftness /
// scoreContactLightness) is shared, not forked.
const ASR_SILENCE_FLOOR = 0;
const ASR_LOUD_CEILING = 6;

function normalizeVolumeValue(raw: number, ceiling: number): number {
  return Math.max(0, Math.min(1, (raw - ASR_SILENCE_FLOOR) / (ceiling - ASR_SILENCE_FLOOR)));
}

export type PulseVisualProps = {
  completedIndices: boolean[];
  activeIndex: number;
  lastCompletedIndex: number | null;
};

export type PulseWordGameProps = {
  gameKey: string;
  categoryKey: CategoryKey;
  title: string;
  words: string[];
  wordEmojis: string[];
  hint: string;
  micHint?: string;
  resultCompleteText: string;
  resultPartialText?: (score: number) => string;
  renderVisual: (props: PulseVisualProps) => ReactNode;
};

type Phase = 'ready' | 'prepping' | 'listening' | 'processing' | 'no-speech' | 'correct' | 'wrong' | 'finished';

export function PulseWordGame({
  gameKey,
  categoryKey,
  title,
  words,
  wordEmojis,
  hint,
  micHint,
  resultCompleteText,
  resultPartialText,
  renderVisual,
}: PulseWordGameProps) {
  const router = useRouter();
  const { recordGameResult, gameStats } = useProgress();

  const [phase, setPhase] = useState<Phase>('ready');
  const [wordIndex, setWordIndex] = useState(0);
  const [completedIndices, setCompletedIndices] = useState<boolean[]>(Array(WORDS_PER_ROUND).fill(false));
  const [lastCompletedIndex, setLastCompletedIndex] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [bars, setBars] = useState<number[]>(Array(BAR_COUNT).fill(6));
  const [finVisible, setFinVisible] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [resultStars, setResultStars] = useState(0);
  const [badgeUnlock, setBadgeUnlock] = useState<string | null>(null);

  const phaseRef = useRef<Phase>('ready');
  const wordIndexRef = useRef(0);
  const wordMatchedRef = useRef(false);
  const stoppingRef = useRef(false);
  const attemptNumberRef = useRef(0);
  const onsetSamplesRef = useRef<number[]>([]);
  const fullSamplesRef = useRef<Sample[]>([]);
  const listenStartedAtRef = useRef(0);
  const loudCeilingRef = useRef(ASR_LOUD_CEILING);
  const strategyScoresRef = useRef<number[]>([]);
  const sessionStartRef = useRef(Date.now());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prepTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const popupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noSpeechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const micScale = useSharedValue(1);
  const finTranslateY = useSharedValue(220);
  const starBurstOpacity = useSharedValue(0);

  const setPhaseBoth = (next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  useEffect(() => {
    if (phase === 'listening') {
      micScale.value = withRepeat(withSequence(withTiming(1.15, { duration: 400 }), withTiming(1, { duration: 400 })), -1, true);
    } else {
      micScale.value = withTiming(1, { duration: 200 });
    }
  }, [phase, micScale]);

  const micAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: micScale.value }] }));
  const finAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: finTranslateY.value }] }));
  const starBurstStyle = useAnimatedStyle(() => ({ opacity: starBurstOpacity.value }));

  useSpeechRecognitionEvent('result', (event) => {
    if (phaseRef.current !== 'listening' || wordMatchedRef.current) return;
    const transcript = event.results[0]?.transcript ?? '';
    if (wordMatches(transcript, words[wordIndexRef.current])) {
      wordMatchedRef.current = true;
      const samples = fullSamplesRef.current;
      const onsetSamples = samples.slice(0, ONSET_SAMPLE_CAP);
      const strategyScore =
        categoryKey === 'easy-onset'
          ? scoreOnsetSoftness(onsetSamples)
          : categoryKey === 'light-contact'
            ? scoreContactLightness(samples)
            : 100;
      strategyScoresRef.current.push(strategyScore);
      beginProcessing(() => handleWordResult(strategyScore));
    }
  });

  useSpeechRecognitionEvent('volumechange', (event) => {
    if (phaseRef.current !== 'listening') return;
    if (event.value > loudCeilingRef.current) {
      // Adaptive ceiling — automatic gain normalization applied live, same idea as the shared
      // expo-audio engine, just tuned to this signal's own -2..10 scale.
      loudCeilingRef.current = Math.min(10, event.value);
    }
    const level = normalizeVolumeValue(event.value, loudCeilingRef.current);
    const t = Date.now() - listenStartedAtRef.current;
    if (onsetSamplesRef.current.length < ONSET_SAMPLE_CAP) {
      onsetSamplesRef.current = [...onsetSamplesRef.current, event.value];
    }
    fullSamplesRef.current = [...fullSamplesRef.current, { t, level }];
    // Soft noise gate on the visual bars only, matching the shared waveform's treatment.
    const gated = level < 0.05 ? 0 : level;
    setBars((prev) => [...prev.slice(1), Math.max(6, Math.min(46, 6 + gated * 40))]);
  });

  useSpeechRecognitionEvent('error', (event) => {
    if (phaseRef.current !== 'listening' && phaseRef.current !== 'prepping') return;
    if (event.error === 'no-speech') {
      handleNoSpeech();
    } else {
      // 'interrupted' (a call, Siri, alarm) or any other native error — reset cleanly rather
      // than leaving the round stuck in 'listening' forever or crashing.
      resetToReady();
    }
  });

  const clearAllTimers = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (manualStopTimeoutRef.current) clearTimeout(manualStopTimeoutRef.current);
    if (prepTimeoutRef.current) clearTimeout(prepTimeoutRef.current);
    if (noSpeechTimeoutRef.current) clearTimeout(noSpeechTimeoutRef.current);
    timeoutRef.current = null;
    manualStopTimeoutRef.current = null;
    prepTimeoutRef.current = null;
    noSpeechTimeoutRef.current = null;
  };

  const resetToReady = () => {
    clearAllTimers();
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {
      // Already stopped/never started — harmless.
    }
    stoppingRef.current = false;
    setPhaseBoth('ready');
  };

  const handleNoSpeech = () => {
    clearAllTimers();
    try {
      ExpoSpeechRecognitionModule.abort();
    } catch {
      // No-op if already stopped.
    }
    stoppingRef.current = false;
    setPhaseBoth('no-speech');
    setFeedbackMessage("Didn't catch that — try again! 💛");
    noSpeechTimeoutRef.current = setTimeout(() => {
      setFeedbackMessage('');
      setPhaseBoth('ready');
    }, 1500);
  };

  /** A short, deliberate Fin-thinking beat before the result lands — mirrors the natural pause
   * the amplitude-based engine has while it scores, so processing feels consistent everywhere. */
  const beginProcessing = (onDone: () => void) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setPhaseBoth('processing');
    setTimeout(onDone, MIN_PROCESSING_MS);
  };

  const startListening = async () => {
    clearAllTimers();
    stoppingRef.current = false;
    setFeedbackMessage('');
    wordMatchedRef.current = false;
    onsetSamplesRef.current = [];
    fullSamplesRef.current = [];
    loudCeilingRef.current = ASR_LOUD_CEILING;
    setBars(Array(BAR_COUNT).fill(6));
    setPhaseBoth('prepping');

    prepTimeoutRef.current = setTimeout(() => {
      prepTimeoutRef.current = null;
      if (phaseRef.current !== 'prepping') return; // interrupted during the beat
      listenStartedAtRef.current = Date.now();
      setPhaseBoth('listening');

      try {
        ExpoSpeechRecognitionModule.start({
          lang: 'en-US',
          interimResults: true,
          continuous: true,
          volumeChangeEventOptions: { enabled: true, intervalMillis: VOLUME_INTERVAL_MS },
        });
      } catch {
        resetToReady();
        return;
      }

      const graceMs = CATEGORY_GRACE_MS[categoryKey] ?? DEFAULT_GRACE_MS;
      timeoutRef.current = setTimeout(() => {
        if (!wordMatchedRef.current) {
          try {
            ExpoSpeechRecognitionModule.stop();
          } catch {
            // Already stopped — fine.
          }
          beginProcessing(() => handleWordResult(0));
        }
      }, graceMs);
    }, PREP_BEAT_MS);
  };

  /** Manual stop — always available while listening, regardless of the category's grace
   * duration. If a match already landed we let that flow finish; otherwise this ends the
   * attempt early rather than forcing the child to wait out the full ceiling. */
  const stopListening = () => {
    if (phaseRef.current !== 'listening' || stoppingRef.current) return;
    stoppingRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // Already stopped — fine.
    }
    // Give the final 'result' event a brief window to arrive before treating this as unmatched.
    manualStopTimeoutRef.current = setTimeout(() => {
      manualStopTimeoutRef.current = null;
      if (!wordMatchedRef.current && phaseRef.current === 'listening') {
        beginProcessing(() => handleWordResult(0));
      }
    }, 500);
  };

  const handleWordResult = (rawScore: number) => {
    stoppingRef.current = false;
    const matched = wordMatchedRef.current;

    if (!matched && isEnvironmentTooNoisy(onsetSamplesRef.current)) {
      setFeedbackMessage("It's too noisy here! Try a quieter spot 🎧");
      handleWordRetryOrSkip(false);
      return;
    }

    attemptNumberRef.current += 1;
    const tier = getFeedbackTier(matched ? rawScore : 0, attemptNumberRef.current);
    setFeedbackMessage(getFeedbackMessage(tier));

    if (tier === 'excellent' || tier === 'good') {
      handleWordSuccess();
    } else {
      handleWordRetryOrSkip(tier === 'skip');
    }
  };

  const handleWordRetryOrSkip = (shouldSkip: boolean) => {
    setPhaseBoth('wrong');
    setFinVisible(true);
    finTranslateY.value = withTiming(0, { duration: 300 });

    popupTimeoutRef.current = setTimeout(() => {
      finTranslateY.value = withTiming(220, { duration: 280 });
      setTimeout(() => {
        setFinVisible(false);
        attemptNumberRef.current = 0;
        if (shouldSkip) {
          advanceWord();
        } else {
          setPhaseBoth('ready');
        }
      }, 260);
    }, WRONG_POPUP_MS);
  };

  const advanceWord = () => {
    const index = wordIndexRef.current;
    if (index + 1 >= WORDS_PER_ROUND) {
      finishGame();
    } else {
      const nextIndex = index + 1;
      setWordIndex(nextIndex);
      wordIndexRef.current = nextIndex;
      setPhaseBoth('ready');
    }
  };

  const handleWordSuccess = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // Already stopped — fine.
    }

    const index = wordIndexRef.current;
    attemptNumberRef.current = 0;
    setPhaseBoth('correct');
    setScore((s) => s + 1);
    setLastCompletedIndex(index);

    setFinVisible(true);
    finTranslateY.value = withTiming(0, { duration: 350 });
    starBurstOpacity.value = withSequence(withTiming(1, { duration: 150 }), withTiming(0, { duration: 400 }));

    popupTimeoutRef.current = setTimeout(() => {
      finTranslateY.value = withTiming(220, { duration: 300 });
      setCompletedIndices((prev) => {
        const next = [...prev];
        next[index] = true;
        return next;
      });

      setTimeout(() => {
        setFinVisible(false);
        advanceWord();
      }, 320);
    }, CORRECT_POPUP_MS);
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

      recordGameResult({
        gameKey,
        categoryKey,
        stars,
        gameName: title,
        wordsAttempted: WORDS_PER_ROUND,
        wordsCorrect: finalScore,
        durationSeconds,
        strategyScore: avgStrategyScore,
      });
      setPhaseBoth('finished');
      return finalScore;
    });
  };

  const resetGame = () => {
    setPhaseBoth('ready');
    setWordIndex(0);
    wordIndexRef.current = 0;
    attemptNumberRef.current = 0;
    strategyScoresRef.current = [];
    sessionStartRef.current = Date.now();
    setCompletedIndices(Array(WORDS_PER_ROUND).fill(false));
    setLastCompletedIndex(null);
    setScore(0);
    setResultStars(0);
    setBadgeUnlock(null);
    setFeedbackMessage('');
  };

  useEffect(() => {
    if (phase !== 'ready') return;
    const idleTimer = setTimeout(() => {
      setFeedbackMessage('Tap the mic and try!');
    }, NO_SPEECH_PROMPT_MS);
    return () => clearTimeout(idleTimer);
  }, [phase, wordIndex]);

  // Backgrounding mid-attempt (a call, switching apps) should pause cleanly rather than leaving
  // ASR running into the void or the round stuck forever.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && (phaseRef.current === 'listening' || phaseRef.current === 'prepping')) {
        resetToReady();
      }
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      clearAllTimers();
      if (popupTimeoutRef.current) clearTimeout(popupTimeoutRef.current);
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch {
        // Unmounting — nothing to clean up if it was never started.
      }
    };
  }, []);

  const currentWord = words[wordIndex];
  const currentEmoji = wordEmojis[wordIndex];

  const micStatusText =
    phase === 'prepping'
      ? 'Get ready…'
      : phase === 'listening'
        ? 'Listening…'
        : phase === 'processing'
          ? 'Thinking…'
          : phase === 'no-speech'
            ? feedbackMessage
            : phase === 'ready' && feedbackMessage === 'Tap the mic and try!'
              ? feedbackMessage
              : (micHint ?? 'Tap to speak!');

  return (
    <MicPermissionGate includeSpeechRecognition>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {phase !== 'finished' ? (
          <>
            <View style={styles.topBar}>
              <Pressable
                style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
                onPress={() => router.back()}>
                <Text style={styles.backButtonText}>← Back</Text>
              </Pressable>
              <Text style={styles.screenTitle}>{title}</Text>
              <Text style={styles.scoreText}>{score} / {WORDS_PER_ROUND}</Text>
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

            <View style={styles.gameArea}>
              {renderVisual({ completedIndices, activeIndex: wordIndex, lastCompletedIndex })}

              {phase === 'processing' && (
                <View style={styles.thinkingOverlay} pointerEvents="none">
                  <FinCharacter state="thinking" size={90} />
                </View>
              )}

              {finVisible && (
                <Animated.View style={[styles.finPopup, finAnimatedStyle]} pointerEvents="none">
                  {phase === 'correct' ? (
                    <>
                      <Animated.Text style={[styles.starBurst, starBurstStyle]}>✨ ⭐ ✨</Animated.Text>
                      <View style={styles.encourageBubble}>
                        <Text style={styles.encourageText}>{feedbackMessage}</Text>
                      </View>
                      <Image
                        source={require('@/assets/images/fin-allset.png')}
                        style={styles.finPopupImage}
                        resizeMode="contain"
                      />
                    </>
                  ) : (
                    <>
                      <View style={styles.encourageBubble}>
                        <Text style={styles.encourageText}>{feedbackMessage}</Text>
                      </View>
                      <Image
                        source={require('@/assets/images/fin-character.png')}
                        style={styles.finPopupImage}
                        resizeMode="contain"
                      />
                    </>
                  )}
                </Animated.View>
              )}
            </View>

            <View style={styles.bottomSection}>
              {phase === 'listening' && (
                <View style={styles.waveformRow}>
                  {bars.map((height, i) => (
                    <View key={i} style={[styles.waveformBar, { height }]} />
                  ))}
                </View>
              )}
              <Animated.View style={micAnimatedStyle}>
                <Pressable
                  style={({ pressed }) => [
                    styles.micButton,
                    phase === 'listening' && styles.micButtonActive,
                    pressed && styles.pressed,
                  ]}
                  disabled={phase !== 'ready' && phase !== 'listening'}
                  onPress={phase === 'listening' ? stopListening : startListening}>
                  <Text style={styles.micIcon}>🎤</Text>
                </Pressable>
              </Animated.View>
              <Text style={styles.tapToSpeak}>{micStatusText}</Text>
            </View>
          </>
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
    </MicPermissionGate>
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
    fontSize: 24,
    fontWeight: '800',
    color: OnboardingPalette.title,
  },
  scoreText: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '600',
    color: OnboardingPalette.subtitle,
    minWidth: 44,
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
    marginTop: 14,
    padding: 14,
    gap: 14,
  },
  wordIllustration: {
    width: 84,
    height: 84,
    borderRadius: 20,
    backgroundColor: OnboardingPalette.speechBubble,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordIllustrationEmoji: {
    fontSize: 44,
  },
  wordTextColumn: {
    flex: 1,
  },
  wordText: {
    fontFamily: Fonts.rounded,
    fontSize: 26,
    fontWeight: '800',
    color: OnboardingPalette.title,
    textTransform: 'capitalize',
  },
  wordHint: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    color: OnboardingPalette.subtitle,
    marginTop: 4,
  },
  gameArea: {
    flex: 1,
    marginHorizontal: 20,
    marginTop: 14,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  thinkingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  finPopup: {
    position: 'absolute',
    bottom: 0,
    alignSelf: 'center',
    alignItems: 'center',
  },
  finPopupImage: {
    width: 140,
    height: 182,
  },
  starBurst: {
    fontSize: 20,
    marginBottom: 2,
  },
  encourageBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: OnboardingPalette.cardBorder,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  encourageText: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '700',
    color: OnboardingPalette.title,
  },
  bottomSection: {
    alignItems: 'center',
    paddingVertical: 16,
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
    width: 80,
    height: 80,
    borderRadius: 40,
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
    fontSize: 32,
  },
  tapToSpeak: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    color: OnboardingPalette.subtitle,
    marginTop: 10,
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
