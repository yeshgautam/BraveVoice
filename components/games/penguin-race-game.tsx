// Penguin Race, reproduced from the design export: five alternating lanes, each with a penguin
// racer and a 1-7 position track (7 is the yellow finish), plus a checkered flag column on the
// right — inside the shared GameFrame. Say the pill word to boost your penguin (top lane) one step;
// the rivals inch along too. First to 7 wins, then the race resets.

import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
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

const LANES = 5;
const FINISH = 7;
const STEP_W = 34;

function Lane({ index, step, isYou }: { index: number; step: number; isYou: boolean }) {
  const x = useSharedValue(0);
  useEffect(() => {
    x.value = withSpring(step * STEP_W, { damping: 13, stiffness: 120 });
  }, [step, x]);
  const finStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View style={[styles.lane, index % 2 === 1 && styles.laneAlt]}>
      <Animated.View style={[styles.racer, finStyle]}>
        <Image source={require('@/assets/images/fin-character.png')} style={styles.penguin} contentFit="contain" />
      </Animated.View>
      <View style={styles.track}>
        {Array.from({ length: FINISH }, (_, i) => (
          <View key={i} style={[styles.pos, i === FINISH - 1 && styles.posFinish, i < step && styles.posDone]}>
            <Text style={[styles.posText, i === FINISH - 1 && styles.posTextFinish]}>{i + 1}</Text>
          </View>
        ))}
      </View>
      {isYou && <Text style={styles.youTag}>YOU</Text>}
    </View>
  );
}

export function PenguinRaceGame() {
  const { recordGameResult } = useProgress();
  const { activeStrategy, difficultyTier } = useStrategy();
  const speechMetric = useSpeechMetric(activeStrategy);
  const categoryKey = categoryKeyForStrategy(STRATEGY_META[activeStrategy].label) ?? 'easy-onset';

  const [steps, setSteps] = useState<number[]>(Array(LANES).fill(0));
  const [banner, setBanner] = useState<string | null>(null);
  const [currentWord, setCurrentWord] = useState(() => pickPracticeItems(difficultyTier, 1)[0] ?? 'rainbow');

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

  const finish = (youWon: boolean) => {
    setBanner(youWon ? 'You won the race! 🎉' : 'A rival crossed first! 🐧');
    recordGameResult({
      gameKey: 'penguin-race',
      categoryKey,
      stars: youWon ? 3 : 1,
      gameName: 'Penguin Race',
      wordsAttempted: statAttempt.current,
      wordsCorrect: statCorrect.current,
      durationSeconds: Math.round((Date.now() - startRef.current) / 1000),
      strategyScore: scoresRef.current.length ? scoresRef.current.reduce((a, b) => a + b, 0) / scoresRef.current.length / 100 : 0,
    });
    setTimeout(() => {
      setSteps(Array(LANES).fill(0));
      setBanner(null);
      statAttempt.current = 0;
      statCorrect.current = 0;
      scoresRef.current = [];
      startRef.current = Date.now();
    }, 1600);
  };

  const advance = () => {
    setSteps((prev) => {
      const next = [...prev];
      next[0] = Math.min(FINISH, next[0] + 1);
      for (let i = 1; i < LANES; i++) if (Math.random() < 0.55) next[i] = Math.min(FINISH, next[i] + 1);
      const winner = next.findIndex((s) => s >= FINISH);
      if (winner >= 0) setTimeout(() => finish(winner === 0), 400);
      return next;
    });
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      statCorrect.current += 1;
      attemptsRef.current = 0;
      nextWord();
      advance();
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
      title="Penguin Race"
      currentWord={currentWord}
      onMicPress={handleMic}
      isRecording={speechMetric.isRecording}
      micDisabled={banner !== null || speechMetric.isPrepping || speechMetric.isProcessing}
      waveformLevels={speechMetric.liveWaveform}>
      <View style={styles.body}>
        <View style={styles.track3d}>
          {steps.map((s, i) => (
            <Lane key={i} index={i} step={s} isYou={i === 0} />
          ))}
          <View style={styles.flagCol}>
            {Array.from({ length: 20 }, (_, i) => (
              <View key={i} style={[styles.flagSquare, (i % 2 === 0) === (Math.floor(i / 2) % 2 === 0) ? styles.flagDark : styles.flagLight]} />
            ))}
          </View>
        </View>
        {banner && <Text style={styles.banner}>{banner}</Text>}
      </View>
    </GameFrame>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingTop: 6,
  },
  track3d: {
    flex: 1,
    position: 'relative',
  },
  lane: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    backgroundColor: MockupPalette.cream,
  },
  laneAlt: {
    backgroundColor: MockupPalette.lightBlue,
  },
  racer: {
    width: 52,
    zIndex: 2,
  },
  penguin: {
    width: 48,
    height: 54,
  },
  track: {
    flexDirection: 'row',
    gap: 6,
    marginLeft: 6,
  },
  pos: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E7EEF6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  posDone: {
    backgroundColor: '#BFD6EF',
  },
  posFinish: {
    backgroundColor: MockupPalette.yellow,
  },
  posText: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    fontWeight: '700',
    color: MockupPalette.navy,
  },
  posTextFinish: {
    color: MockupPalette.title,
  },
  youTag: {
    position: 'absolute',
    right: 44,
    top: 4,
    fontFamily: Fonts.rounded,
    fontSize: 9,
    fontWeight: '800',
    color: MockupPalette.coral,
  },
  flagCol: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  flagSquare: {
    width: 12,
    height: '10%',
  },
  flagDark: {
    backgroundColor: MockupPalette.navy,
  },
  flagLight: {
    backgroundColor: '#FFFFFF',
  },
  banner: {
    position: 'absolute',
    alignSelf: 'center',
    top: '45%',
    fontFamily: Fonts.rounded,
    fontSize: 18,
    fontWeight: '800',
    color: MockupPalette.navy,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
});
