// Darts, reproduced from the design export: a numbered dartboard (20-wedge order, colored rings,
// bullseye), a Player 1 / Round / Player 2 scoreboard, a "3 Darts Remaining" + last-throw card, a
// 1-20 + D/T/25/50/Miss number pad, and a THROW DART button — all in the shared GameFrame. Say the
// pill word (or tap THROW DART) to throw; you and Fin alternate turns of 3 darts over 10 rounds.

import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { GameFrame } from '@/components/games/game-frame';
import { Fonts } from '@/constants/theme';
import { MockupPalette } from '@/constants/games-theme';
import { pickPracticeItems } from '@/content/practiceWords';
import { categoryKeyForStrategy, useProgress } from '@/contexts/progress-context';
import { STRATEGY_META, useStrategy } from '@/contexts/strategy-context';
import { useSpeechMetric } from '@/game-engine/useSpeechMetric';
import { MAX_ATTEMPTS_PER_WORD, getFeedbackTier } from '@/utils/speech-analysis';

const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const PAD = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const BOARD = 172;
const NUM_R = BOARD / 2 - 12;

function throwDart(): { n: number; mult: number; pts: number; label: string } {
  const roll = Math.random();
  if (roll < 0.06) return { n: 0, mult: 0, pts: 0, label: 'Miss' };
  if (roll < 0.12) return { n: 25, mult: 2, pts: 50, label: 'Bullseye = 50 pts' };
  const n = ORDER[Math.floor(Math.random() * ORDER.length)];
  const m = Math.random();
  const mult = m < 0.15 ? 3 : m < 0.4 ? 2 : 1;
  const pts = n * mult;
  const pre = mult === 3 ? 'Triple ' : mult === 2 ? 'Double ' : '';
  return { n, mult, pts, label: `${pre}${n} = ${pts} pts` };
}

export function DartsGame() {
  const { recordGameResult } = useProgress();
  const { activeStrategy, difficultyTier } = useStrategy();
  const speechMetric = useSpeechMetric(activeStrategy);
  const categoryKey = categoryKeyForStrategy(STRATEGY_META[activeStrategy].label) ?? 'easy-onset';

  const [p1, setP1] = useState(0);
  const [p2, setP2] = useState(0);
  const [round, setRound] = useState(1);
  const [darts, setDarts] = useState(3);
  const [lastThrow, setLastThrow] = useState('—');
  const [lastN, setLastN] = useState<number | null>(null);
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

  const finish = (finalP1: number, finalP2: number) => {
    const won = finalP1 >= finalP2;
    setBanner(won ? `You win, ${finalP1}–${finalP2}! 🎉` : `Fin wins, ${finalP2}–${finalP1}. Nice game 🐧`);
    recordGameResult({
      gameKey: 'darts',
      categoryKey,
      stars: won ? 3 : 1,
      gameName: 'Darts',
      wordsAttempted: statAttempt.current,
      wordsCorrect: statCorrect.current,
      durationSeconds: Math.round((Date.now() - startRef.current) / 1000),
      strategyScore: scoresRef.current.length ? scoresRef.current.reduce((a, b) => a + b, 0) / scoresRef.current.length / 100 : 0,
    });
  };

  const finTurn = () => {
    setTimeout(() => {
      let gain = 0;
      for (let i = 0; i < 3; i++) gain += throwDart().pts;
      setP2((prev) => {
        const np2 = prev + gain;
        setRound((r) => {
          const nr = r + 1;
          if (nr > 10) {
            setP1((cp1) => {
              finish(cp1, np2);
              return cp1;
            });
          } else {
            setDarts(3);
          }
          return nr;
        });
        return np2;
      });
    }, 800);
  };

  const doThrow = () => {
    const t = throwDart();
    setLastThrow(t.label);
    setLastN(t.n);
    Haptics.notificationAsync(t.pts > 0 ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    setP1((prev) => prev + t.pts);
    setDarts((d) => {
      const nd = d - 1;
      if (nd <= 0) finTurn();
      return nd <= 0 ? 3 : nd;
    });
  };

  const handleMic = async () => {
    if (busy) return;
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
      doThrow();
    } else if (tier === 'skip' || attemptsRef.current >= MAX_ATTEMPTS_PER_WORD) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      attemptsRef.current = 0;
      nextWord();
      doThrow(); // a wobbly throw still counts as a throw
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const newGame = () => {
    setP1(0);
    setP2(0);
    setRound(1);
    setDarts(3);
    setLastThrow('—');
    setLastN(null);
    setBanner(null);
    statAttempt.current = 0;
    statCorrect.current = 0;
    scoresRef.current = [];
    startRef.current = Date.now();
    nextWord();
  };

  return (
    <GameFrame
      title="Darts"
      currentWord={currentWord}
      onMicPress={handleMic}
      isRecording={speechMetric.isRecording}
      micDisabled={busy || speechMetric.isPrepping || speechMetric.isProcessing}
      waveformLevels={speechMetric.liveWaveform}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.board}>
          <View style={[styles.ring, { width: BOARD, height: BOARD, borderRadius: BOARD / 2, backgroundColor: MockupPalette.lightBlue }]} />
          <View style={[styles.ring, ring(BOARD * 0.82, MockupPalette.yellow)]} />
          <View style={[styles.ring, ring(BOARD * 0.66, MockupPalette.coral)]} />
          <View style={[styles.ring, ring(BOARD * 0.5, MockupPalette.navy)]} />
          <View style={[styles.ring, ring(BOARD * 0.3, MockupPalette.coral)]} />
          <View style={[styles.ring, ring(BOARD * 0.2, MockupPalette.navy)]} />
          <View style={[styles.ring, ring(28, '#12203B')]} />
          {ORDER.map((n, i) => {
            const a = (-90 + i * 18) * (Math.PI / 180);
            return (
              <Text key={n} style={[styles.boardNum, { left: BOARD / 2 + NUM_R * Math.cos(a) - 8, top: BOARD / 2 + NUM_R * Math.sin(a) - 8 }]}>
                {n}
              </Text>
            );
          })}
        </View>

        <View style={styles.slateBar} />

        <View style={styles.scoreCard}>
          <View style={styles.scoreCol}>
            <Text style={styles.scoreLabel}>Player 1</Text>
            <Text style={styles.scoreValue}>{p1}</Text>
          </View>
          <View style={styles.scoreCol}>
            <Text style={styles.scoreLabel}>Round</Text>
            <Text style={styles.scoreValue}>{Math.min(round, 10)}/10</Text>
          </View>
          <View style={styles.scoreCol}>
            <Text style={styles.scoreLabel}>Player 2</Text>
            <Text style={styles.scoreValue}>{p2}</Text>
          </View>
        </View>

        <View style={styles.dartsCard}>
          <Text style={styles.dartsTitle}>
            {darts} Darts Remaining {'  '}
            {[0, 1, 2].map((i) => (
              <Text key={i} style={{ color: i < darts ? MockupPalette.navy : '#C9CFDA' }}>
                ●
              </Text>
            ))}
          </Text>
          <Text style={styles.lastThrow}>Last Throw: {lastThrow}</Text>
        </View>

        <View style={styles.pad}>
          {PAD.map((n) => (
            <View key={n} style={[styles.padCell, lastN === n && styles.padCellActive]}>
              <Text style={[styles.padText, lastN === n && styles.padTextActive]}>{n}</Text>
            </View>
          ))}
          {['D', 'T', '25', '50', 'Miss'].map((k) => (
            <View key={k} style={[styles.padCell, styles.padCellCoral]}>
              <Text style={styles.padTextCoral}>{k}</Text>
            </View>
          ))}
        </View>

        {banner ? (
          <Pressable onPress={newGame} style={({ pressed }) => [styles.throwBtn, pressed && styles.pressed]}>
            <Text style={styles.throwText}>{banner} · TAP TO REPLAY</Text>
          </Pressable>
        ) : (
          <Pressable onPress={handleMic} style={({ pressed }) => [styles.throwBtn, pressed && styles.pressed]}>
            <Text style={styles.throwText}>THROW DART</Text>
          </Pressable>
        )}
      </ScrollView>
    </GameFrame>
  );
}

function ring(size: number, color: string) {
  return { position: 'absolute' as const, width: size, height: size, borderRadius: size / 2, backgroundColor: color };
}

const styles = StyleSheet.create({
  body: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    gap: 8,
  },
  board: {
    width: BOARD,
    height: BOARD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
  },
  boardNum: {
    position: 'absolute',
    width: 16,
    textAlign: 'center',
    fontFamily: Fonts.rounded,
    fontSize: 10,
    fontWeight: '800',
    color: MockupPalette.navy,
  },
  slateBar: {
    alignSelf: 'stretch',
    height: 8,
    borderRadius: 4,
    backgroundColor: MockupPalette.slate,
  },
  scoreCard: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    justifyContent: 'space-around',
    backgroundColor: MockupPalette.cream,
    borderRadius: 14,
    paddingVertical: 8,
  },
  scoreCol: {
    alignItems: 'center',
  },
  scoreLabel: {
    fontFamily: Fonts.rounded,
    fontSize: 11,
    fontWeight: '600',
    color: MockupPalette.subtitle,
  },
  scoreValue: {
    fontFamily: Fonts.rounded,
    fontSize: 22,
    fontWeight: '800',
    color: MockupPalette.navy,
  },
  dartsCard: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: MockupPalette.cream,
    borderRadius: 14,
    paddingVertical: 7,
    gap: 2,
  },
  dartsTitle: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '800',
    color: MockupPalette.navy,
  },
  lastThrow: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    fontWeight: '700',
    color: MockupPalette.coral,
  },
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignSelf: 'stretch',
    gap: 5,
    justifyContent: 'center',
  },
  padCell: {
    width: 62,
    height: 24,
    borderRadius: 8,
    backgroundColor: MockupPalette.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  padCellActive: {
    backgroundColor: MockupPalette.navy,
  },
  padCellCoral: {
    backgroundColor: MockupPalette.coral,
  },
  padText: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    fontWeight: '700',
    color: MockupPalette.navy,
  },
  padTextActive: {
    color: '#FFFFFF',
  },
  padTextCoral: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  throwBtn: {
    alignSelf: 'stretch',
    backgroundColor: MockupPalette.navy,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
  },
  throwText: {
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
