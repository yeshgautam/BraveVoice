// 20 Questions, reproduced from the design export: a "Category" pill, a "Question N/20" heading with
// a progress bar, a cream panel of asked questions each tagged YES (yellow) / NO (coral), and a
// "Type your question…" field + ASK button — inside the shared GameFrame. Say the pill word (or tap
// ASK) to ask the next clue; reveal them all to unmask the mystery, then a new one loads.

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

type Clue = { q: string; yes: boolean };
const MYSTERIES: { category: string; answer: string; clues: Clue[] }[] = [
  {
    category: 'Animal',
    answer: 'a Penguin! 🐧',
    clues: [
      { q: 'Is it alive?', yes: true },
      { q: 'Is it bigger than a dog?', yes: false },
      { q: 'Does it live in water?', yes: true },
      { q: 'Is it a mammal?', yes: false },
      { q: 'Does it live where it snows?', yes: true },
      { q: 'Can it fly?', yes: false },
    ],
  },
  {
    category: 'Animal',
    answer: 'a Whale! 🐋',
    clues: [
      { q: 'Is it alive?', yes: true },
      { q: 'Does it live in the ocean?', yes: true },
      { q: 'Is it bigger than a car?', yes: true },
      { q: 'Does it have legs?', yes: false },
      { q: 'Is it a mammal?', yes: true },
      { q: 'Does it spout water?', yes: true },
    ],
  },
];

export function TwentyQuestionsGame() {
  const { recordGameResult } = useProgress();
  const { activeStrategy, difficultyTier } = useStrategy();
  const speechMetric = useSpeechMetric(activeStrategy);
  const categoryKey = categoryKeyForStrategy(STRATEGY_META[activeStrategy].label) ?? 'easy-onset';

  const [mystery, setMystery] = useState(() => MYSTERIES[Math.floor(Math.random() * MYSTERIES.length)]);
  const [asked, setAsked] = useState(0);
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
      setAsked((n) => {
        const nn = Math.min(mystery.clues.length, n + 1);
        if (nn >= mystery.clues.length) {
          recordGameResult({
            gameKey: 'twenty-questions',
            categoryKey,
            stars: 3,
            gameName: '20 Questions',
            wordsAttempted: statAttempt.current,
            wordsCorrect: statCorrect.current,
            durationSeconds: Math.round((Date.now() - startRef.current) / 1000),
            strategyScore: scoresRef.current.length ? scoresRef.current.reduce((a, b) => a + b, 0) / scoresRef.current.length / 100 : 0,
          });
          setTimeout(() => {
            setMystery(MYSTERIES[Math.floor(Math.random() * MYSTERIES.length)]);
            setAsked(0);
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

  const solved = asked >= mystery.clues.length;

  return (
    <GameFrame
      title="20 Questions"
      currentWord={currentWord}
      onMicPress={handleMic}
      isRecording={speechMetric.isRecording}
      micDisabled={speechMetric.isPrepping || speechMetric.isProcessing}
      waveformLevels={speechMetric.liveWaveform}>
      <View style={styles.body}>
        <View style={styles.catPill}>
          <Text style={styles.catText}>Category: {mystery.category}</Text>
        </View>
        <Text style={styles.qHeading}>Question {Math.min(asked + (solved ? 0 : 1), 20)}/20</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(asked / 20) * 100}%` }]} />
        </View>

        <View style={styles.panel}>
          {solved ? (
            <Text style={styles.solved}>It&apos;s {mystery.answer}</Text>
          ) : (
            mystery.clues.slice(0, asked).map((c, i) => (
              <View key={i} style={styles.clueRow}>
                <Text style={styles.clueQ}>{c.q}</Text>
                <View style={[styles.ansPill, { backgroundColor: c.yes ? MockupPalette.yellow : MockupPalette.coral }]}>
                  <Text style={[styles.ansText, { color: c.yes ? MockupPalette.title : '#FFFFFF' }]}>{c.yes ? 'YES' : 'NO'}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.askRow}>
          <View style={styles.input}>
            <Text style={styles.inputPlaceholder}>Type your question…</Text>
          </View>
          <Pressable onPress={handleMic} style={({ pressed }) => [styles.askBtn, pressed && styles.pressed]}>
            <Text style={styles.askText}>ASK</Text>
          </Pressable>
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
    gap: 12,
  },
  catPill: {
    backgroundColor: MockupPalette.lightBlue,
    borderRadius: 14,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  catText: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '700',
    color: MockupPalette.navy,
  },
  qHeading: {
    fontFamily: Fonts.rounded,
    fontSize: 24,
    fontWeight: '800',
    color: MockupPalette.title,
  },
  progressTrack: {
    alignSelf: 'stretch',
    height: 8,
    borderRadius: 4,
    backgroundColor: MockupPalette.lightBlue,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: MockupPalette.navy,
  },
  panel: {
    alignSelf: 'stretch',
    flex: 1,
    backgroundColor: MockupPalette.cream,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  clueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clueQ: {
    flex: 1,
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '600',
    color: MockupPalette.title,
  },
  ansPill: {
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 14,
  },
  ansText: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    fontWeight: '800',
  },
  solved: {
    fontFamily: Fonts.rounded,
    fontSize: 20,
    fontWeight: '800',
    color: MockupPalette.navy,
    textAlign: 'center',
    marginTop: 8,
  },
  askRow: {
    flexDirection: 'row',
    gap: 12,
    alignSelf: 'stretch',
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: MockupPalette.lightBlue,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  inputPlaceholder: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    color: MockupPalette.subtitle,
  },
  askBtn: {
    width: 84,
    borderRadius: 14,
    backgroundColor: MockupPalette.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  askText: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.85,
  },
});
