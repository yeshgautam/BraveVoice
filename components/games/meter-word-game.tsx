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
import {
  estimateSyllables,
  getFeedbackMessage,
  getFeedbackTier,
  isEnvironmentTooNoisy,
  scoreSlowSpeech,
  scoreStretchySpeech,
  wordMatches,
} from '@/utils/speech-analysis';

export const WORDS_PER_ROUND = 7;
const MIN_TARGET_MS = 1100;
const GRACE_MS = 900;
const VOLUME_INTERVAL_MS = 100;
const VOLUME_THRESHOLD = 1;
const GOOD_FILL_THRESHOLD = 0.6;
const NO_SPEECH_PROMPT_MS = 10000;

export type MeterVisualProps = {
  wordFillRatios: number[];
  liveFill: number;
  wordIndex: number;
  isListening: boolean;
};

export type MeterWordGameProps = {
  gameKey: string;
  categoryKey: CategoryKey;
  title: string;
  words: string[];
  wordEmojis: string[];
  hint: string;
  micHint?: string;
  resultCompleteText: string;
  resultPartialText?: (score: number) => string;
  formatScore: (completedGoodCount: number, wordIndex: number, wordFillRatios: number[]) => string;
  renderVisual: (props: MeterVisualProps) => ReactNode;
};

type Phase = 'ready' | 'listening' | 'finished';

export function MeterWordGame({
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
}: MeterWordGameProps) {
  const router = useRouter();
  const { recordGameResult, gameStats } = useProgress();

  const [phase, setPhase] = useState<Phase>('ready');
  const [wordIndex, setWordIndex] = useState(0);
  const [wordFillRatios, setWordFillRatios] = useState<number[]>(Array(WORDS_PER_ROUND).fill(0));
  const [liveFill, setLiveFill] = useState(0);
  const [resultStars, setResultStars] = useState(0);
  const [badgeUnlock, setBadgeUnlock] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);

  const phaseRef = useRef<Phase>('ready');
  const wordIndexRef = useRef(0);
  const wordMatchedRef = useRef(false);
  const attemptNumberRef = useRef(0);
  const goodMsRef = useRef(0);
  const targetMsRef = useRef(MIN_TARGET_MS);
  const fullSamplesRef = useRef<number[]>([]);
  const strategyScoresRef = useRef<number[]>([]);
  const sessionStartRef = useRef(Date.now());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noSpeechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDurationStrategy = categoryKey === 'slow-speech' || categoryKey === 'stretchy-speech';

  const micScale = useSharedValue(1);

  useEffect(() => {
    if (phase === 'listening') {
      micScale.value = withRepeat(withSequence(withTiming(1.15, { duration: 400 }), withTiming(1, { duration: 400 })), -1, true);
    } else {
      micScale.value = withTiming(1, { duration: 200 });
    }
  }, [phase, micScale]);

  const micAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: micScale.value }] }));

  useSpeechRecognitionEvent('result', (event) => {
    if (phaseRef.current !== 'listening' || wordMatchedRef.current) return;
    const transcript = event.results[0]?.transcript ?? '';
    if (wordMatches(transcript, words[wordIndexRef.current])) {
      wordMatchedRef.current = true;
    }
  });

  useSpeechRecognitionEvent('volumechange', (event) => {
    if (phaseRef.current !== 'listening') return;
    if (event.value > VOLUME_THRESHOLD) {
      goodMsRef.current += VOLUME_INTERVAL_MS;
    }
    fullSamplesRef.current = [...fullSamplesRef.current, event.value];
    const ratio = Math.min(1, goodMsRef.current / targetMsRef.current);
    setLiveFill(ratio);
  });

  const startListening = async () => {
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      setPermissionDenied(true);
      return;
    }

    if (noSpeechTimeoutRef.current) clearTimeout(noSpeechTimeoutRef.current);
    const word = words[wordIndexRef.current];
    targetMsRef.current =
      categoryKey === 'slow-speech' ? estimateSyllables(word) * 400 : categoryKey === 'stretchy-speech' ? 750 : MIN_TARGET_MS;
    targetMsRef.current = Math.max(MIN_TARGET_MS, targetMsRef.current);
    goodMsRef.current = 0;
    fullSamplesRef.current = [];
    wordMatchedRef.current = false;
    setFeedbackMessage('');
    setLiveFill(0);
    setPhase('listening');
    phaseRef.current = 'listening';

    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: true,
      volumeChangeEventOptions: { enabled: true, intervalMillis: VOLUME_INTERVAL_MS },
    });

    timeoutRef.current = setTimeout(() => {
      finishWord();
    }, targetMsRef.current + GRACE_MS);
  };

  const finishWord = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    ExpoSpeechRecognitionModule.stop();

    const index = wordIndexRef.current;
    const word = words[index];
    const durationMs = goodMsRef.current;

    const strategyScore = isDurationStrategy
      ? categoryKey === 'slow-speech'
        ? scoreSlowSpeech(word, durationMs).score
        : scoreStretchySpeech(durationMs, fullSamplesRef.current).score
      : Math.min(100, (durationMs / targetMsRef.current) * 100);

    const rawRatio = Math.min(1, durationMs / targetMsRef.current);
    const finalRatio = wordMatchedRef.current ? rawRatio : Math.min(rawRatio, 0.15);
    setLiveFill(finalRatio);

    if (!wordMatchedRef.current && isEnvironmentTooNoisy(fullSamplesRef.current.slice(0, 3))) {
      setFeedbackMessage("It's too noisy here! Try a quieter spot 🎧");
      setTimeout(() => {
        setLiveFill(0);
        setPhase('ready');
        phaseRef.current = 'ready';
      }, 700);
      return;
    }

    attemptNumberRef.current += 1;
    const tier = getFeedbackTier(wordMatchedRef.current ? strategyScore : 0, attemptNumberRef.current);
    setFeedbackMessage(getFeedbackMessage(tier));

    if (tier === 'try-again') {
      setTimeout(() => {
        setLiveFill(0);
        setPhase('ready');
        phaseRef.current = 'ready';
      }, 700);
      return;
    }

    attemptNumberRef.current = 0;
    strategyScoresRef.current.push(strategyScore);
    setWordFillRatios((prev) => {
      const next = [...prev];
      next[index] = finalRatio;
      return next;
    });

    setTimeout(() => {
      if (index + 1 >= WORDS_PER_ROUND) {
        finishGame(finalRatio, index);
      } else {
        const nextIndex = index + 1;
        setWordIndex(nextIndex);
        wordIndexRef.current = nextIndex;
        setLiveFill(0);
        setPhase('ready');
        phaseRef.current = 'ready';
      }
    }, 500);
  };

  const finishGame = (lastRatio: number, lastIndex: number) => {
    setWordFillRatios((prev) => {
      const finalRatios = [...prev];
      finalRatios[lastIndex] = lastRatio;
      const goodCount = finalRatios.filter((r) => r >= GOOD_FILL_THRESHOLD).length;
      const stars = goodCount >= 7 ? 3 : goodCount >= 6 ? 2 : goodCount >= 5 ? 1 : 0;
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
        wordsCorrect: goodCount,
        durationSeconds,
        strategyScore: avgStrategyScore,
      });
      return finalRatios;
    });
    setPhase('finished');
    phaseRef.current = 'finished';
  };

  const resetGame = () => {
    setPhase('ready');
    phaseRef.current = 'ready';
    setWordIndex(0);
    wordIndexRef.current = 0;
    attemptNumberRef.current = 0;
    strategyScoresRef.current = [];
    sessionStartRef.current = Date.now();
    setWordFillRatios(Array(WORDS_PER_ROUND).fill(0));
    setLiveFill(0);
    setResultStars(0);
    setBadgeUnlock(null);
    setFeedbackMessage('');
  };

  useEffect(() => {
    if (phase !== 'ready') return;
    noSpeechTimeoutRef.current = setTimeout(() => {
      setFeedbackMessage('Tap the mic and try!');
    }, NO_SPEECH_PROMPT_MS);
    return () => {
      if (noSpeechTimeoutRef.current) clearTimeout(noSpeechTimeoutRef.current);
    };
  }, [phase, wordIndex]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (noSpeechTimeoutRef.current) clearTimeout(noSpeechTimeoutRef.current);
      ExpoSpeechRecognitionModule.stop();
    };
  }, []);

  const currentWord = words[wordIndex];
  const currentEmoji = wordEmojis[wordIndex];
  const goodCount = wordFillRatios.filter((r) => r >= GOOD_FILL_THRESHOLD).length;

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
            <Text style={styles.scoreText}>{formatScore(goodCount, wordIndex, wordFillRatios)}</Text>
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
            {renderVisual({ wordFillRatios, liveFill, wordIndex, isListening: phase === 'listening' })}
          </View>

          <View style={styles.bottomSection}>
            {phase === 'listening' && (
              <View style={styles.stretchTrack}>
                <View style={[styles.stretchFill, { width: `${liveFill * 100}%` }]} />
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
                onPress={phase === 'listening' ? finishWord : startListening}>
                <Text style={styles.micIcon}>🎤</Text>
              </Pressable>
            </Animated.View>
            <Text style={styles.tapToSpeak}>
              {phase === 'listening' ? 'Keep going… (tap to finish)' : feedbackMessage || micHint || 'Tap to speak!'}
            </Text>
          </View>
        </>
      ) : (
        <View style={styles.resultContainer}>
          <Image source={require('@/assets/images/fin-allset.png')} style={styles.resultFin} resizeMode="contain" />
          <Text style={styles.resultTitle}>Amazing! 🎉</Text>
          <Text style={styles.resultStars}>{'⭐'.repeat(resultStars) || '💪'}</Text>
          <Text style={styles.resultSubtitle}>
            {goodCount >= WORDS_PER_ROUND
              ? resultCompleteText
              : (resultPartialText ?? ((s: number) => `You got ${s} of ${WORDS_PER_ROUND}!`))(goodCount)}
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
    fontSize: 22,
    fontWeight: '800',
    color: OnboardingPalette.title,
  },
  scoreText: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
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
  bottomSection: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  stretchTrack: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    backgroundColor: OnboardingPalette.speechBubble,
    overflow: 'hidden',
    marginBottom: 14,
  },
  stretchFill: {
    height: '100%',
    borderRadius: 5,
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
