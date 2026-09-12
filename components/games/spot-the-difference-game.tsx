// Spot the Difference, reproduced from the design export: a "Found: n/7 · Time" pill, two flat
// scene panels (top original, bottom with the differences), a row of 7 progress rings, and a HINT
// button — inside the shared GameFrame. Say the pill word to circle the next difference on the
// bottom scene; find all seven to win, then the scene resets.

import { useEffect, useRef, useState } from 'react';
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

const TOTAL = 7;
// Where each found difference gets circled on the bottom scene.
const MARKS = [
  { left: 24, top: 18 },
  { left: 250, top: 20 },
  { left: 150, top: 70 },
  { left: 60, top: 96 },
  { left: 250, top: 90 },
  { left: 190, top: 40 },
  { left: 110, top: 30 },
];

function Scene({ variant, found }: { variant: 'top' | 'bottom'; found: number }) {
  return (
    <View style={styles.scene}>
      <View style={styles.sky} />
      <View style={styles.grass} />
      <View style={[styles.sun, variant === 'bottom' && styles.sunBig]} />
      {variant === 'top' && <View style={[styles.cloud, { left: 24, top: 18 }]} />}
      {variant === 'top' && <View style={[styles.cloud, { left: 74, top: 14 }]} />}
      {variant === 'bottom' && <View style={[styles.cloud, { left: 24, top: 22 }]} />}
      {/* tree */}
      <View style={[styles.treeTop, { left: 130 }]} />
      <View style={[styles.treeTrunk, { left: 150, backgroundColor: variant === 'top' ? MockupPalette.navy : MockupPalette.coral }]} />
      {/* box */}
      <View style={[styles.box, { left: 236 }]} />
      {variant === 'bottom' && <View style={[styles.boxWindow, { left: 268, top: 96 }]} />}
      {variant === 'bottom' && <View style={[styles.smallBox, { left: 250, top: 58 }]} />}
      {variant === 'top' && <View style={[styles.smallBox, { left: 250, top: 58, backgroundColor: MockupPalette.navy }]} />}
      {variant === 'bottom' &&
        MARKS.slice(0, found).map((m, i) => <View key={i} style={[styles.mark, { left: m.left, top: m.top }]} />)}
    </View>
  );
}

export function SpotTheDifferenceGame() {
  const { recordGameResult } = useProgress();
  const { activeStrategy, difficultyTier } = useStrategy();
  const speechMetric = useSpeechMetric(activeStrategy);
  const categoryKey = categoryKeyForStrategy(STRATEGY_META[activeStrategy].label) ?? 'easy-onset';

  const [found, setFound] = useState(0);
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
      setFound((n) => {
        const nn = Math.min(TOTAL, n + 1);
        if (nn >= TOTAL) {
          recordGameResult({
            gameKey: 'spot-the-difference',
            categoryKey,
            stars: 3,
            gameName: 'Spot the Difference',
            wordsAttempted: statAttempt.current,
            wordsCorrect: statCorrect.current,
            durationSeconds: Math.round((Date.now() - startRef.current) / 1000),
            strategyScore: scoresRef.current.length ? scoresRef.current.reduce((a, b) => a + b, 0) / scoresRef.current.length / 100 : 0,
          });
          setTimeout(() => {
            setFound(0);
            setSeconds(0);
            statAttempt.current = 0;
            statCorrect.current = 0;
            scoresRef.current = [];
            startRef.current = Date.now();
          }, 1600);
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
      title="Spot the Difference"
      currentWord={currentWord}
      onMicPress={handleMic}
      isRecording={speechMetric.isRecording}
      micDisabled={speechMetric.isPrepping || speechMetric.isProcessing}
      waveformLevels={speechMetric.liveWaveform}>
      <View style={styles.body}>
        <View style={styles.hud}>
          <Text style={styles.hudTitle}>Found: {found}/{TOTAL} differences</Text>
          <Text style={styles.hudTime}>Time: {mmss}</Text>
        </View>

        <Scene variant="top" found={found} />
        <Scene variant="bottom" found={found} />

        <View style={styles.dots}>
          {Array.from({ length: TOTAL }, (_, i) => (
            <View key={i} style={[styles.dot, i < found && styles.dotOn]} />
          ))}
        </View>

        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            setFound((n) => Math.min(TOTAL, n + 1));
          }}
          style={({ pressed }) => [styles.hintBtn, pressed && styles.pressed]}>
          <Text style={styles.hintText}>HINT</Text>
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
    paddingTop: 10,
    gap: 10,
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
    fontWeight: '800',
    color: MockupPalette.navy,
  },
  hudTime: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    fontWeight: '600',
    color: MockupPalette.subtitle,
  },
  scene: {
    width: 320,
    height: 130,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#CFE6FA',
  },
  sky: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#CFE6FA',
  },
  grass: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 52,
    backgroundColor: '#7FB04B',
  },
  sun: {
    position: 'absolute',
    right: 22,
    top: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: MockupPalette.yellow,
  },
  sunBig: {
    width: 52,
    height: 52,
    borderRadius: 26,
    right: 16,
    top: 10,
  },
  cloud: {
    position: 'absolute',
    width: 44,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
  },
  treeTop: {
    position: 'absolute',
    top: 46,
    width: 54,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#5E9B3F',
  },
  treeTrunk: {
    position: 'absolute',
    top: 62,
    width: 20,
    height: 44,
    borderRadius: 6,
  },
  box: {
    position: 'absolute',
    top: 66,
    width: 56,
    height: 40,
    borderRadius: 8,
    backgroundColor: MockupPalette.coral,
  },
  boxWindow: {
    position: 'absolute',
    width: 16,
    height: 12,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  smallBox: {
    position: 'absolute',
    width: 22,
    height: 16,
    borderRadius: 4,
    backgroundColor: MockupPalette.navy,
  },
  mark: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 3,
    borderColor: MockupPalette.coral,
  },
  dots: {
    flexDirection: 'row',
    gap: 10,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: MockupPalette.coral,
  },
  dotOn: {
    backgroundColor: MockupPalette.coral,
  },
  hintBtn: {
    alignSelf: 'stretch',
    backgroundColor: MockupPalette.navy,
    borderRadius: 20,
    paddingVertical: 15,
    alignItems: 'center',
  },
  hintText: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.85,
  },
});
