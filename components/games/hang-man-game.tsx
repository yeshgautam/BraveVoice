// Hang Man, reproduced from the design export: a "Used" letters panel and a gallows-and-figure up
// top, then light-blue word blanks that fill in below — inside the shared GameFrame. Say the pill
// word to reveal the next letter of the mystery word; solve it to win, then a new word loads. (The
// figure is drawn once as scenery — letters only ever get revealed, never a wrong-guess penalty.)

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

const WORDS = ['SNOWBALLFIGHT', 'PENGUINPARADE', 'FROSTYMORNING', 'WINTERWONDER'];

export function HangManGame() {
  const { recordGameResult } = useProgress();
  const { activeStrategy, difficultyTier } = useStrategy();
  const speechMetric = useSpeechMetric(activeStrategy);
  const categoryKey = categoryKeyForStrategy(STRATEGY_META[activeStrategy].label) ?? 'easy-onset';

  const [word, setWord] = useState(() => WORDS[Math.floor(Math.random() * WORDS.length)]);
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

  const usedLetters = Array.from(new Set(word.slice(0, revealed).split('')));

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
        const nn = Math.min(word.length, n + 1);
        if (nn >= word.length) {
          recordGameResult({
            gameKey: 'hang-man',
            categoryKey,
            stars: 3,
            gameName: 'Hang Man',
            wordsAttempted: statAttempt.current,
            wordsCorrect: statCorrect.current,
            durationSeconds: Math.round((Date.now() - startRef.current) / 1000),
            strategyScore: scoresRef.current.length ? scoresRef.current.reduce((a, b) => a + b, 0) / scoresRef.current.length / 100 : 0,
          });
          setTimeout(() => {
            setWord(WORDS[Math.floor(Math.random() * WORDS.length)]);
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

  return (
    <GameFrame
      title="Hang Man"
      currentWord={currentWord}
      onMicPress={handleMic}
      isRecording={speechMetric.isRecording}
      micDisabled={speechMetric.isPrepping || speechMetric.isProcessing}
      waveformLevels={speechMetric.liveWaveform}>
      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.usedPanel}>
            <Text style={styles.usedLabel}>Used</Text>
            <View style={styles.usedWrap}>
              {usedLetters.map((l) => (
                <View key={l} style={styles.usedChip}>
                  <Text style={styles.usedChipText}>{l}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.scene}>
            {/* gallows */}
            <View style={styles.gallowsBase} />
            <View style={styles.gallowsPost} />
            <View style={styles.gallowsBeam} />
            <View style={styles.rope} />
            {/* figure */}
            <View style={styles.figure}>
              <View style={styles.head} />
              <View style={styles.torso} />
              <View style={styles.legs}>
                <View style={styles.leg} />
                <View style={styles.leg} />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.blanks}>
          {word.split('').map((ch, i) => (
            <View key={i} style={[styles.blank, i < revealed && styles.blankFilled]}>
              <Text style={[styles.blankText, i < revealed && styles.blankTextFilled]}>{i < revealed ? ch : ''}</Text>
            </View>
          ))}
        </View>

        <View style={styles.divider} />
      </View>
    </GameFrame>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 16,
  },
  topRow: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 240,
  },
  usedPanel: {
    width: 96,
    backgroundColor: MockupPalette.cream,
    borderRadius: 14,
    padding: 10,
    gap: 8,
  },
  usedLabel: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '800',
    color: MockupPalette.navy,
    textAlign: 'center',
  },
  usedWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  usedChip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: MockupPalette.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  usedChipText: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '800',
    color: MockupPalette.navy,
  },
  scene: {
    flex: 1,
    height: 240,
  },
  gallowsBase: {
    position: 'absolute',
    right: 10,
    bottom: 0,
    width: 120,
    height: 8,
    borderRadius: 4,
    backgroundColor: MockupPalette.slate,
  },
  gallowsPost: {
    position: 'absolute',
    right: 64,
    bottom: 0,
    width: 8,
    height: 230,
    borderRadius: 4,
    backgroundColor: MockupPalette.slate,
  },
  gallowsBeam: {
    position: 'absolute',
    right: 64,
    top: 0,
    width: 90,
    height: 8,
    borderRadius: 4,
    backgroundColor: MockupPalette.slate,
  },
  rope: {
    position: 'absolute',
    right: 106,
    top: 8,
    width: 3,
    height: 34,
    backgroundColor: MockupPalette.slate,
  },
  figure: {
    position: 'absolute',
    right: 78,
    top: 42,
    alignItems: 'center',
  },
  head: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0C9A0',
    borderWidth: 2,
    borderColor: '#12203B',
  },
  torso: {
    width: 58,
    height: 60,
    borderRadius: 14,
    backgroundColor: MockupPalette.green,
    borderWidth: 2,
    borderColor: '#12203B',
    marginTop: -2,
  },
  legs: {
    flexDirection: 'row',
    gap: 6,
    marginTop: -2,
  },
  leg: {
    width: 24,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#3E6DB5',
    borderWidth: 2,
    borderColor: '#12203B',
  },
  divider: {
    height: 8,
    borderRadius: 4,
    backgroundColor: MockupPalette.slate,
  },
  blanks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    backgroundColor: MockupPalette.lightBlue,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  blank: {
    width: 34,
    height: 40,
    borderRadius: 8,
    backgroundColor: MockupPalette.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blankFilled: {
    backgroundColor: MockupPalette.navy,
  },
  blankText: {
    fontFamily: Fonts.rounded,
    fontSize: 20,
    fontWeight: '800',
    color: MockupPalette.navy,
  },
  blankTextFilled: {
    color: '#FFFFFF',
  },
});
