// Word Quest, reproduced from the design export: a crossword-style grid of light-blue tiles up top
// and a slate "letter wheel" (white letter circles around a dashed ring, with traced colored paths)
// below — inside the shared GameFrame. Say the pill word to reveal the next run of letters into the
// grid; fill the whole crossword to complete the quest, then it re-shuffles.

import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { GameFrame } from '@/components/games/game-frame';
import { Fonts } from '@/constants/theme';
import { MockupPalette } from '@/constants/games-theme';
import { pickPracticeItems } from '@/content/practiceWords';
import { categoryKeyForStrategy, useProgress } from '@/contexts/progress-context';
import { STRATEGY_META, useStrategy } from '@/contexts/strategy-context';
import { useSpeechMetric } from '@/game-engine/useSpeechMetric';
import { MAX_ATTEMPTS_PER_WORD, getFeedbackTier } from '@/utils/speech-analysis';

// Crossword skeleton (row,col) roughly matching the mockup, with the letter that fills each cell.
const CELLS: { r: number; c: number; ch: string }[] = [
  { r: 0, c: 0, ch: 'F' }, { r: 0, c: 1, ch: 'R' }, { r: 0, c: 2, ch: 'O' }, { r: 0, c: 3, ch: 'S' }, { r: 0, c: 4, ch: 'T' }, { r: 0, c: 5, ch: 'Y' },
  { r: 1, c: 2, ch: 'C' },
  { r: 2, c: 2, ch: 'E' }, { r: 2, c: 5, ch: 'S' },
  { r: 3, c: 0, ch: 'P' }, { r: 3, c: 2, ch: 'A' }, { r: 3, c: 5, ch: 'N' },
  { r: 4, c: 0, ch: 'O' }, { r: 4, c: 2, ch: 'N' }, { r: 4, c: 3, ch: 'O' }, { r: 4, c: 4, ch: 'W' }, { r: 4, c: 5, ch: 'Y' },
  { r: 5, c: 0, ch: 'L' }, { r: 5, c: 2, ch: 'D' },
  { r: 6, c: 0, ch: 'A' }, { r: 6, c: 1, ch: 'R' }, { r: 6, c: 2, ch: 'C' }, { r: 6, c: 3, ch: 'T' }, { r: 6, c: 4, ch: 'I' },
];
const WHEEL_LETTERS = ['W', 'R', 'T', 'G', 'I', 'M', 'T', 'E'];
const WHEEL = 160;
const WHEEL_R = WHEEL / 2 - 22;
const REVEAL_PER = 4;

function line(from: { x: number; y: number }, to: { x: number; y: number }, color: string, key: string) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return (
    <View
      key={key}
      style={{ position: 'absolute', left: from.x, top: from.y, width: len, height: 3, backgroundColor: color, borderRadius: 2, transform: [{ rotate: `${angle}deg` }] }}
    />
  );
}

export function WordQuestGame() {
  const { recordGameResult } = useProgress();
  const { activeStrategy, difficultyTier } = useStrategy();
  const speechMetric = useSpeechMetric(activeStrategy);
  const categoryKey = categoryKeyForStrategy(STRATEGY_META[activeStrategy].label) ?? 'easy-onset';

  const [revealed, setRevealed] = useState(0);
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
    const success = tier === 'excellent' || tier === 'good';
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      statCorrect.current += 1;
      attemptsRef.current = 0;
      nextWord();
      setRevealed((n) => {
        const nn = Math.min(CELLS.length, n + REVEAL_PER);
        if (nn >= CELLS.length) {
          recordGameResult({
            gameKey: 'word-quest',
            categoryKey,
            stars: 3,
            gameName: 'Word Quest',
            wordsAttempted: statAttempt.current,
            wordsCorrect: statCorrect.current,
            durationSeconds: Math.round((Date.now() - startRef.current) / 1000),
            strategyScore: scoresRef.current.length ? scoresRef.current.reduce((a, b) => a + b, 0) / scoresRef.current.length / 100 : 0,
          });
          setTimeout(() => {
            setRevealed(0);
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

  const wheelPos = WHEEL_LETTERS.map((_, i) => {
    const a = (-90 + (360 / WHEEL_LETTERS.length) * i) * (Math.PI / 180);
    return { x: WHEEL / 2 + WHEEL_R * Math.cos(a), y: WHEEL / 2 + WHEEL_R * Math.sin(a) };
  });

  return (
    <GameFrame
      title="Word Quest"
      currentWord={currentWord}
      onMicPress={handleMic}
      isRecording={speechMetric.isRecording}
      micDisabled={speechMetric.isPrepping || speechMetric.isProcessing}
      waveformLevels={speechMetric.liveWaveform}>
      <View style={styles.body}>
        <View style={styles.grid}>
          {CELLS.map((cell, i) => (
            <View key={i} style={[styles.tile, { left: cell.c * 38, top: cell.r * 38 }, i < revealed && styles.tileFilled]}>
              {i < revealed && <Text style={styles.tileLetter}>{cell.ch}</Text>}
            </View>
          ))}
        </View>

        <View style={styles.wheel}>
          {line(wheelPos[7], wheelPos[6], MockupPalette.orange, 'o1')}
          {line(wheelPos[6], wheelPos[5], MockupPalette.orange, 'o2')}
          {line(wheelPos[1], wheelPos[3], MockupPalette.yellow, 'y1')}
          {WHEEL_LETTERS.map((ch, i) => (
            <View key={i} style={[styles.wheelLetter, { left: wheelPos[i].x - 17, top: wheelPos[i].y - 17 }]}>
              <Text style={styles.wheelLetterText}>{ch}</Text>
            </View>
          ))}
        </View>
      </View>
    </GameFrame>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 18,
    gap: 24,
  },
  grid: {
    width: 8 * 38,
    height: 7 * 38,
  },
  tile: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 7,
    backgroundColor: MockupPalette.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileFilled: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: MockupPalette.navy,
  },
  tileLetter: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    fontWeight: '800',
    color: MockupPalette.navy,
  },
  wheel: {
    width: WHEEL,
    height: WHEEL,
    borderRadius: WHEEL / 2,
    backgroundColor: MockupPalette.slate,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    borderStyle: 'dashed',
  },
  wheelLetter: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelLetterText: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    fontWeight: '800',
    color: MockupPalette.navy,
  },
});
