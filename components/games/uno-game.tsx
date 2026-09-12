// UNO, reproduced from the design export: an "Opponent · N cards" row of navy card backs, a cream
// tray showing the top discard → current color, "Your hand" of colored number cards, and DRAW /
// UNO! buttons — all inside the shared GameFrame. Tap a playable card (matches the current color
// or number), say the pill word to play it, then Fin answers. Empty your hand to win.

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

type UnoColor = 'navy' | 'coral' | 'yellow' | 'green';
type Card = { color: UnoColor; value: string };

const COLORS: UnoColor[] = ['navy', 'coral', 'yellow', 'green'];
const HEX: Record<UnoColor, string> = {
  navy: MockupPalette.navy,
  coral: MockupPalette.coral,
  yellow: MockupPalette.yellow,
  green: MockupPalette.green,
};
const rand = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const randomCard = (): Card => ({ color: rand(COLORS), value: Math.random() < 0.15 ? 'skip' : String(Math.floor(Math.random() * 10)) });
const label = (c: Card) => (c.value === 'skip' ? '⊘' : c.value);
const playable = (c: Card, top: Card, color: UnoColor) => c.color === color || c.value === top.value;

export function UnoGame() {
  const { recordGameResult } = useProgress();
  const { activeStrategy, difficultyTier } = useStrategy();
  const speechMetric = useSpeechMetric(activeStrategy);
  const categoryKey = categoryKeyForStrategy(STRATEGY_META[activeStrategy].label) ?? 'easy-onset';

  const [hand, setHand] = useState<Card[]>(() => Array.from({ length: 5 }, randomCard));
  const [oppCount, setOppCount] = useState(5);
  const [top, setTop] = useState<Card>(() => ({ color: rand(COLORS), value: String(Math.floor(Math.random() * 10)) }));
  const [color, setColor] = useState<UnoColor>('navy');
  const [selected, setSelected] = useState<number | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [currentWord, setCurrentWord] = useState(() => pickPracticeItems(difficultyTier, 1)[0] ?? 'rainbow');

  const attemptsRef = useRef(0);
  const wordPoolRef = useRef<string[]>(pickPracticeItems(difficultyTier, 14));
  const wordCounterRef = useRef(0);
  const statAttempt = useRef(0);
  const statCorrect = useRef(0);
  const scoresRef = useRef<number[]>([]);
  const startRef = useRef(Date.now());

  const busy = banner !== null;

  const nextWord = () => {
    const w = wordPoolRef.current[wordCounterRef.current % wordPoolRef.current.length];
    wordCounterRef.current += 1;
    setCurrentWord(w);
  };

  const finish = (won: boolean) => {
    setBanner(won ? 'You went out — you win! 🎉' : 'Fin went out! Nice game 🐧');
    recordGameResult({
      gameKey: 'uno',
      categoryKey,
      stars: won ? 3 : 1,
      gameName: 'UNO',
      wordsAttempted: statAttempt.current,
      wordsCorrect: statCorrect.current,
      durationSeconds: Math.round((Date.now() - startRef.current) / 1000),
      strategyScore: scoresRef.current.length ? scoresRef.current.reduce((a, b) => a + b, 0) / scoresRef.current.length / 100 : 0,
    });
  };

  const opponentTurn = (playedSkip: boolean) => {
    if (playedSkip) return; // your card skipped Fin — your turn again
    setTimeout(() => {
      setOppCount((n) => {
        // Fin "plays" a card ~70% of the time, else draws.
        if (Math.random() < 0.7 && n > 0) {
          const played: Card = { color: rand(COLORS), value: String(Math.floor(Math.random() * 10)) };
          setTop(played);
          setColor(played.color);
          if (n - 1 === 0) finish(false);
          return n - 1;
        }
        return n + 1;
      });
    }, 700);
  };

  const handleCardPress = (i: number) => {
    if (busy) return;
    if (!playable(hand[i], top, color)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    setSelected(i);
    attemptsRef.current = 0;
    nextWord();
  };

  const draw = () => {
    if (busy) return;
    Haptics.selectionAsync();
    setHand((h) => [...h, randomCard()]);
  };

  const handleMic = async () => {
    if (selected === null || busy) return;
    if (speechMetric.isRecording) return speechMetric.stop();
    const result = await speechMetric.start();
    if (speechMetric.permissionDenied || result.noSpeechDetected) return;

    attemptsRef.current += 1;
    statAttempt.current += 1;
    scoresRef.current.push(result.score);
    const tier = getFeedbackTier(result.score, attemptsRef.current);
    const success = tier === 'excellent' || tier === 'good';

    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      statCorrect.current += 1;
      const card = hand[selected];
      const remaining = hand.filter((_, idx) => idx !== selected);
      setHand(remaining);
      setTop(card);
      setColor(card.color);
      setSelected(null);
      if (remaining.length === 0) {
        finish(true);
        return;
      }
      opponentTurn(card.value === 'skip');
    } else if (tier === 'skip' || attemptsRef.current >= MAX_ATTEMPTS_PER_WORD) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setSelected(null);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const newGame = () => {
    setHand(Array.from({ length: 5 }, randomCard));
    setOppCount(5);
    setTop({ color: rand(COLORS), value: String(Math.floor(Math.random() * 10)) });
    setColor('navy');
    setSelected(null);
    setBanner(null);
    statAttempt.current = 0;
    statCorrect.current = 0;
    scoresRef.current = [];
    startRef.current = Date.now();
    nextWord();
  };

  return (
    <GameFrame
      title="UNO"
      currentWord={currentWord}
      onMicPress={handleMic}
      isRecording={speechMetric.isRecording}
      micDisabled={selected === null || busy || speechMetric.isPrepping || speechMetric.isProcessing}
      waveformLevels={speechMetric.liveWaveform}>
      <View style={styles.body}>
        <Text style={styles.subLabel}>Opponent · {oppCount} cards</Text>
        <View style={styles.oppRow}>
          {Array.from({ length: Math.min(oppCount, 7) }, (_, i) => (
            <View key={i} style={styles.cardBack}>
              <View style={styles.cardBackDot} />
            </View>
          ))}
        </View>

        <View style={styles.tray}>
          <View style={[styles.card, { backgroundColor: HEX[top.color] }]}>
            <Text style={styles.cardText}>{label(top)}</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
          <View style={[styles.card, styles.cardSmall, { backgroundColor: HEX[color] }]}>
            <View style={styles.colorDot} />
          </View>
        </View>

        <Text style={styles.subLabel}>Your hand</Text>
        <View style={styles.handRow}>
          {hand.slice(0, 7).map((c, i) => {
            const ok = playable(c, top, color);
            return (
              <Pressable
                key={i}
                onPress={() => handleCardPress(i)}
                disabled={busy}
                style={[styles.card, { backgroundColor: HEX[c.color] }, selected === i && styles.cardSelected, !ok && styles.cardDim]}>
                <Text style={styles.cardText}>{label(c)}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.btnRow}>
          <Pressable onPress={draw} disabled={busy} style={({ pressed }) => [styles.drawBtn, pressed && styles.pressed]}>
            <Text style={styles.drawText}>DRAW</Text>
          </Pressable>
          <Pressable
            onPress={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)}
            style={({ pressed }) => [styles.unoBtn, pressed && styles.pressed]}>
            <Text style={styles.unoText}>UNO!</Text>
          </Pressable>
        </View>

        <View style={styles.divider} />
        {banner && (
          <Pressable onPress={newGame} style={({ pressed }) => [styles.banner, pressed && styles.pressed]}>
            <Text style={styles.bannerText}>{banner}  ·  Tap to play again</Text>
          </Pressable>
        )}
      </View>
    </GameFrame>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 12,
  },
  subLabel: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '700',
    color: MockupPalette.subtitle,
  },
  oppRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cardBack: {
    width: 44,
    height: 62,
    borderRadius: 10,
    backgroundColor: MockupPalette.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBackDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: MockupPalette.cream,
  },
  tray: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    alignSelf: 'stretch',
    justifyContent: 'center',
    backgroundColor: MockupPalette.cream,
    borderRadius: 16,
    paddingVertical: 16,
  },
  card: {
    width: 52,
    height: 72,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSmall: {
    width: 48,
    height: 66,
  },
  cardText: {
    fontFamily: Fonts.rounded,
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  colorDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
  },
  arrow: {
    fontSize: 22,
    fontWeight: '800',
    color: MockupPalette.navy,
  },
  handRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  cardSelected: {
    borderWidth: 3,
    borderColor: MockupPalette.navy,
    transform: [{ translateY: -6 }],
  },
  cardDim: {
    opacity: 0.4,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 14,
    alignSelf: 'stretch',
  },
  drawBtn: {
    flex: 1,
    backgroundColor: MockupPalette.lightBlue,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  drawText: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '800',
    color: MockupPalette.navy,
  },
  unoBtn: {
    flex: 1,
    backgroundColor: MockupPalette.coral,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  unoText: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  divider: {
    alignSelf: 'stretch',
    height: 8,
    borderRadius: 4,
    backgroundColor: MockupPalette.slate,
    marginTop: 2,
  },
  banner: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: MockupPalette.cream,
    borderRadius: 14,
    paddingVertical: 12,
  },
  bannerText: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    fontWeight: '800',
    color: MockupPalette.navy,
  },
  pressed: {
    opacity: 0.85,
  },
});
