// Flip-and-match card game for 8+ mode. Tap a face-down card, say the word to flip it, and find
// all four matching pairs. Deliberately NOT built on GameScreen.tsx — that shell assumes exactly 5
// fixed rounds, but a match game runs a variable number of flips until every pair is found, so it
// composes the same primitives (useSpeechMetric, MicPermissionGate, FinCharacter, Snowfall,
// SmoothSailingSlider, the strategy/tier contexts, useProgress) directly instead — the same shape
// tic-tac-toe-game.tsx uses.

import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { LiveWaveform } from '@/components/games/live-waveform';
import { SmoothSailingSlider } from '@/components/games/smooth-sailing-slider';
import { StrategySwitcherModal } from '@/components/games/strategy-switcher-modal';
import { Fonts } from '@/constants/theme';
import { GamesPalette } from '@/constants/games-theme';
import { pickPracticeItems } from '@/content/practiceWords';
import { useFluencyRatings } from '@/contexts/fluency-rating-context';
import { categoryKeyForStrategy, useProgress } from '@/contexts/progress-context';
import { STRATEGY_META, useStrategy } from '@/contexts/strategy-context';
import { FinCharacter, FinState } from '@/game-engine/FinCharacter';
import { MicPermissionGate } from '@/game-engine/MicPermissionGate';
import { Snowfall } from '@/game-engine/Snowfall';
import { useSpeechMetric } from '@/game-engine/useSpeechMetric';
import { MAX_ATTEMPTS_PER_WORD, getFeedbackMessage, getFeedbackTier } from '@/utils/speech-analysis';

type Card = { emoji: string; matched: boolean; faceUp: boolean };
type MatchPhase = 'playing' | 'roundEnd' | 'rating' | 'summary';

const PAIR_SET = ['🐧', '🐟', '🧊', '❄️', '🐳', '🦭', '⭐', '🐙', '🦈', '🐚'];
const TOTAL_PAIRS = PAIR_SET.length; // 10 pairs → 20 cards

function makeDeck(): Card[] {
  const doubled = [...PAIR_SET, ...PAIR_SET];
  for (let i = doubled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [doubled[i], doubled[j]] = [doubled[j], doubled[i]];
  }
  return doubled.map((emoji) => ({ emoji, matched: false, faceUp: false }));
}

export function MemoryMatchGame() {
  const router = useRouter();
  const { recordGameResult } = useProgress();
  const { recordFluencyRating } = useFluencyRatings();
  const { activeStrategy, difficultyTier } = useStrategy();

  const [phase, setPhase] = useState<MatchPhase>('playing');
  const [deck, setDeck] = useState<Card[]>(() => makeDeck());
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [firstPick, setFirstPick] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [currentWord, setCurrentWord] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [finState, setFinState] = useState<FinState>('idle');
  const [strategyModalOpen, setStrategyModalOpen] = useState(false);

  const attemptsRef = useRef(0);
  const wordsAttemptedRef = useRef(0);
  const wordsCorrectRef = useRef(0);
  const sessionStartRef = useRef(Date.now());
  const scoresRef = useRef<number[]>([]);
  const wordPoolRef = useRef<string[]>(pickPracticeItems(difficultyTier, 20));
  const wordCounterRef = useRef(0);

  const speechMetric = useSpeechMetric(activeStrategy);
  const categoryKey = categoryKeyForStrategy(STRATEGY_META[activeStrategy].label) ?? 'easy-onset';

  useEffect(() => {
    if (selectedCard === null) return;
    if (speechMetric.isProcessing) setFinState('thinking');
    else if (speechMetric.isRecording) setFinState('listening');
  }, [speechMetric.isRecording, speechMetric.isProcessing, selectedCard]);

  const startMatch = () => {
    setDeck(makeDeck());
    setSelectedCard(null);
    setFirstPick(null);
    setLocked(false);
    setMatchedPairs(0);
    setCurrentWord('');
    setAttempt(0);
    setFeedback('');
    setFinState('idle');
    attemptsRef.current = 0;
    wordsAttemptedRef.current = 0;
    wordsCorrectRef.current = 0;
    scoresRef.current = [];
    wordCounterRef.current = 0;
    sessionStartRef.current = Date.now();
    setPhase('playing');
  };

  const finishMatch = () => {
    setPhase('roundEnd');
    setFinState('celebrating');
  };

  const handleCardPress = (index: number) => {
    if (phase !== 'playing' || locked) return;
    if (deck[index].matched || deck[index].faceUp) return;
    if (selectedCard === index) return;
    setSelectedCard(index);
    setAttempt(0);
    attemptsRef.current = 0;
    setFeedback('');
    const word = wordPoolRef.current[wordCounterRef.current % wordPoolRef.current.length];
    wordCounterRef.current += 1;
    setCurrentWord(word);
  };

  const resolveFlip = (flipped: Card[], index: number) => {
    if (firstPick === null) {
      // First card of the pair — flip it up and wait for the second.
      setDeck(flipped);
      setFirstPick(index);
      setSelectedCard(null);
      setFinState('idle');
      return;
    }

    const a = firstPick;
    const b = index;
    setDeck(flipped);
    setSelectedCard(null);

    if (flipped[a].emoji === flipped[b].emoji) {
      setLocked(true);
      setTimeout(() => {
        setDeck((d) => d.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c)));
        setFirstPick(null);
        setLocked(false);
        setFinState('idle');
        setMatchedPairs((m) => {
          const next = m + 1;
          if (next >= TOTAL_PAIRS) setTimeout(finishMatch, 450);
          return next;
        });
      }, 550);
    } else {
      // No match — flip both back down after a beat so the child can remember them.
      setLocked(true);
      setTimeout(() => {
        setDeck((d) => d.map((c, i) => (i === a || i === b ? { ...c, faceUp: false } : c)));
        setFirstPick(null);
        setLocked(false);
        setFinState('idle');
      }, 950);
    }
  };

  const handleMicPress = async () => {
    if (selectedCard === null) return;
    if (speechMetric.isRecording) {
      speechMetric.stop();
      return;
    }
    setFeedback('');
    const result = await speechMetric.start();
    if (speechMetric.permissionDenied) {
      setFinState('idle');
      return;
    }
    if (result.noSpeechDetected) {
      setFinState('encouraging');
      setFeedback("Didn't catch that — try again! 💛");
      setTimeout(() => {
        setFinState('idle');
        setFeedback('');
      }, 1400);
      return;
    }

    attemptsRef.current += 1;
    wordsAttemptedRef.current += 1;
    scoresRef.current.push(result.score);
    const tier = getFeedbackTier(result.score, attemptsRef.current);
    const success = tier === 'excellent' || tier === 'good';
    setFeedback(getFeedbackMessage(tier));

    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      wordsCorrectRef.current += 1;
      setFinState('celebrating');
      const flipped = deck.map((c, i) => (i === selectedCard ? { ...c, faceUp: true } : c));
      resolveFlip(flipped, selectedCard);
    } else if (tier === 'skip' || attemptsRef.current >= MAX_ATTEMPTS_PER_WORD) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setFinState('encouraging');
      setTimeout(() => {
        setSelectedCard(null);
        setAttempt(0);
        setFinState('idle');
      }, 1100);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setFinState('encouraging');
      setAttempt((a) => a + 1);
      setTimeout(() => setFinState('idle'), 900);
    }
  };

  const accuracy = wordsAttemptedRef.current > 0 ? wordsCorrectRef.current / wordsAttemptedRef.current : 0;
  const stars = accuracy >= 0.8 ? 3 : accuracy >= 0.6 ? 2 : 1;

  const finishSession = () => {
    const avgScore = scoresRef.current.length
      ? scoresRef.current.reduce((a, b) => a + b, 0) / scoresRef.current.length / 100
      : 0;
    recordGameResult({
      gameKey: 'memory-match',
      categoryKey,
      stars,
      gameName: 'Memory Match',
      wordsAttempted: wordsAttemptedRef.current,
      wordsCorrect: wordsCorrectRef.current,
      durationSeconds: Math.round((Date.now() - sessionStartRef.current) / 1000),
      strategyScore: avgScore,
    });
    setPhase('summary');
  };

  return (
    <MicPermissionGate>
      <View style={styles.root}>
        <Snowfall />

        <View style={styles.topBar}>
          <Pressable style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]} onPress={() => router.back()}>
            <Text style={styles.iconButtonText}>← Back</Text>
          </Pressable>
          <Text style={styles.title}>Memory Match</Text>
          <Pressable
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            onPress={() => setStrategyModalOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Strategy settings">
            <Text style={styles.iconButtonText}>⚙️</Text>
          </Pressable>
        </View>

        <Text style={styles.strategyLabel}>Strategy: {STRATEGY_META[activeStrategy].label}</Text>

        {phase === 'playing' && (
          <View style={styles.playArea}>
            <Text style={styles.turnIndicator}>Pairs found: {matchedPairs} of {TOTAL_PAIRS}</Text>

            <View style={styles.board}>
              {deck.map((card, i) => {
                const revealed = card.faceUp || card.matched;
                return (
                  <Pressable
                    key={i}
                    style={[styles.card, selectedCard === i && styles.cardSelected, card.matched && styles.cardMatched]}
                    onPress={() => handleCardPress(i)}
                    disabled={revealed || locked}>
                    <Text style={styles.cardEmoji}>{revealed ? card.emoji : '❔'}</Text>
                  </Pressable>
                );
              })}
            </View>

            {selectedCard !== null && (
              <View style={styles.speakRow}>
                <FinCharacter state={finState} size={80} />
                <View style={styles.wordBubble}>
                  <Text style={styles.wordText}>{currentWord.toUpperCase()}</Text>
                </View>
                <Text style={styles.feedbackText}>
                  {speechMetric.isPrepping
                    ? 'Get ready…'
                    : speechMetric.isRecording
                      ? 'Listening…'
                      : speechMetric.isProcessing
                        ? 'Thinking…'
                        : feedback || 'Tap the mic and say it!'}
                </Text>
                {speechMetric.isRecording && (
                  <LiveWaveform levels={speechMetric.liveWaveform} color={GamesPalette.navyAccent} height={30} />
                )}
                <Pressable
                  style={({ pressed }) => [styles.micButton, speechMetric.isRecording && styles.micButtonActive, pressed && styles.pressed]}
                  disabled={speechMetric.isPrepping || speechMetric.isProcessing}
                  onPress={handleMicPress}>
                  <Text style={styles.micIcon}>🎤</Text>
                </Pressable>
                {attempt > 0 && <Text style={styles.attemptHint}>Try {attempt + 1} of {MAX_ATTEMPTS_PER_WORD}</Text>}
              </View>
            )}
          </View>
        )}

        {phase === 'roundEnd' && (
          <View style={styles.center}>
            <FinCharacter state="celebrating" size={150} />
            <Text style={styles.modeTitle}>You found every pair! 🎉</Text>
            <Pressable style={({ pressed }) => [styles.modeButton, pressed && styles.pressed]} onPress={() => setPhase('rating')}>
              <Text style={styles.modeButtonText}>Continue</Text>
            </Pressable>
          </View>
        )}

        {phase === 'rating' && (
          <SmoothSailingSlider
            onSelect={(rating) => {
              recordFluencyRating('memory-match', rating);
              finishSession();
            }}
          />
        )}

        {phase === 'summary' && (
          <View style={styles.center}>
            <FinCharacter state="celebrating" size={150} />
            <Text style={styles.modeTitle}>{'⭐'.repeat(stars) || '💪'}</Text>
            <Text style={styles.summaryText}>
              {wordsCorrectRef.current} of {wordsAttemptedRef.current} words practiced smoothly!
            </Text>
            <Pressable style={({ pressed }) => [styles.modeButton, pressed && styles.pressed]} onPress={startMatch}>
              <Text style={styles.modeButtonText}>Play Again</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.modeButtonSecondary, pressed && styles.pressed]} onPress={() => router.back()}>
              <Text style={styles.modeButtonSecondaryText}>Back to Games</Text>
            </Pressable>
          </View>
        )}

        <StrategySwitcherModal visible={strategyModalOpen} onClose={() => setStrategyModalOpen(false)} />
      </View>
    </MicPermissionGate>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: GamesPalette.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
  },
  iconButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: GamesPalette.navyAccent,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  iconButtonText: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    fontWeight: '700',
    color: GamesPalette.navyAccent,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 20,
    fontWeight: '800',
    color: GamesPalette.title,
  },
  strategyLabel: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    fontWeight: '700',
    color: GamesPalette.subtitle,
    textAlign: 'center',
    marginTop: 4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 32,
  },
  modeTitle: {
    fontFamily: Fonts.rounded,
    fontSize: 22,
    fontWeight: '800',
    color: GamesPalette.title,
    textAlign: 'center',
  },
  modeButton: {
    backgroundColor: GamesPalette.amberAccent,
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 32,
    minWidth: 260,
    alignItems: 'center',
  },
  modeButtonText: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modeButtonSecondary: {
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 32,
    minWidth: 260,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: GamesPalette.navyAccent,
  },
  modeButtonSecondaryText: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '700',
    color: GamesPalette.navyAccent,
  },
  summaryText: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '600',
    color: GamesPalette.subtitle,
    textAlign: 'center',
  },
  playArea: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 8,
    gap: 14,
  },
  turnIndicator: {
    fontFamily: Fonts.rounded,
    fontSize: 17,
    fontWeight: '800',
    color: GamesPalette.title,
  },
  board: {
    width: 300,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  card: {
    width: 54,
    height: 66,
    backgroundColor: GamesPalette.navyAccent,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: GamesPalette.iceBorder,
  },
  cardSelected: {
    borderColor: GamesPalette.amberAccent,
    borderWidth: 3,
  },
  cardMatched: {
    backgroundColor: '#D6F0DE',
    borderColor: GamesPalette.successGreen,
  },
  cardEmoji: {
    fontSize: 26,
  },
  speakRow: {
    alignItems: 'center',
    gap: 8,
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
    fontSize: 20,
    fontWeight: '800',
    color: GamesPalette.title,
    letterSpacing: 1,
  },
  feedbackText: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '600',
    color: GamesPalette.subtitle,
    minHeight: 18,
  },
  micButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: GamesPalette.amberAccent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  micButtonActive: {
    opacity: 0.88,
  },
  micIcon: {
    fontSize: 28,
  },
  attemptHint: {
    fontFamily: Fonts.rounded,
    fontSize: 11,
    fontWeight: '600',
    color: GamesPalette.subtitle,
  },
  pressed: {
    opacity: 0.85,
  },
});
