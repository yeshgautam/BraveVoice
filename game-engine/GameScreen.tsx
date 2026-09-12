// Reusable shell for every 8+ ("older mode") mini-game: title up top, a large themed
// play-area in the center (each game supplies its own via `renderStage`), the target
// word above the mic button, and 5 round-progress dots. All mic recording, scoring,
// retry pacing, star/XP recording and result screens are handled here so individual
// games only need to describe *what the play-area looks like*.

import { createAudioPlayer } from 'expo-audio';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LiveWaveform } from '@/components/games/live-waveform';
import { SmoothSailingSlider } from '@/components/games/smooth-sailing-slider';
import { bestStarsToTier, TIER_STYLES } from '@/components/games/game-badge';
import { Fonts } from '@/constants/theme';
import { GamesPalette } from '@/constants/games-theme';
import { CategoryKey, useProgress } from '@/contexts/progress-context';
import { useFluencyRatings } from '@/contexts/fluency-rating-context';
import { FinCharacter } from '@/game-engine/FinCharacter';
import { ParticleBurst } from '@/game-engine/ParticleBurst';
import { Snowfall } from '@/game-engine/Snowfall';
import { SpeechMetricOptions, SpeechMetricResult, SpeechMetricType, useSpeechMetric } from '@/game-engine/useSpeechMetric';
import { getFeedbackMessage, getFeedbackTier } from '@/utils/speech-analysis';

export const ROUNDS = 5;

type RoundStatus = 'pending' | 'success' | 'skipped';
type RoundPhase = 'ready' | 'recording' | 'result';

export type GameStageProps = {
  phase: RoundPhase;
  liveLevel: SharedValue<number>;
  /** 1 = smooth/controlled so far this attempt, 0 = a jerky spike just happened. */
  liveSmoothness: SharedValue<number>;
  roundIndex: number;
  lastResult: SpeechMetricResult | null;
  /** Bumps every time a fresh result lands — key a one-shot payoff animation off this. */
  resultRevealKey: number;
};

export type GameScreenProps = {
  gameKey: string;
  categoryKey: CategoryKey;
  title: string;
  metricType: SpeechMetricType;
  metricOptions?: SpeechMetricOptions;
  /** Exactly 5 target words, one per round. */
  words: string[];
  hint?: string;
  micHint?: string;
  accentColor?: string;
  renderStage: (props: GameStageProps) => ReactNode;
  resultCompleteText?: string;
  resultPartialText?: (goodCount: number) => string;
  /** When true, the stage renders full-bleed behind the whole screen (title, hint, word/mic
   * chrome float on top with translucent backing) instead of inside a padded, rounded card.
   * Opt-in per game so it only affects games whose stage is a real photo background. */
  immersiveBackground?: boolean;
  /** Optional per-game difficulty knob: transforms the raw 0-100 speech score before it's
   * used for round success/tier and recorded stats. Opt-in so other games' scoring is untouched. */
  scoreAdjustment?: (score: number) => number;
  /** Called with the (possibly difficulty-adjusted) score and success flag after each round
   * resolves — lets a game track its own session stats (e.g. race points) without GameScreen
   * needing to know what those are. */
  onRoundResolved?: (score: number, success: boolean) => void;
  /** When false, suppresses the shared UI tap sound. Defaults to true. */
  soundEnabled?: boolean;
  /** Shown as a "Strategy: [label]" pill under the title, with a gear button that calls this
   * to open the caller's Strategy Switcher. Opt-in — omit both to leave the header unchanged. */
  strategyLabel?: string;
  onStrategyPress?: () => void;
  /** When true, the completion screen shows the Smooth Sailing Slider self-rating first,
   * before the stars/completion summary. Opt-in — existing games are unaffected. */
  showFluencySlider?: boolean;
};

export function GameScreen({
  gameKey,
  categoryKey,
  title,
  metricType,
  metricOptions,
  words,
  hint,
  micHint,
  accentColor = GamesPalette.navyAccent,
  renderStage,
  resultCompleteText = 'You finished every round! 🎉',
  resultPartialText,
  immersiveBackground = false,
  scoreAdjustment,
  onRoundResolved,
  soundEnabled = true,
  strategyLabel,
  onStrategyPress,
  showFluencySlider = false,
}: GameScreenProps) {
  const router = useRouter();
  const { recordGameResult, gameStats } = useProgress();
  const { recordFluencyRating } = useFluencyRatings();
  const [fluencyRated, setFluencyRated] = useState(!showFluencySlider);
  const speechMetric = useSpeechMetric(metricType, metricOptions);

  const [gamePhase, setGamePhase] = useState<'playing' | 'finished'>('playing');
  const [roundPhase, setRoundPhase] = useState<RoundPhase>('ready');
  const [roundIndex, setRoundIndex] = useState(0);
  const [roundStatuses, setRoundStatuses] = useState<RoundStatus[]>(Array(ROUNDS).fill('pending'));
  const [lastResult, setLastResult] = useState<SpeechMetricResult | null>(null);
  const [resultRevealKey, setResultRevealKey] = useState(0);
  const [successBurstKey, setSuccessBurstKey] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [resultStars, setResultStars] = useState(0);
  const [badgeUnlock, setBadgeUnlock] = useState<string | null>(null);
  const [noSpeechRetry, setNoSpeechRetry] = useState(false);

  const roundIndexRef = useRef(0);
  const attemptRef = useRef(0);
  const scoresRef = useRef<number[]>([]);
  const sessionStartRef = useRef(Date.now());
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noSpeechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const micScale = useSharedValue(1);

  const uiTapRef = useRef(createAudioPlayer(require('@/assets/sounds/ui-tap.m4a')));
  useEffect(() => {
    const player = uiTapRef.current;
    return () => player.remove();
  }, []);
  const tap = () => {
    if (!soundEnabled) return;
    try {
      uiTapRef.current.seekTo(0);
      uiTapRef.current.play();
    } catch {
      // Sound is a nice-to-have; never let a playback glitch break gameplay.
    }
  };

  useEffect(() => {
    // Pulse only while genuinely capturing audio — not during the brief prep beat or while
    // scoring — so the animation itself communicates "the mic is live right now".
    if (speechMetric.isRecording) {
      micScale.value = withRepeat(withSequence(withTiming(1.14, { duration: 380 }), withTiming(1, { duration: 380 })), -1, true);
    } else {
      micScale.value = withTiming(1, { duration: 200 });
    }
  }, [speechMetric.isRecording, micScale]);

  const micAnimatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: micScale.value }] }));

  useEffect(() => {
    return () => {
      if (advanceTimeoutRef.current) clearTimeout(advanceTimeoutRef.current);
      if (noSpeechTimeoutRef.current) clearTimeout(noSpeechTimeoutRef.current);
    };
  }, []);

  const advanceRound = () => {
    const idx = roundIndexRef.current;
    if (idx + 1 >= ROUNDS) {
      finishGame();
    } else {
      const next = idx + 1;
      roundIndexRef.current = next;
      setRoundIndex(next);
      setLastResult(null);
      setFeedbackMessage('');
      setRoundPhase('ready');
    }
  };

  const finishGame = () => {
    setRoundStatuses((statuses) => {
      const goodCount = statuses.filter((s) => s === 'success').length;
      const stars = goodCount >= 5 ? 3 : goodCount >= 4 ? 2 : goodCount >= 3 ? 1 : 0;
      setResultStars(stars);

      const prevPlays = gameStats[gameKey]?.plays ?? 0;
      setBadgeUnlock(prevPlays === 0 && stars >= 1 ? TIER_STYLES[bestStarsToTier(stars)].label : null);

      const scores = scoresRef.current;
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length / 100 : 0;
      const durationSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);

      recordGameResult({
        gameKey,
        categoryKey,
        stars,
        gameName: title,
        wordsAttempted: ROUNDS,
        wordsCorrect: goodCount,
        durationSeconds,
        strategyScore: avgScore,
      });
      return statuses;
    });
    setGamePhase('finished');
  };

  const handleResult = (rawResult: SpeechMetricResult) => {
    attemptRef.current += 1;
    const adjustedScore = scoreAdjustment ? Math.max(0, Math.min(100, scoreAdjustment(rawResult.score))) : rawResult.score;
    const result: SpeechMetricResult = { ...rawResult, score: adjustedScore };
    const tier = getFeedbackTier(result.score, attemptRef.current);
    const success = tier === 'excellent' || tier === 'good';

    setLastResult(result);
    setResultRevealKey((k) => k + 1);
    setFeedbackMessage(getFeedbackMessage(tier));
    setRoundPhase('result');
    onRoundResolved?.(result.score, success);

    if (success) {
      setSuccessBurstKey((k) => k + 1);
    }

    if (success || tier === 'skip') {
      attemptRef.current = 0;
      scoresRef.current.push(result.score);
      const idx = roundIndexRef.current;
      setRoundStatuses((prev) => {
        const next = [...prev];
        next[idx] = success ? 'success' : 'skipped';
        return next;
      });
      advanceTimeoutRef.current = setTimeout(advanceRound, success ? 1500 : 1300);
    } else {
      advanceTimeoutRef.current = setTimeout(() => {
        setRoundPhase('ready');
        setLastResult(null);
        setFeedbackMessage('');
      }, 1300);
    }
  };

  const handleNoSpeech = () => {
    // Warm, non-blaming retry — never scored as a failed attempt, since nothing was actually
    // said to score. attemptRef is deliberately left untouched so this doesn't burn one of the
    // MAX_ATTEMPTS_PER_WORD retries. The mic is re-armed immediately; the banner is just a
    // brief, friendly note layered on top.
    setNoSpeechRetry(true);
    noSpeechTimeoutRef.current = setTimeout(() => setNoSpeechRetry(false), 1500);
  };

  const handleMicPress = async () => {
    if (roundPhase === 'ready') {
      tap();
      setNoSpeechRetry(false);
      setRoundPhase('recording');
      const result = await speechMetric.start();
      if (speechMetric.permissionDenied) {
        setRoundPhase('ready');
        return;
      }
      if (result.noSpeechDetected) {
        setRoundPhase('ready');
        handleNoSpeech();
        return;
      }
      handleResult(result);
    } else if (speechMetric.isRecording) {
      speechMetric.stop();
    }
  };

  const resetGame = () => {
    setGamePhase('playing');
    setRoundPhase('ready');
    setRoundIndex(0);
    roundIndexRef.current = 0;
    attemptRef.current = 0;
    scoresRef.current = [];
    sessionStartRef.current = Date.now();
    setRoundStatuses(Array(ROUNDS).fill('pending'));
    setLastResult(null);
    setFeedbackMessage('');
    setResultStars(0);
    setBadgeUnlock(null);
    setFluencyRated(!showFluencySlider);
    setSuccessBurstKey(0);
  };

  const currentWord = words[roundIndex % words.length];
  const goodCount = roundStatuses.filter((s) => s === 'success').length;

  if (speechMetric.permissionDenied) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.resultContainer}>
          <Image source={require('@/assets/images/fin-character.png')} style={styles.resultFin} contentFit="contain" />
          <Text style={styles.resultTitle}>Oh no!</Text>
          <Text style={styles.resultSubtitle}>
            We need your microphone to play! Ask a grown-up to help turn it on in Settings.
          </Text>
          <Pressable style={({ pressed }) => [styles.backToGamesButton, pressed && styles.pressed]} onPress={() => router.back()}>
            <Text style={styles.backToGamesButtonText}>Back to Games</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (gamePhase === 'finished' && !fluencyRated) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <SmoothSailingSlider
          onSelect={(rating) => {
            recordFluencyRating(gameKey, rating);
            setFluencyRated(true);
          }}
        />
      </SafeAreaView>
    );
  }

  if (gamePhase === 'finished') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.resultContainer}>
          <Image source={require('@/assets/images/fin-allset.png')} style={styles.resultFin} contentFit="contain" />
          <Text style={styles.resultTitle}>Amazing! 🎉</Text>
          <Text style={styles.resultStars}>{'⭐'.repeat(resultStars) || '💪'}</Text>
          <Text style={styles.resultSubtitle}>
            {goodCount >= ROUNDS ? resultCompleteText : (resultPartialText ?? ((s) => `You got ${s} of ${ROUNDS}!`))(goodCount)}
          </Text>

          {badgeUnlock && (
            <View style={styles.badgeCard}>
              <Text style={styles.badgeCardEmoji}>🏅</Text>
              <Text style={styles.badgeCardText}>
                New badge unlocked! {title} {badgeUnlock} 🏅
              </Text>
            </View>
          )}

          <Pressable style={({ pressed }) => [styles.playAgainButton, pressed && styles.pressed]} onPress={resetGame}>
            <Text style={styles.playAgainButtonText}>Play Again</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.backToGamesButton, pressed && styles.pressed]} onPress={() => router.back()}>
            <Text style={styles.backToGamesButtonText}>Back to Games</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const stageContent = renderStage({
    phase: roundPhase,
    liveLevel: speechMetric.liveLevel,
    liveSmoothness: speechMetric.liveSmoothness,
    roundIndex,
    lastResult,
    resultRevealKey,
  });

  return (
    <View style={immersiveBackground ? styles.immersiveRoot : styles.safeArea}>
      {immersiveBackground && (
        <View style={StyleSheet.absoluteFillObject}>
          {stageContent}
          <LinearGradient
            colors={['transparent', 'rgba(6,16,28,0.7)']}
            locations={[0.6, 1]}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
        </View>
      )}
      <Snowfall />
      <SafeAreaView style={immersiveBackground ? styles.immersiveSafeArea : styles.safeAreaTransparent} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [styles.backButton, immersiveBackground && styles.backButtonImmersive, pressed && styles.pressed]}
            onPress={() => {
              tap();
              router.back();
            }}>
            <Text style={[styles.backButtonText, immersiveBackground && styles.backButtonTextImmersive]}>← Back</Text>
          </Pressable>
          <Text
            style={[styles.screenTitle, immersiveBackground && styles.screenTitleImmersive]}
            numberOfLines={1}
            ellipsizeMode="tail">
            {title}
          </Text>
          {onStrategyPress ? (
            <Pressable
              style={({ pressed }) => [styles.backButton, immersiveBackground && styles.backButtonImmersive, pressed && styles.pressed]}
              onPress={onStrategyPress}
              accessibilityRole="button"
              accessibilityLabel="Strategy settings">
              <Text style={[styles.backButtonText, immersiveBackground && styles.backButtonTextImmersive]}>⚙️</Text>
            </Pressable>
          ) : (
            <View style={styles.backButtonSpacer} />
          )}
        </View>

        {strategyLabel && (
          <Pressable onPress={onStrategyPress} style={styles.strategyPill}>
            <Text style={[styles.strategyPillText, immersiveBackground && styles.hintImmersive]}>Strategy: {strategyLabel}</Text>
          </Pressable>
        )}

        {hint && <Text style={[styles.hint, immersiveBackground && styles.hintImmersive]}>{hint}</Text>}

        {immersiveBackground ? <View style={styles.immersiveSpacer} /> : <View style={styles.stageArea}>{stageContent}</View>}

        <View style={styles.bottomSection}>
          <View style={styles.wordBubble}>
            <Text style={styles.wordText}>{currentWord.toUpperCase()}</Text>
          </View>

          <Text style={[styles.feedbackText, immersiveBackground && styles.feedbackTextImmersive]}>
            {speechMetric.isPrepping
              ? 'Get ready…'
              : speechMetric.isRecording
                ? 'Listening…'
                : speechMetric.isProcessing
                  ? 'Thinking…'
                  : noSpeechRetry
                    ? "Didn't catch that — try again! 💛"
                    : feedbackMessage || micHint || 'Tap the mic and try!'}
          </Text>

          {speechMetric.isRecording && (
            <View style={styles.waveformSlot}>
              <LiveWaveform levels={speechMetric.liveWaveform} color={accentColor} height={36} />
            </View>
          )}
          {speechMetric.isProcessing && <View style={styles.waveformSlot}><FinCharacter state="thinking" size={56} /></View>}

          <View style={styles.micWrap}>
            <Animated.View style={micAnimatedStyle}>
              <Pressable
                style={({ pressed }) => [styles.micButton, speechMetric.isRecording && styles.micButtonActive, pressed && styles.pressed]}
                disabled={roundPhase === 'result' || speechMetric.isPrepping || speechMetric.isProcessing}
                onPress={handleMicPress}>
                <Text style={styles.micIcon}>🎤</Text>
              </Pressable>
            </Animated.View>
            <View style={styles.particleOverlay} pointerEvents="none">
              <ParticleBurst burstKey={successBurstKey} size={140} colors={[GamesPalette.amberAccent, GamesPalette.navyAccent, '#FFFFFF']} />
            </View>
          </View>

          <View style={styles.dotsRow}>
            {roundStatuses.map((status, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  status === 'success' && [styles.dotSuccess, { backgroundColor: accentColor }],
                  status === 'skipped' && styles.dotSkipped,
                  i === roundIndex && status === 'pending' && [styles.dotActive, { borderColor: accentColor }],
                ]}
              />
            ))}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: GamesPalette.background,
  },
  safeAreaTransparent: {
    flex: 1,
  },
  immersiveRoot: {
    flex: 1,
    backgroundColor: '#0B1E33',
  },
  immersiveSafeArea: {
    flex: 1,
  },
  immersiveSpacer: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    flexShrink: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: GamesPalette.navyAccent,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  backButtonText: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    fontWeight: '700',
    color: GamesPalette.navyAccent,
  },
  backButtonImmersive: {
    backgroundColor: 'rgba(15,40,66,0.55)',
    borderColor: 'rgba(180,230,255,0.55)',
  },
  backButtonTextImmersive: {
    color: '#EAF6FF',
  },
  backButtonSpacer: {
    flexShrink: 0,
    width: 68,
  },
  screenTitle: {
    flex: 1,
    fontFamily: Fonts.rounded,
    fontSize: 20,
    fontWeight: '800',
    color: GamesPalette.title,
    textAlign: 'center',
    marginHorizontal: 6,
  },
  screenTitleImmersive: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  strategyPill: {
    alignSelf: 'center',
    marginTop: 4,
  },
  strategyPillText: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    fontWeight: '700',
    color: GamesPalette.subtitle,
  },
  hint: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '600',
    color: GamesPalette.subtitle,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 32,
  },
  hintImmersive: {
    color: '#EAF6FF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  stageArea: {
    flex: 1,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: GamesPalette.cardWhite,
    borderWidth: 1.5,
    borderColor: GamesPalette.iceBorder,
  },
  bottomSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 10,
  },
  waveformSlot: {
    marginTop: 6,
    minHeight: 36,
    justifyContent: 'center',
  },
  wordBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: GamesPalette.iceBorder,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  wordText: {
    fontFamily: Fonts.rounded,
    fontSize: 22,
    fontWeight: '800',
    color: GamesPalette.title,
    letterSpacing: 1,
  },
  feedbackText: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '600',
    color: GamesPalette.subtitle,
    textAlign: 'center',
    marginTop: 8,
    minHeight: 18,
  },
  feedbackTextImmersive: {
    color: '#EAF6FF',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  micWrap: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
  },
  particleOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: GamesPalette.amberAccent,
    alignItems: 'center',
    justifyContent: 'center',
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
  dotsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: GamesPalette.iceBorder,
  },
  dotActive: {
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
  },
  dotSuccess: {},
  dotSkipped: {
    backgroundColor: '#A9C3DC',
  },
  pressed: {
    opacity: 0.85,
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
    color: GamesPalette.title,
    marginTop: 8,
  },
  resultStars: {
    fontSize: 32,
    marginTop: 12,
  },
  resultSubtitle: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    color: GamesPalette.subtitle,
    textAlign: 'center',
    marginTop: 8,
  },
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FCEFC7',
    borderWidth: 2,
    borderColor: GamesPalette.amberAccent,
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
    backgroundColor: GamesPalette.amberAccent,
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
    borderColor: GamesPalette.navyAccent,
    borderRadius: 32,
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginTop: 12,
  },
  backToGamesButtonText: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    fontWeight: '700',
    color: GamesPalette.navyAccent,
  },
});
