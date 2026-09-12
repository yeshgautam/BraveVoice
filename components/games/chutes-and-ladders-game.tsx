// Chutes & Ladders, reproduced from the design export: a winding numbered board (1-30) of colored
// cells with ladders (climb up) and chutes (slide down), a START marker, a turn line, and a SPIN
// button — inside the shared GameFrame. Say the pill word (or tap SPIN) to roll and move your
// penguin; ladders lift you, chutes drop you. First to 30 wins, then the board resets.

import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { GameFrame } from '@/components/games/game-frame';
import { Fonts } from '@/constants/theme';
import { MockupPalette } from '@/constants/games-theme';
import { pickPracticeItems } from '@/content/practiceWords';
import { categoryKeyForStrategy, useProgress } from '@/contexts/progress-context';
import { STRATEGY_META, useStrategy } from '@/contexts/strategy-context';
import { useSpeechMetric } from '@/game-engine/useSpeechMetric';
import { MAX_ATTEMPTS_PER_WORD, getFeedbackTier } from '@/utils/speech-analysis';

const COLS = 6;
const ROWS = 5;
const CW = 56;
const CH = 46;
const CELL_COLORS = [MockupPalette.yellow, MockupPalette.coral, MockupPalette.navy, '#7FBEEA'];
// Ladders lift you up, chutes drop you down.
const LADDERS: Record<number, number> = { 3: 22, 5: 8, 11: 28 };
const CHUTES: Record<number, number> = { 17: 4, 20: 7, 27: 13 };

function cellXY(n: number) {
  const idx = n - 1;
  const r = Math.floor(idx / COLS);
  const inRow = idx % COLS;
  const col = r % 2 === 0 ? inRow : COLS - 1 - inRow;
  const renderRow = ROWS - 1 - r;
  return { x: col * CW, y: renderRow * CH, col, renderRow };
}

function connector(a: number, b: number, color: string, key: string) {
  const p1 = cellXY(a);
  const p2 = cellXY(b);
  const x1 = p1.x + CW / 2;
  const y1 = p1.y + CH / 2;
  const x2 = p2.x + CW / 2;
  const y2 = p2.y + CH / 2;
  const len = Math.hypot(x2 - x1, y2 - y1);
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  return (
    <View
      key={key}
      pointerEvents="none"
      style={{ position: 'absolute', left: (x1 + x2) / 2 - len / 2, top: (y1 + y2) / 2 - 2, width: len, height: 4, borderRadius: 2, backgroundColor: color, transform: [{ rotate: `${angle}deg` }] }}
    />
  );
}

export function ChutesAndLaddersGame() {
  const { recordGameResult } = useProgress();
  const { activeStrategy, difficultyTier } = useStrategy();
  const speechMetric = useSpeechMetric(activeStrategy);
  const categoryKey = categoryKeyForStrategy(STRATEGY_META[activeStrategy].label) ?? 'easy-onset';

  const [pos, setPos] = useState(1);
  const [die, setDie] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [currentWord, setCurrentWord] = useState(() => pickPracticeItems(difficultyTier, 1)[0] ?? 'rainbow');
  const tx = useSharedValue(cellXY(1).x);
  const ty = useSharedValue(cellXY(1).y);

  const attemptsRef = useRef(0);
  const wordPoolRef = useRef<string[]>(pickPracticeItems(difficultyTier, 14));
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

  const moveTo = (n: number) => {
    const xy = cellXY(n);
    tx.value = withSpring(xy.x, { damping: 14, stiffness: 130 });
    ty.value = withSpring(xy.y, { damping: 14, stiffness: 130 });
    setPos(n);
  };

  const roll = () => {
    const d = 1 + Math.floor(Math.random() * 6);
    setDie(d);
    let n = Math.min(30, pos + d);
    if (LADDERS[n]) n = LADDERS[n];
    else if (CHUTES[n]) n = CHUTES[n];
    moveTo(n);
    if (n >= 30) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setBanner('You reached the top! 🎉');
      recordGameResult({
        gameKey: 'chutes-and-ladders',
        categoryKey,
        stars: 3,
        gameName: 'Chutes & Ladders',
        wordsAttempted: statAttempt.current,
        wordsCorrect: statCorrect.current,
        durationSeconds: Math.round((Date.now() - startRef.current) / 1000),
        strategyScore: scoresRef.current.length ? scoresRef.current.reduce((a, b) => a + b, 0) / scoresRef.current.length / 100 : 0,
      });
      setTimeout(() => {
        setPos(1);
        moveTo(1);
        setDie(0);
        setBanner(null);
        startRef.current = Date.now();
        statAttempt.current = 0;
        statCorrect.current = 0;
        scoresRef.current = [];
      }, 1700);
    }
  };

  const handleMic = async () => {
    if (banner) return;
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
      roll();
    } else if (tier === 'skip' || attemptsRef.current >= MAX_ATTEMPTS_PER_WORD) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      attemptsRef.current = 0;
      nextWord();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const tokenStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }, { translateY: ty.value }] }));

  return (
    <GameFrame
      title="Chutes & Ladders"
      currentWord={currentWord}
      onMicPress={handleMic}
      isRecording={speechMetric.isRecording}
      micDisabled={banner !== null || speechMetric.isPrepping || speechMetric.isProcessing}
      waveformLevels={speechMetric.liveWaveform}>
      <View style={styles.body}>
        <Text style={styles.turn}>{banner ?? 'Your Turn'}</Text>

        <View style={[styles.board, { width: COLS * CW, height: ROWS * CH }]}>
          {Array.from({ length: 30 }, (_, i) => {
            const n = i + 1;
            const xy = cellXY(n);
            return (
              <View key={n} style={[styles.cell, { left: xy.x, top: xy.y, backgroundColor: CELL_COLORS[(xy.renderRow + xy.col) % CELL_COLORS.length] }]}>
                <Text style={styles.cellNum}>{n}</Text>
              </View>
            );
          })}
          {Object.entries(LADDERS).map(([a, b]) => connector(Number(a), b, '#B5813A', `L${a}`))}
          {Object.entries(CHUTES).map(([a, b]) => connector(Number(a), b, '#5AB0E0', `C${a}`))}
          <View style={[styles.startTag, { left: cellXY(1).x, top: cellXY(1).y - 20 }]}>
            <Text style={styles.startText}>START</Text>
          </View>
          <Animated.View style={[styles.token, tokenStyle]}>
            <Text style={styles.tokenEmoji}>🐧</Text>
          </Animated.View>
        </View>

        <Pressable onPress={handleMic} style={({ pressed }) => [styles.spinBtn, pressed && styles.pressed]}>
          <Text style={styles.spinText}>{die > 0 ? `🎲 ${die} — SPIN` : 'SPIN'}</Text>
        </Pressable>
        <Text style={styles.hint}>Tap the mic to spin!</Text>
      </View>
    </GameFrame>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 12,
    gap: 16,
  },
  turn: {
    fontFamily: Fonts.rounded,
    fontSize: 18,
    fontWeight: '800',
    color: MockupPalette.navy,
  },
  board: {
    position: 'relative',
  },
  cell: {
    position: 'absolute',
    width: CW - 3,
    height: CH - 3,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellNum: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  startTag: {
    position: 'absolute',
    backgroundColor: MockupPalette.navy,
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  startText: {
    fontFamily: Fonts.rounded,
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  token: {
    position: 'absolute',
    width: CW - 3,
    height: CH - 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenEmoji: {
    fontSize: 30,
  },
  spinBtn: {
    alignSelf: 'stretch',
    marginHorizontal: 20,
    backgroundColor: MockupPalette.coral,
    borderRadius: 22,
    paddingVertical: 16,
    alignItems: 'center',
  },
  spinText: {
    fontFamily: Fonts.rounded,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#FFFFFF',
  },
  hint: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    fontWeight: '600',
    color: MockupPalette.subtitle,
  },
  pressed: {
    opacity: 0.85,
  },
});
