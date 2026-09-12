// Tic-Tac-Toe, reproduced from the design export: a cream win-tally pill (X Wins / O Wins /
// Draws), a light-blue 3x3 board with slate gridlines and navy X / coral O marks, a colored turn
// line, and a NEW GAME pill — all inside the shared GameFrame (slate header + orange line, and the
// mic / penguin / RAINBOW-word pill at the bottom). You are X; say the word on the pill to place
// your mark in the tapped square, then Fin (O) answers. It's an endless match: the tally keeps
// score and NEW GAME re-racks the board.

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

type Mark = 'X' | 'O' | null;

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function checkWinner(board: Mark[]): { winner: Mark; line: number[] } | null {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return { winner: board[a], line };
  }
  return null;
}

// Win → block → center → corner → random. Beatable on purpose — this is speech practice.
function pickAiSquare(board: Mark[]): number {
  const empty = board.map((v, i) => (v === null ? i : -1)).filter((i) => i >= 0);
  for (const i of empty) {
    const copy = [...board];
    copy[i] = 'O';
    if (checkWinner(copy)?.winner === 'O') return i;
  }
  for (const i of empty) {
    const copy = [...board];
    copy[i] = 'X';
    if (checkWinner(copy)?.winner === 'X') return i;
  }
  if (board[4] === null) return 4;
  const corners = [0, 2, 6, 8].filter((i) => board[i] === null);
  if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];
  return empty[Math.floor(Math.random() * empty.length)];
}

export function TicTacToeGame() {
  const { recordGameResult } = useProgress();
  const { activeStrategy, difficultyTier } = useStrategy();
  const speechMetric = useSpeechMetric(activeStrategy);
  const categoryKey = categoryKeyForStrategy(STRATEGY_META[activeStrategy].label) ?? 'easy-onset';

  const [board, setBoard] = useState<Mark[]>(Array(9).fill(null));
  const [selected, setSelected] = useState<number | null>(null);
  const [turn, setTurn] = useState<'X' | 'O'>('X');
  const [resultLine, setResultLine] = useState<number[] | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [stats, setStats] = useState({ x: 0, o: 0, d: 0 });
  const [currentWord, setCurrentWord] = useState(() => pickPracticeItems(difficultyTier, 1)[0] ?? 'rainbow');

  const attemptsRef = useRef(0);
  const wordPoolRef = useRef<string[]>(pickPracticeItems(difficultyTier, 12));
  const wordCounterRef = useRef(0);
  const wordsAttemptedRef = useRef(0);
  const wordsCorrectRef = useRef(0);
  const scoresRef = useRef<number[]>([]);
  const sessionStartRef = useRef(Date.now());

  const matchOver = banner !== null;
  const busy = turn !== 'X' || matchOver;

  const nextWord = () => {
    const w = wordPoolRef.current[wordCounterRef.current % wordPoolRef.current.length];
    wordCounterRef.current += 1;
    setCurrentWord(w);
  };

  const recordMatch = (stars: number) => {
    const avg = scoresRef.current.length ? scoresRef.current.reduce((a, b) => a + b, 0) / scoresRef.current.length / 100 : 0;
    recordGameResult({
      gameKey: 'tic-tac-toe',
      categoryKey,
      stars,
      gameName: 'Tic-Tac-Toe',
      wordsAttempted: wordsAttemptedRef.current,
      wordsCorrect: wordsCorrectRef.current,
      durationSeconds: Math.round((Date.now() - sessionStartRef.current) / 1000),
      strategyScore: avg,
    });
  };

  const endMatch = (winner: Mark | 'draw') => {
    if (winner === 'X') {
      setStats((s) => ({ ...s, x: s.x + 1 }));
      setBanner('X Wins!');
      recordMatch(3);
    } else if (winner === 'O') {
      setStats((s) => ({ ...s, o: s.o + 1 }));
      setBanner('O Wins!');
      recordMatch(1);
    } else {
      setStats((s) => ({ ...s, d: s.d + 1 }));
      setBanner("It's a Draw!");
      recordMatch(2);
    }
  };

  const aiMove = (afterBoard: Mark[]) => {
    setTimeout(() => {
      const sq = pickAiSquare(afterBoard);
      const next = [...afterBoard];
      next[sq] = 'O';
      setBoard(next);
      const win = checkWinner(next);
      if (win) {
        setResultLine(win.line);
        endMatch('O');
      } else if (next.every((v) => v !== null)) {
        endMatch('draw');
      } else {
        setTurn('X');
      }
    }, 600);
  };

  const handleCellPress = (i: number) => {
    if (busy || board[i] !== null) return;
    setSelected(i);
    attemptsRef.current = 0;
    nextWord();
  };

  const handleMic = async () => {
    if (selected === null || busy) return;
    if (speechMetric.isRecording) {
      speechMetric.stop();
      return;
    }
    const result = await speechMetric.start();
    if (speechMetric.permissionDenied) return;
    if (result.noSpeechDetected) return;

    attemptsRef.current += 1;
    wordsAttemptedRef.current += 1;
    scoresRef.current.push(result.score);
    const tier = getFeedbackTier(result.score, attemptsRef.current);
    const success = tier === 'excellent' || tier === 'good';

    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      wordsCorrectRef.current += 1;
      const placedAt = selected;
      const next = [...board];
      next[placedAt] = 'X';
      setBoard(next);
      setSelected(null);
      const win = checkWinner(next);
      if (win) {
        setResultLine(win.line);
        endMatch('X');
      } else if (next.every((v) => v !== null)) {
        endMatch('draw');
      } else {
        setTurn('O');
        aiMove(next);
      }
    } else if (tier === 'skip' || attemptsRef.current >= MAX_ATTEMPTS_PER_WORD) {
      // Too many misses on this square — release it so the child can pick a different one.
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setSelected(null);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const newGame = () => {
    setBoard(Array(9).fill(null));
    setSelected(null);
    setTurn('X');
    setResultLine(null);
    setBanner(null);
    attemptsRef.current = 0;
    wordsAttemptedRef.current = 0;
    wordsCorrectRef.current = 0;
    scoresRef.current = [];
    sessionStartRef.current = Date.now();
    nextWord();
  };

  const turnText = banner ?? `${turn}'s Turn`;
  const turnColor = matchOver ? MockupPalette.title : turn === 'X' ? MockupPalette.navy : MockupPalette.coral;

  return (
    <GameFrame
      title="Tic-Tac-Toe"
      currentWord={currentWord}
      onMicPress={handleMic}
      isRecording={speechMetric.isRecording}
      micDisabled={selected === null || busy || speechMetric.isPrepping || speechMetric.isProcessing}
      waveformLevels={speechMetric.liveWaveform}>
      <View style={styles.body}>
        <View style={styles.statsPill}>
          <Text style={[styles.statText, { color: MockupPalette.navy }]}>X Wins: {stats.x}</Text>
          <Text style={styles.statDot}>•</Text>
          <Text style={[styles.statText, { color: MockupPalette.coral }]}>O Wins: {stats.o}</Text>
          <Text style={styles.statDot}>•</Text>
          <Text style={[styles.statText, { color: MockupPalette.subtitle }]}>Draws: {stats.d}</Text>
        </View>

        <View style={styles.board}>
          {board.map((mark, i) => {
            const col = i % 3;
            const row = Math.floor(i / 3);
            return (
              <Pressable
                key={i}
                onPress={() => handleCellPress(i)}
                disabled={busy || mark !== null}
                style={[
                  styles.cell,
                  col < 2 && styles.cellRightBorder,
                  row < 2 && styles.cellBottomBorder,
                  selected === i && styles.cellSelected,
                  resultLine?.includes(i) && styles.cellWin,
                ]}>
                {mark && (
                  <Text style={[styles.mark, { color: mark === 'X' ? MockupPalette.navy : MockupPalette.coral }]}>{mark}</Text>
                )}
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.turnText, { color: turnColor }]}>{turnText}</Text>

        <Pressable onPress={newGame} style={({ pressed }) => [styles.newGameBtn, pressed && styles.pressed]}>
          <Text style={styles.newGameText}>NEW GAME</Text>
        </Pressable>
      </View>
    </GameFrame>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 14,
  },
  statsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'stretch',
    justifyContent: 'center',
    backgroundColor: MockupPalette.cream,
    borderRadius: 16,
    paddingVertical: 12,
  },
  statText: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    fontWeight: '700',
  },
  statDot: {
    fontSize: 12,
    color: MockupPalette.amber,
  },
  board: {
    width: 300,
    height: 300,
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: MockupPalette.lightBlue,
    borderRadius: 20,
    overflow: 'hidden',
  },
  cell: {
    width: '33.333%',
    height: '33.333%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellRightBorder: {
    borderRightWidth: 2,
    borderRightColor: MockupPalette.slate,
  },
  cellBottomBorder: {
    borderBottomWidth: 2,
    borderBottomColor: MockupPalette.slate,
  },
  cellSelected: {
    backgroundColor: '#C4DCF2',
  },
  cellWin: {
    backgroundColor: '#FBE3D3',
  },
  mark: {
    fontFamily: Fonts.rounded,
    fontSize: 56,
    fontWeight: '800',
  },
  turnText: {
    fontFamily: Fonts.rounded,
    fontSize: 20,
    fontWeight: '800',
  },
  newGameBtn: {
    alignSelf: 'stretch',
    backgroundColor: MockupPalette.newGamePill,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  newGameText: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
    color: MockupPalette.navy,
  },
  pressed: {
    opacity: 0.85,
  },
});
