// Go Fish, reproduced from the design export: an "Opponent · N cards" panel, a draw-pile row with
// count, a "Sets: You x · Opponent y" tally of colored squares, your hand of playing cards, and a
// big "GOT ANY Ns?" ask button — inside the shared GameFrame. Tap a card to choose the rank, say the
// pill word to ask; if Fin has it you land a set, otherwise you go fish and draw.

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

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = [
  { s: '♥', red: true },
  { s: '♦', red: true },
  { s: '♠', red: false },
  { s: '♣', red: false },
];
type PlayCard = { rank: string; suit: string; red: boolean };
const draw = (): PlayCard => {
  const su = SUITS[Math.floor(Math.random() * SUITS.length)];
  return { rank: RANKS[Math.floor(Math.random() * RANKS.length)], suit: su.s, red: su.red };
};

export function GoFishGame() {
  const { recordGameResult } = useProgress();
  const { activeStrategy, difficultyTier } = useStrategy();
  const speechMetric = useSpeechMetric(activeStrategy);
  const categoryKey = categoryKeyForStrategy(STRATEGY_META[activeStrategy].label) ?? 'easy-onset';

  const [hand, setHand] = useState<PlayCard[]>(() => Array.from({ length: 5 }, draw));
  const [selRank, setSelRank] = useState<number>(0);
  const [oppCount, setOppCount] = useState(7);
  const [drawPile, setDrawPile] = useState(28);
  const [sets, setSets] = useState({ you: 0, opp: 0 });
  const [note, setNote] = useState('');
  const [currentWord, setCurrentWord] = useState(() => pickPracticeItems(difficultyTier, 1)[0] ?? 'rainbow');

  const attemptsRef = useRef(0);
  const wordPoolRef = useRef<string[]>(pickPracticeItems(difficultyTier, 14));
  const wordCounterRef = useRef(0);
  const statAttempt = useRef(0);
  const statCorrect = useRef(0);
  const scoresRef = useRef<number[]>([]);
  const startRef = useRef(Date.now());

  const askRank = hand[selRank]?.rank ?? '7';

  const nextWord = () => {
    const w = wordPoolRef.current[wordCounterRef.current % wordPoolRef.current.length];
    wordCounterRef.current += 1;
    setCurrentWord(w);
  };

  const ask = () => {
    const gotIt = Math.random() < 0.5 && oppCount > 0;
    if (gotIt) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setNote(`Fin had a ${askRank}! You made a set 🎉`);
      setSets((s) => {
        const you = s.you + 1;
        recordGameResult({
          gameKey: 'go-fish',
          categoryKey,
          stars: 3,
          gameName: 'Go Fish',
          wordsAttempted: statAttempt.current,
          wordsCorrect: statCorrect.current,
          durationSeconds: Math.round((Date.now() - startRef.current) / 1000),
          strategyScore: scoresRef.current.length ? scoresRef.current.reduce((a, b) => a + b, 0) / scoresRef.current.length / 100 : 0,
        });
        return { ...s, you };
      });
      setOppCount((n) => Math.max(0, n - 1));
      setHand((h) => {
        const nh = h.filter((_, i) => i !== selRank);
        setSelRank(0);
        return nh.length ? nh : Array.from({ length: 5 }, draw);
      });
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setNote('Go fish! 🎣');
      setDrawPile((d) => Math.max(0, d - 1));
      setHand((h) => [...h, draw()]);
      // Fin occasionally banks a set on its turn.
      if (Math.random() < 0.35) setSets((s) => ({ ...s, opp: s.opp + 1 }));
    }
  };

  const handleMic = async () => {
    if (speechMetric.isRecording) return speechMetric.stop();
    const result = await speechMetric.start();
    if (speechMetric.permissionDenied || result.noSpeechDetected) return;
    attemptsRef.current += 1;
    statAttempt.current += 1;
    scoresRef.current.push(result.score);
    const tier = getFeedbackTier(result.score, attemptsRef.current);
    if (tier === 'excellent' || tier === 'good') {
      statCorrect.current += 1;
      attemptsRef.current = 0;
      nextWord();
      ask();
    } else if (tier === 'skip' || attemptsRef.current >= MAX_ATTEMPTS_PER_WORD) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      attemptsRef.current = 0;
      nextWord();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  return (
    <GameFrame
      title="Go Fish"
      currentWord={currentWord}
      onMicPress={handleMic}
      isRecording={speechMetric.isRecording}
      micDisabled={speechMetric.isPrepping || speechMetric.isProcessing}
      waveformLevels={speechMetric.liveWaveform}>
      <View style={styles.body}>
        <View style={styles.oppPanel}>
          <Text style={styles.subLabel}>Opponent · {oppCount} cards</Text>
          <View style={styles.backRow}>
            {Array.from({ length: Math.min(oppCount, 7) }, (_, i) => (
              <View key={i} style={styles.cardBack}>
                <View style={styles.cardBackDot} />
              </View>
            ))}
          </View>
        </View>

        <View style={styles.pileRow}>
          {Array.from({ length: 5 }, (_, i) => (
            <View key={i} style={[styles.cardBack, styles.pileCard]}>
              <View style={styles.cardBackDot} />
            </View>
          ))}
        </View>
        <Text style={styles.subLabel}>Draw Pile: {drawPile}</Text>

        <View style={styles.setsPanel}>
          <Text style={styles.setsTitle}>
            Sets: You {sets.you} · Opponent {sets.opp}
          </Text>
          <View style={styles.setsRow}>
            {Array.from({ length: 8 }, (_, i) => {
              const isYou = i < sets.you;
              const isOpp = i >= sets.you && i < sets.you + sets.opp;
              return <View key={i} style={[styles.setSquare, isYou && styles.setYou, isOpp && styles.setOpp]} />;
            })}
          </View>
        </View>

        <Text style={styles.subLabel}>Your Hand</Text>
        <View style={styles.handRow}>
          {hand.slice(0, 6).map((c, i) => (
            <Pressable key={i} onPress={() => setSelRank(i)} style={[styles.playCard, selRank === i && styles.playCardSel]}>
              <Text style={[styles.playRank, { color: c.red ? MockupPalette.coral : MockupPalette.title }]}>{c.rank}</Text>
              <Text style={[styles.playSuit, { color: c.red ? MockupPalette.coral : MockupPalette.title }]}>{c.suit}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={handleMic} style={({ pressed }) => [styles.askBtn, pressed && styles.pressedBtn]}>
          <Text style={styles.askText}>{note || `GOT ANY ${askRank}s?`}</Text>
        </Pressable>
      </View>
    </GameFrame>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  subLabel: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '700',
    color: MockupPalette.subtitle,
  },
  oppPanel: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: MockupPalette.cream,
    borderRadius: 16,
    paddingVertical: 10,
    gap: 8,
  },
  backRow: {
    flexDirection: 'row',
    gap: 6,
  },
  pileRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  cardBack: {
    width: 40,
    height: 56,
    borderRadius: 8,
    backgroundColor: MockupPalette.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pileCard: {
    width: 44,
    height: 60,
  },
  cardBackDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: MockupPalette.cream,
  },
  setsPanel: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: MockupPalette.cream,
    borderRadius: 16,
    paddingVertical: 12,
    gap: 8,
  },
  setsTitle: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    fontWeight: '800',
    color: MockupPalette.navy,
  },
  setsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  setSquare: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: MockupPalette.lightBlue,
  },
  setYou: {
    backgroundColor: MockupPalette.coral,
  },
  setOpp: {
    backgroundColor: MockupPalette.yellow,
  },
  handRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  playCard: {
    width: 48,
    height: 66,
    borderRadius: 8,
    backgroundColor: MockupPalette.cream,
    borderWidth: 1.5,
    borderColor: MockupPalette.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCardSel: {
    borderColor: MockupPalette.navy,
    borderWidth: 2.5,
    transform: [{ translateY: -5 }],
  },
  playRank: {
    fontFamily: Fonts.rounded,
    fontSize: 18,
    fontWeight: '800',
  },
  playSuit: {
    fontSize: 18,
  },
  askBtn: {
    alignSelf: 'stretch',
    backgroundColor: MockupPalette.navy,
    borderRadius: 20,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 2,
  },
  askText: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#FFFFFF',
  },
  pressedBtn: {
    opacity: 0.85,
  },
});
