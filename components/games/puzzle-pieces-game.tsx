// Puzzle Pieces, reproduced from the design export: a "Pieces: n/100 · Time" pill, a 10x10 pixel-art
// picture that snaps into place piece by piece, a palette swatch row, and a HINT button — inside the
// shared GameFrame. Say the pill word to place the next batch of pieces; complete the picture to win,
// then it re-scrambles.

import { useEffect, useMemo, useRef, useState } from 'react';
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

const HEX: Record<string, string> = {
  b: '#5CC0F0',
  r: MockupPalette.coral,
  s: '#F0C9A0',
  k: '#12203B',
  w: '#FFFFFF',
  y: MockupPalette.yellow,
};
// 10x10 pixel-art face.
const ART = [
  'bbbrrrrbbb',
  'bbrrrrrrbb',
  'bbrrrrrrrb',
  'bbsskssksb',
  'bbsssssssb',
  'bbsssksssb',
  'bwssssswwb',
  'rrwwwwwwrr',
  'rrwwykkwwr',
  'bkkkbbkkkb',
].join('');
const TOTAL = 100;
const REVEAL_PER = 12;
const PALETTE = ['y', 'k', 'r', 'r', 'r'];

export function PuzzlePiecesGame() {
  const { recordGameResult } = useProgress();
  const { activeStrategy, difficultyTier } = useStrategy();
  const speechMetric = useSpeechMetric(activeStrategy);
  const categoryKey = categoryKeyForStrategy(STRATEGY_META[activeStrategy].label) ?? 'easy-onset';

  const order = useMemo(() => {
    const a = Array.from({ length: TOTAL }, (_, i) => i);
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }, []);

  const [placed, setPlaced] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [currentWord, setCurrentWord] = useState(() => pickPracticeItems(difficultyTier, 1)[0] ?? 'rainbow');

  const attemptsRef = useRef(0);
  const wordPoolRef = useRef<string[]>(pickPracticeItems(difficultyTier, 14));
  const wordCounterRef = useRef(0);
  const statAttempt = useRef(0);
  const statCorrect = useRef(0);
  const scoresRef = useRef<number[]>([]);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  const shown = new Set(order.slice(0, placed));

  const nextWord = () => {
    const w = wordPoolRef.current[wordCounterRef.current % wordPoolRef.current.length];
    wordCounterRef.current += 1;
    setCurrentWord(w);
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      statCorrect.current += 1;
      attemptsRef.current = 0;
      nextWord();
      setPlaced((n) => {
        const nn = Math.min(TOTAL, n + REVEAL_PER);
        if (nn >= TOTAL) {
          recordGameResult({
            gameKey: 'puzzle-pieces',
            categoryKey,
            stars: 3,
            gameName: 'Puzzle Pieces',
            wordsAttempted: statAttempt.current,
            wordsCorrect: statCorrect.current,
            durationSeconds: Math.round((Date.now() - startRef.current) / 1000),
            strategyScore: scoresRef.current.length ? scoresRef.current.reduce((a, b) => a + b, 0) / scoresRef.current.length / 100 : 0,
          });
          setTimeout(() => {
            setPlaced(0);
            setSeconds(0);
            statAttempt.current = 0;
            statCorrect.current = 0;
            scoresRef.current = [];
            startRef.current = Date.now();
          }, 1800);
        }
        return nn;
      });
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
      title="Puzzle Pieces"
      currentWord={currentWord}
      onMicPress={handleMic}
      isRecording={speechMetric.isRecording}
      micDisabled={speechMetric.isPrepping || speechMetric.isProcessing}
      waveformLevels={speechMetric.liveWaveform}>
      <View style={styles.body}>
        <View style={styles.hud}>
          <Text style={styles.hudTitle}>Pieces: {placed}/{TOTAL}</Text>
          <Text style={styles.hudTime}>{mmss}</Text>
        </View>

        <View style={styles.grid}>
          {ART.split('').map((ch, i) => (
            <View key={i} style={[styles.pix, { backgroundColor: shown.has(i) ? HEX[ch] : '#EEF2F6' }]} />
          ))}
        </View>

        <View style={styles.palette}>
          {PALETTE.map((c, i) => (
            <View key={i} style={[styles.swatch, { backgroundColor: HEX[c] }]} />
          ))}
        </View>

        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setPlaced((n) => Math.min(TOTAL, n + REVEAL_PER));
          }}
          style={({ pressed }) => [styles.hintBtn, pressed && styles.pressed]}>
          <Text style={styles.hintText}>HINT</Text>
        </Pressable>
      </View>
    </GameFrame>
  );
}

const PIX = 28;

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 14,
  },
  hud: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: MockupPalette.cream,
    borderRadius: 14,
    paddingVertical: 10,
    gap: 2,
  },
  hudTitle: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '700',
    color: MockupPalette.title,
  },
  hudTime: {
    fontFamily: Fonts.rounded,
    fontSize: 20,
    fontWeight: '800',
    color: MockupPalette.title,
  },
  grid: {
    width: PIX * 10,
    height: PIX * 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 10,
    overflow: 'hidden',
  },
  pix: {
    width: PIX,
    height: PIX,
  },
  palette: {
    flexDirection: 'row',
    gap: 12,
    alignSelf: 'stretch',
    justifyContent: 'center',
    backgroundColor: MockupPalette.cream,
    borderRadius: 14,
    paddingVertical: 12,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  hintBtn: {
    alignSelf: 'stretch',
    backgroundColor: MockupPalette.lightBlue,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  hintText: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
    color: MockupPalette.navy,
  },
  pressed: {
    opacity: 0.85,
  },
});
