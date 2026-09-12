// Memory Find, reproduced from the design export: a 4x4 grid of navy "?" cards (a flipped card
// shows its emoji on a coral tile), and RED / BLACK score cards below — inside the shared GameFrame.
// Say the pill word to flip the tapped card; flip two matching cards to score RED, a mismatch adds
// to BLACK and flips them back. Clear the board to re-shuffle.

import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { GameFrame } from '@/components/games/game-frame';
import { Fonts } from '@/constants/theme';
import { MockupPalette } from '@/constants/games-theme';
import { pickPracticeItems } from '@/content/practiceWords';
import { categoryKeyForStrategy, useProgress } from '@/contexts/progress-context';
import { STRATEGY_META, useStrategy } from '@/contexts/strategy-context';
import { useSpeechMetric } from '@/game-engine/useSpeechMetric';
import { MAX_ATTEMPTS_PER_WORD, getFeedbackTier } from '@/utils/speech-analysis';

const PAIRS = ['🐻', '🐧', '🐟', '🦭', '🐳', '🦈', '🐙', '⭐'];
type Card = { emoji: string; matched: boolean; up: boolean };

function makeDeck(): Card[] {
  const d = [...PAIRS, ...PAIRS].map((emoji) => ({ emoji, matched: false, up: false }));
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

export function MemoryFindGame() {
  const { recordGameResult } = useProgress();
  const { activeStrategy, difficultyTier } = useStrategy();
  const speechMetric = useSpeechMetric(activeStrategy);
  const categoryKey = categoryKeyForStrategy(STRATEGY_META[activeStrategy].label) ?? 'easy-onset';

  const [deck, setDeck] = useState<Card[]>(makeDeck);
  const [selected, setSelected] = useState<number | null>(null);
  const [firstPick, setFirstPick] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [score, setScore] = useState({ red: 0, black: 0 });
  const [currentWord, setCurrentWord] = useState(() => pickPracticeItems(difficultyTier, 1)[0] ?? 'rainbow');

  const attemptsRef = useRef(0);
  const wordPoolRef = useRef<string[]>(pickPracticeItems(difficultyTier, 16));
  const wordCounterRef = useRef(0);
  const statAttempt = useRef(0);
  const statCorrect = useRef(0);
  const scoresRef = useRef<number[]>([]);
  const startRef = useRef(Date.now());

  const nextWord = () => {
    const w = wordPoolRef.current[wordCounterRef.current % wordPoolRef.current.length];
    wordCounterRef.current += 1;
    setCurrentWord(w);
  };

  const handleCardPress = (i: number) => {
    if (locked || deck[i].up || deck[i].matched || selected === i) return;
    setSelected(i);
    attemptsRef.current = 0;
    nextWord();
  };

  const resolve = (flipped: Card[], i: number) => {
    if (firstPick === null) {
      setDeck(flipped);
      setFirstPick(i);
      setSelected(null);
      return;
    }
    const a = firstPick;
    setDeck(flipped);
    setSelected(null);
    if (flipped[a].emoji === flipped[i].emoji) {
      setLocked(true);
      setTimeout(() => {
        setDeck((d) => d.map((c, idx) => (idx === a || idx === i ? { ...c, matched: true } : c)));
        setFirstPick(null);
        setLocked(false);
        setScore((s) => {
          const red = s.red + 1;
          if (red >= PAIRS.length) {
            recordGameResult({
              gameKey: 'memory-find',
              categoryKey,
              stars: 3,
              gameName: 'Memory Find',
              wordsAttempted: statAttempt.current,
              wordsCorrect: statCorrect.current,
              durationSeconds: Math.round((Date.now() - startRef.current) / 1000),
              strategyScore: scoresRef.current.length ? scoresRef.current.reduce((x, y) => x + y, 0) / scoresRef.current.length / 100 : 0,
            });
            setTimeout(() => {
              setDeck(makeDeck());
              setScore({ red: 0, black: 0 });
              statAttempt.current = 0;
              statCorrect.current = 0;
              scoresRef.current = [];
              startRef.current = Date.now();
            }, 1400);
          }
          return { ...s, red };
        });
      }, 550);
    } else {
      setLocked(true);
      setScore((s) => ({ ...s, black: s.black + 1 }));
      setTimeout(() => {
        setDeck((d) => d.map((c, idx) => (idx === a || idx === i ? { ...c, up: false } : c)));
        setFirstPick(null);
        setLocked(false);
      }, 900);
    }
  };

  const handleMic = async () => {
    if (selected === null || locked) return;
    if (speechMetric.isRecording) return speechMetric.stop();
    const result = await speechMetric.start();
    if (speechMetric.permissionDenied || result.noSpeechDetected) return;
    attemptsRef.current += 1;
    statAttempt.current += 1;
    scoresRef.current.push(result.score);
    const tier = getFeedbackTier(result.score, attemptsRef.current);
    if (tier === 'excellent' || tier === 'good') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      statCorrect.current += 1;
      const flipped = deck.map((c, idx) => (idx === selected ? { ...c, up: true } : c));
      resolve(flipped, selected);
    } else if (tier === 'skip' || attemptsRef.current >= MAX_ATTEMPTS_PER_WORD) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setSelected(null);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  return (
    <GameFrame
      title="Memory Find"
      currentWord={currentWord}
      onMicPress={handleMic}
      isRecording={speechMetric.isRecording}
      micDisabled={selected === null || locked || speechMetric.isPrepping || speechMetric.isProcessing}
      waveformLevels={speechMetric.liveWaveform}>
      <View style={styles.body}>
        <View style={styles.grid}>
          {deck.map((card, i) => {
            const shown = card.up || card.matched;
            return (
              <Pressable
                key={i}
                onPress={() => handleCardPress(i)}
                disabled={locked || shown}
                style={[styles.card, shown ? styles.cardUp : styles.cardDown, selected === i && styles.cardSelected]}>
                <Text style={shown ? styles.cardEmoji : styles.cardQ}>{shown ? card.emoji : '?'}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.divider} />

        <View style={styles.scores}>
          <View style={styles.scoreCard}>
            <Text style={[styles.scoreLabel, { color: MockupPalette.coral }]}>RED</Text>
            <Text style={styles.scoreValue}>{score.red}</Text>
          </View>
          <View style={styles.scoreCard}>
            <Text style={[styles.scoreLabel, { color: MockupPalette.navy }]}>BLACK</Text>
            <Text style={styles.scoreValue}>{score.black}</Text>
          </View>
        </View>
      </View>
    </GameFrame>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: 4 * 76 + 3 * 10,
    justifyContent: 'center',
  },
  card: {
    width: 76,
    height: 76,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDown: {
    backgroundColor: MockupPalette.slate,
  },
  cardUp: {
    backgroundColor: MockupPalette.coral,
  },
  cardSelected: {
    borderWidth: 3,
    borderColor: MockupPalette.amber,
  },
  cardQ: {
    fontFamily: Fonts.rounded,
    fontSize: 28,
    fontWeight: '800',
    color: '#12203B',
  },
  cardEmoji: {
    fontSize: 34,
  },
  divider: {
    alignSelf: 'stretch',
    height: 8,
    borderRadius: 4,
    backgroundColor: MockupPalette.slate,
  },
  scores: {
    flexDirection: 'row',
    gap: 14,
    alignSelf: 'stretch',
  },
  scoreCard: {
    flex: 1,
    backgroundColor: MockupPalette.cream,
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 4,
  },
  scoreLabel: {
    fontFamily: Fonts.rounded,
    fontSize: 18,
    fontWeight: '800',
  },
  scoreValue: {
    fontFamily: Fonts.rounded,
    fontSize: 34,
    fontWeight: '800',
    color: MockupPalette.title,
  },
});
