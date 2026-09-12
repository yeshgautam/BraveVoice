// Connect 4, reproduced from the design export: a slate board of 7x7 cream holes, and two cream
// tally cards (RED = your wins, BLACK = Fin's wins) shown as filling dot grids. All inside the
// shared GameFrame. You are RED; tap a column and say the pill word to drop a disc, then Fin (BLACK)
// answers. Four in a row wins the round, adds a dot to that side's tray, and re-racks the board.

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

type Disc = 'red' | 'black' | null;

const COLS = 7;
const ROWS = 7;
const DIRS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];
const idx = (r: number, c: number) => r * COLS + c;

function dropRow(board: Disc[], col: number): number {
  for (let r = ROWS - 1; r >= 0; r--) if (board[idx(r, col)] === null) return r;
  return -1;
}

function checkWinner(board: Disc[]): Disc {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const m = board[idx(r, c)];
      if (!m) continue;
      for (const [dr, dc] of DIRS) {
        let k = 1;
        while (k < 4) {
          const rr = r + dr * k;
          const cc = c + dc * k;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS || board[idx(rr, cc)] !== m) break;
          k++;
        }
        if (k === 4) return m;
      }
    }
  }
  return null;
}

function pickAiColumn(board: Disc[]): number {
  const valid = Array.from({ length: COLS }, (_, c) => c).filter((c) => dropRow(board, c) >= 0);
  for (const c of valid) {
    const copy = [...board];
    copy[idx(dropRow(copy, c), c)] = 'black';
    if (checkWinner(copy) === 'black') return c;
  }
  for (const c of valid) {
    const copy = [...board];
    copy[idx(dropRow(copy, c), c)] = 'red';
    if (checkWinner(copy) === 'red') return c;
  }
  const centerOut = [...valid].sort((a, b) => Math.abs(a - (COLS - 1) / 2) - Math.abs(b - (COLS - 1) / 2));
  return centerOut.slice(0, 2)[Math.floor(Math.random() * Math.min(2, centerOut.length))];
}

function TallyCard({ label, color, wins }: { label: string; color: string; wins: number }) {
  return (
    <View style={styles.tallyCard}>
      <Text style={[styles.tallyLabel, { color }]}>{label}</Text>
      <View style={styles.tallyGrid}>
        {Array.from({ length: Math.max(15, wins) }, (_, i) => (
          <View key={i} style={[styles.tallyDot, { backgroundColor: i < wins ? color : 'transparent', borderColor: color }]} />
        ))}
      </View>
    </View>
  );
}

export function Connect4Game() {
  const { recordGameResult } = useProgress();
  const { activeStrategy, difficultyTier } = useStrategy();
  const speechMetric = useSpeechMetric(activeStrategy);
  const categoryKey = categoryKeyForStrategy(STRATEGY_META[activeStrategy].label) ?? 'easy-onset';

  const [board, setBoard] = useState<Disc[]>(Array(ROWS * COLS).fill(null));
  const [selectedCol, setSelectedCol] = useState<number | null>(null);
  const [turn, setTurn] = useState<'red' | 'black'>('red');
  const [wins, setWins] = useState({ red: 0, black: 0 });
  const [locked, setLocked] = useState(false);
  const [currentWord, setCurrentWord] = useState(() => pickPracticeItems(difficultyTier, 1)[0] ?? 'rainbow');

  const attemptsRef = useRef(0);
  const wordPoolRef = useRef<string[]>(pickPracticeItems(difficultyTier, 14));
  const wordCounterRef = useRef(0);
  const wordsAttemptedRef = useRef(0);
  const wordsCorrectRef = useRef(0);
  const scoresRef = useRef<number[]>([]);
  const sessionStartRef = useRef(Date.now());

  const busy = turn !== 'red' || locked;

  const nextWord = () => {
    const w = wordPoolRef.current[wordCounterRef.current % wordPoolRef.current.length];
    wordCounterRef.current += 1;
    setCurrentWord(w);
  };

  const endRound = (winner: Disc) => {
    setLocked(true);
    if (winner) {
      recordGameResult({
        gameKey: 'connect-4',
        categoryKey,
        stars: winner === 'red' ? 3 : 1,
        gameName: 'Connect 4',
        wordsAttempted: wordsAttemptedRef.current,
        wordsCorrect: wordsCorrectRef.current,
        durationSeconds: Math.round((Date.now() - sessionStartRef.current) / 1000),
        strategyScore: scoresRef.current.length ? scoresRef.current.reduce((a, b) => a + b, 0) / scoresRef.current.length / 100 : 0,
      });
      setWins((w) => ({ ...w, [winner]: w[winner] + 1 }));
    }
    setTimeout(() => {
      setBoard(Array(ROWS * COLS).fill(null));
      setSelectedCol(null);
      setTurn('red');
      setLocked(false);
      wordsAttemptedRef.current = 0;
      wordsCorrectRef.current = 0;
      scoresRef.current = [];
      sessionStartRef.current = Date.now();
    }, 1400);
  };

  const aiMove = (afterBoard: Disc[]) => {
    setTimeout(() => {
      const col = pickAiColumn(afterBoard);
      const row = dropRow(afterBoard, col);
      if (row < 0) return endRound(null);
      const next = [...afterBoard];
      next[idx(row, col)] = 'black';
      setBoard(next);
      const win = checkWinner(next);
      if (win) endRound(win);
      else if (next.every((v) => v !== null)) endRound(null);
      else setTurn('red');
    }, 600);
  };

  const handleColumnPress = (col: number) => {
    if (busy || dropRow(board, col) < 0) return;
    setSelectedCol(col);
    attemptsRef.current = 0;
    nextWord();
  };

  const handleMic = async () => {
    if (selectedCol === null || busy) return;
    if (speechMetric.isRecording) return speechMetric.stop();
    const result = await speechMetric.start();
    if (speechMetric.permissionDenied || result.noSpeechDetected) return;

    attemptsRef.current += 1;
    wordsAttemptedRef.current += 1;
    scoresRef.current.push(result.score);
    const tier = getFeedbackTier(result.score, attemptsRef.current);
    const success = tier === 'excellent' || tier === 'good';

    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      wordsCorrectRef.current += 1;
      const col = selectedCol;
      const row = dropRow(board, col);
      const next = [...board];
      next[idx(row, col)] = 'red';
      setBoard(next);
      setSelectedCol(null);
      const win = checkWinner(next);
      if (win) endRound(win);
      else if (next.every((v) => v !== null)) endRound(null);
      else {
        setTurn('black');
        aiMove(next);
      }
    } else if (tier === 'skip' || attemptsRef.current >= MAX_ATTEMPTS_PER_WORD) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setSelectedCol(null);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  return (
    <GameFrame
      title="Connect 4"
      currentWord={currentWord}
      onMicPress={handleMic}
      isRecording={speechMetric.isRecording}
      micDisabled={selectedCol === null || busy || speechMetric.isPrepping || speechMetric.isProcessing}
      waveformLevels={speechMetric.liveWaveform}>
      <View style={styles.body}>
        <View style={styles.board}>
          {Array.from({ length: COLS }, (_, c) => {
            const full = dropRow(board, c) < 0;
            return (
              <Pressable
                key={c}
                onPress={() => handleColumnPress(c)}
                disabled={busy || full}
                style={[styles.column, selectedCol === c && styles.columnSelected]}>
                {Array.from({ length: ROWS }, (_, r) => {
                  const d = board[idx(r, c)];
                  return (
                    <View
                      key={r}
                      style={[styles.hole, d === 'red' && styles.holeRed, d === 'black' && styles.holeBlack]}
                    />
                  );
                })}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.divider} />

        <View style={styles.trays}>
          <TallyCard label="RED" color={MockupPalette.coral} wins={wins.red} />
          <TallyCard label="BLACK" color={MockupPalette.navy} wins={wins.black} />
        </View>
      </View>
    </GameFrame>
  );
}

const HOLE = 34;

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 14,
  },
  board: {
    flexDirection: 'row',
    gap: 5,
    backgroundColor: MockupPalette.slate,
    borderRadius: 18,
    padding: 8,
  },
  column: {
    gap: 5,
    borderRadius: 8,
  },
  columnSelected: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  hole: {
    width: HOLE,
    height: HOLE,
    borderRadius: HOLE / 2,
    backgroundColor: MockupPalette.cream,
  },
  holeRed: {
    backgroundColor: MockupPalette.coral,
  },
  holeBlack: {
    backgroundColor: MockupPalette.navy,
  },
  divider: {
    alignSelf: 'stretch',
    height: 10,
    borderRadius: 5,
    backgroundColor: MockupPalette.slate,
    marginHorizontal: 4,
  },
  trays: {
    flexDirection: 'row',
    gap: 14,
    alignSelf: 'stretch',
  },
  tallyCard: {
    flex: 1,
    backgroundColor: MockupPalette.cream,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 10,
  },
  tallyLabel: {
    fontFamily: Fonts.rounded,
    fontSize: 18,
    fontWeight: '800',
  },
  tallyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    width: 110,
  },
  tallyDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
});
