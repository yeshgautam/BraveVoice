// Battleship, reproduced from the design export: an "Enemy Waters" grid (A-G / 1-7) with hit (coral
// ✕) and miss (navy dot) markers, a "Your Fleet" grid showing your ships, a FIRE! button, and a
// "Ships remaining" line — inside the shared GameFrame. Tap an enemy cell to target, say the pill
// word (or FIRE) to shoot; sink all of Fin's ships to win. Fin fires back each turn.

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

const N = 7;
const COLS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const sq = (r: number, c: number) => r * N + c;

function placeShips(): number[][] {
  const lengths = [3, 2, 2];
  const used = new Set<number>();
  const ships: number[][] = [];
  for (const len of lengths) {
    for (let tries = 0; tries < 100; tries++) {
      const horiz = Math.random() < 0.5;
      const r = Math.floor(Math.random() * (horiz ? N : N - len + 1));
      const c = Math.floor(Math.random() * (horiz ? N - len + 1 : N));
      const cells = Array.from({ length: len }, (_, i) => (horiz ? sq(r, c + i) : sq(r + i, c)));
      if (cells.some((x) => used.has(x))) continue;
      cells.forEach((x) => used.add(x));
      ships.push(cells);
      break;
    }
  }
  return ships;
}

const YOUR_FLEET = [sq(1, 4), sq(2, 4), sq(4, 1), sq(4, 2), sq(4, 3), sq(0, 0), sq(6, 6)];

export function BattleshipGame() {
  const { recordGameResult } = useProgress();
  const { activeStrategy, difficultyTier } = useStrategy();
  const speechMetric = useSpeechMetric(activeStrategy);
  const categoryKey = categoryKeyForStrategy(STRATEGY_META[activeStrategy].label) ?? 'easy-onset';

  const [ships, setShips] = useState<number[][]>(placeShips);
  const [enemyHits, setEnemyHits] = useState<Set<number>>(new Set());
  const [finHits, setFinHits] = useState<Set<number>>(new Set());
  const [target, setTarget] = useState<number | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [currentWord, setCurrentWord] = useState(() => pickPracticeItems(difficultyTier, 1)[0] ?? 'rainbow');

  const attemptsRef = useRef(0);
  const wordPoolRef = useRef<string[]>(pickPracticeItems(difficultyTier, 16));
  const wordCounterRef = useRef(0);
  const statAttempt = useRef(0);
  const statCorrect = useRef(0);
  const scoresRef = useRef<number[]>([]);
  const startRef = useRef(Date.now());

  const shipCells = new Set(ships.flat());
  const remaining = ships.filter((s) => !s.every((c) => enemyHits.has(c))).length;

  const nextWord = () => {
    const w = wordPoolRef.current[wordCounterRef.current % wordPoolRef.current.length];
    wordCounterRef.current += 1;
    setCurrentWord(w);
  };

  const finFire = (hits: Set<number>) => {
    const avail = YOUR_FLEET.filter((c) => !hits.has(c));
    const all = Array.from({ length: N * N }, (_, i) => i).filter((c) => !hits.has(c));
    const pick = avail.length && Math.random() < 0.5 ? avail[Math.floor(Math.random() * avail.length)] : all[Math.floor(Math.random() * all.length)];
    if (pick != null) {
      const next = new Set(hits);
      next.add(pick);
      setFinHits(next);
    }
  };

  const fire = () => {
    if (target === null || enemyHits.has(target)) return;
    const next = new Set(enemyHits);
    next.add(target);
    setEnemyHits(next);
    const hit = shipCells.has(target);
    Haptics.notificationAsync(hit ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    setTarget(null);
    const left = ships.filter((s) => !s.every((c) => next.has(c))).length;
    if (left === 0) {
      setBanner('You sank Fin’s fleet! 🎉');
      recordGameResult({
        gameKey: 'battleship',
        categoryKey,
        stars: 3,
        gameName: 'Battleship',
        wordsAttempted: statAttempt.current,
        wordsCorrect: statCorrect.current,
        durationSeconds: Math.round((Date.now() - startRef.current) / 1000),
        strategyScore: scoresRef.current.length ? scoresRef.current.reduce((a, b) => a + b, 0) / scoresRef.current.length / 100 : 0,
      });
      setTimeout(reset, 1600);
      return;
    }
    if (!hit) finFire(finHits);
  };

  const reset = () => {
    setShips(placeShips());
    setEnemyHits(new Set());
    setFinHits(new Set());
    setTarget(null);
    setBanner(null);
    startRef.current = Date.now();
    statAttempt.current = 0;
    statCorrect.current = 0;
    scoresRef.current = [];
  };

  const handleMic = async () => {
    if (banner || target === null) return;
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
      fire();
    } else if (tier === 'skip' || attemptsRef.current >= MAX_ATTEMPTS_PER_WORD) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      attemptsRef.current = 0;
      nextWord();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const Grid = ({ enemy }: { enemy: boolean }) => (
    <View style={styles.gridCard}>
      <View style={styles.headerRow}>
        <View style={styles.rowLabel} />
        {COLS.map((c) => (
          <Text key={c} style={styles.colLabel}>{c}</Text>
        ))}
      </View>
      {Array.from({ length: N }, (_, r) => (
        <View key={r} style={styles.gridRow}>
          <Text style={styles.rowLabel}>{r + 1}</Text>
          {Array.from({ length: N }, (_, c) => {
            const i = sq(r, c);
            if (enemy) {
              const fired = enemyHits.has(i);
              const isHit = fired && shipCells.has(i);
              return (
                <Pressable key={c} onPress={() => !banner && !fired && setTarget(i)} disabled={!!banner || fired} style={[styles.cell, target === i && styles.cellTarget]}>
                  {fired && (isHit ? <Text style={styles.hit}>✕</Text> : <View style={styles.miss} />)}
                </Pressable>
              );
            }
            const ship = YOUR_FLEET.includes(i);
            const struck = finHits.has(i);
            return (
              <View key={c} style={[styles.cell, ship && styles.cellShip]}>
                {struck && (ship ? <Text style={styles.hit}>✕</Text> : <View style={styles.miss} />)}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );

  return (
    <GameFrame
      title="Battleship"
      currentWord={currentWord}
      onMicPress={handleMic}
      isRecording={speechMetric.isRecording}
      micDisabled={target === null || banner !== null || speechMetric.isPrepping || speechMetric.isProcessing}
      waveformLevels={speechMetric.liveWaveform}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} bounces={false}>
        <Text style={styles.gridTitle}>Enemy Waters</Text>
        <Grid enemy />
        <Text style={styles.gridTitle}>Your Fleet</Text>
        <Grid enemy={false} />
        <Pressable onPress={banner ? reset : fire} style={({ pressed }) => [styles.fireBtn, pressed && styles.pressed]}>
          <Text style={styles.fireText}>{banner ?? 'FIRE!'}</Text>
        </Pressable>
        <Text style={styles.remaining}>Ships remaining: {remaining}</Text>
      </ScrollView>
    </GameFrame>
  );
}

const CELL = 30;

const styles = StyleSheet.create({
  body: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 8,
  },
  gridTitle: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '800',
    color: MockupPalette.navy,
  },
  gridCard: {
    backgroundColor: MockupPalette.cream,
    borderRadius: 14,
    padding: 8,
  },
  headerRow: {
    flexDirection: 'row',
  },
  gridRow: {
    flexDirection: 'row',
  },
  rowLabel: {
    width: 16,
    height: CELL,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontFamily: Fonts.rounded,
    fontSize: 10,
    fontWeight: '700',
    color: MockupPalette.subtitle,
    lineHeight: CELL,
  },
  colLabel: {
    width: CELL,
    textAlign: 'center',
    fontFamily: Fonts.rounded,
    fontSize: 10,
    fontWeight: '700',
    color: MockupPalette.subtitle,
  },
  cell: {
    width: CELL,
    height: CELL,
    margin: 1,
    borderRadius: 5,
    backgroundColor: MockupPalette.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellTarget: {
    borderWidth: 2,
    borderColor: MockupPalette.navy,
  },
  cellShip: {
    backgroundColor: MockupPalette.navy,
  },
  hit: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    fontWeight: '800',
    color: MockupPalette.coral,
  },
  miss: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: MockupPalette.navy,
  },
  fireBtn: {
    alignSelf: 'stretch',
    backgroundColor: MockupPalette.coral,
    borderRadius: 20,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  fireText: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#FFFFFF',
  },
  remaining: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '600',
    color: MockupPalette.subtitle,
  },
  pressed: {
    opacity: 0.85,
  },
});
