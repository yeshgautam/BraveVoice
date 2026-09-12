// Quiz Wheel, reproduced from the design export: a "Score / Question N/12" pill, a category wheel
// (light-blue face, colored rim accents, category labels, a pointer on top), a trivia question with
// four A-D options, and a SPIN button — inside the shared GameFrame. Say the pill word (or tap SPIN)
// to spin the wheel, bank points, and reveal the answer; a new question loads each turn.

import { Fragment, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { GameFrame } from '@/components/games/game-frame';
import { Fonts } from '@/constants/theme';
import { MockupPalette } from '@/constants/games-theme';
import { pickPracticeItems } from '@/content/practiceWords';
import { categoryKeyForStrategy, useProgress } from '@/contexts/progress-context';
import { STRATEGY_META, useStrategy } from '@/contexts/strategy-context';
import { useSpeechMetric } from '@/game-engine/useSpeechMetric';
import { MAX_ATTEMPTS_PER_WORD, getFeedbackTier } from '@/utils/speech-analysis';

const CATS = ['Science', 'History', 'Sports', 'Music', 'Art', 'Nature', 'Movies', 'Food'];
const RIM_COLORS = [MockupPalette.coral, MockupPalette.yellow, MockupPalette.navy, MockupPalette.yellow, MockupPalette.coral, MockupPalette.navy, MockupPalette.yellow, MockupPalette.coral];
const QUESTIONS = [
  { q: 'What is the largest planet in our solar system?', opts: ['Jupiter', 'Saturn', 'Mars', 'Venus'], correct: 0 },
  { q: 'Which animal lives at the South Pole?', opts: ['Penguin', 'Polar bear', 'Camel', 'Koala'], correct: 0 },
  { q: 'What do you call frozen rain?', opts: ['Snow', 'Steam', 'Fog', 'Dew'], correct: 0 },
  { q: 'How many legs does a spider have?', opts: ['Eight', 'Six', 'Four', 'Ten'], correct: 0 },
];
const WHEEL = 180;
const CAT_R = WHEEL / 2 - 26;
const RIM_R = WHEEL / 2 - 8;

export function QuizWheelGame() {
  const { recordGameResult } = useProgress();
  const { activeStrategy, difficultyTier } = useStrategy();
  const speechMetric = useSpeechMetric(activeStrategy);
  const categoryKey = categoryKeyForStrategy(STRATEGY_META[activeStrategy].label) ?? 'easy-onset';

  const [score, setScore] = useState(0);
  const [qNum, setQNum] = useState(1);
  const [qIndex, setQIndex] = useState(() => Math.floor(Math.random() * QUESTIONS.length));
  const [answered, setAnswered] = useState(false);
  const [currentWord, setCurrentWord] = useState(() => pickPracticeItems(difficultyTier, 1)[0] ?? 'rainbow');
  const rotation = useSharedValue(0);

  const attemptsRef = useRef(0);
  const wordPoolRef = useRef<string[]>(pickPracticeItems(difficultyTier, 14));
  const wordCounterRef = useRef(0);
  const statAttempt = useRef(0);
  const statCorrect = useRef(0);
  const scoresRef = useRef<number[]>([]);
  const startRef = useRef(Date.now());

  const q = QUESTIONS[qIndex];

  const nextWord = () => {
    const w = wordPoolRef.current[wordCounterRef.current % wordPoolRef.current.length];
    wordCounterRef.current += 1;
    setCurrentWord(w);
  };

  const spin = () => {
    rotation.value = withTiming(rotation.value + 900 + Math.random() * 180, { duration: 900 });
    setScore((s) => s + 50);
    setAnswered(true);
    recordGameResult({
      gameKey: 'quiz-wheel',
      categoryKey,
      stars: 3,
      gameName: 'Quiz Wheel',
      wordsAttempted: statAttempt.current,
      wordsCorrect: statCorrect.current,
      durationSeconds: Math.round((Date.now() - startRef.current) / 1000),
      strategyScore: scoresRef.current.length ? scoresRef.current.reduce((a, b) => a + b, 0) / scoresRef.current.length / 100 : 0,
    });
    setTimeout(() => {
      setAnswered(false);
      setQNum((n) => (n >= 12 ? 1 : n + 1));
      setQIndex(Math.floor(Math.random() * QUESTIONS.length));
    }, 1300);
  };

  const handleMic = async () => {
    if (answered) return;
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
      spin();
    } else if (tier === 'skip' || attemptsRef.current >= MAX_ATTEMPTS_PER_WORD) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      attemptsRef.current = 0;
      nextWord();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const wheelStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  return (
    <GameFrame
      title="Quiz Wheel"
      currentWord={currentWord}
      onMicPress={handleMic}
      isRecording={speechMetric.isRecording}
      micDisabled={answered || speechMetric.isPrepping || speechMetric.isProcessing}
      waveformLevels={speechMetric.liveWaveform}>
      <View style={styles.body}>
        <View style={styles.scorePill}>
          <Text style={styles.scoreText}>Score: {score} pts</Text>
          <Text style={styles.qCount}>Question {qNum}/12</Text>
        </View>

        <View style={styles.wheelWrap}>
          <Text style={styles.pointer}>▼</Text>
          <Animated.View style={[styles.wheel, wheelStyle]}>
            {CATS.map((cat, i) => {
              const a = (-90 + i * 45) * (Math.PI / 180);
              const rim = (-90 + i * 45 + 22) * (Math.PI / 180);
              return (
                <Fragment key={cat}>
                  <View style={[styles.rimBlock, { backgroundColor: RIM_COLORS[i], left: WHEEL / 2 + RIM_R * Math.cos(rim) - 12, top: WHEEL / 2 + RIM_R * Math.sin(rim) - 6, transform: [{ rotate: `${i * 45}deg` }] }]} />
                  <Text style={[styles.catLabel, { left: WHEEL / 2 + CAT_R * Math.cos(a) - 26, top: WHEEL / 2 + CAT_R * Math.sin(a) - 7 }]}>{cat}</Text>
                </Fragment>
              );
            })}
            <View style={styles.hub} />
          </Animated.View>
        </View>

        <Text style={styles.question}>{q.q}</Text>
        <View style={styles.opts}>
          {q.opts.map((opt, i) => {
            const on = answered && i === q.correct;
            return (
              <View key={i} style={[styles.opt, on && styles.optOn]}>
                <Text style={[styles.optLetter, on && styles.optTextOn]}>{'ABCD'[i]}</Text>
                <Text style={[styles.optText, on && styles.optTextOn]}>{opt}</Text>
              </View>
            );
          })}
        </View>

        <Pressable onPress={handleMic} style={({ pressed }) => [styles.spinBtn, pressed && styles.pressed]}>
          <Text style={styles.spinText}>SPIN</Text>
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
  scorePill: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: MockupPalette.cream,
    borderRadius: 14,
    paddingVertical: 8,
  },
  scoreText: {
    fontFamily: Fonts.rounded,
    fontSize: 18,
    fontWeight: '800',
    color: MockupPalette.title,
  },
  qCount: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    fontWeight: '600',
    color: MockupPalette.subtitle,
  },
  wheelWrap: {
    alignItems: 'center',
  },
  pointer: {
    fontSize: 20,
    color: MockupPalette.yellow,
    marginBottom: -8,
    zIndex: 2,
  },
  wheel: {
    width: WHEEL,
    height: WHEEL,
    borderRadius: WHEEL / 2,
    backgroundColor: MockupPalette.lightBlue,
    borderWidth: 6,
    borderColor: MockupPalette.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rimBlock: {
    position: 'absolute',
    width: 24,
    height: 12,
    borderRadius: 3,
  },
  catLabel: {
    position: 'absolute',
    width: 52,
    textAlign: 'center',
    fontFamily: Fonts.rounded,
    fontSize: 10,
    fontWeight: '700',
    color: MockupPalette.navy,
  },
  hub: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: MockupPalette.navy,
  },
  question: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '700',
    color: MockupPalette.title,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  opts: {
    alignSelf: 'stretch',
    gap: 8,
  },
  opt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: MockupPalette.lightBlue,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  optOn: {
    backgroundColor: MockupPalette.navy,
  },
  optLetter: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '800',
    color: MockupPalette.navy,
  },
  optText: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '600',
    color: MockupPalette.title,
  },
  optTextOn: {
    color: '#FFFFFF',
  },
  spinBtn: {
    alignSelf: 'stretch',
    backgroundColor: MockupPalette.coral,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  spinText: {
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
