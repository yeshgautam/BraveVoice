// Checkers-lite for 8+ mode: a small 6x6 board, three penguins each. Tap your piece, tap a legal
// diagonal square (or a jump over Fin's piece to capture it), then say the word to make the move.
// Capture all of Fin's pieces to win. Like tic-tac-toe-game.tsx it composes the shared primitives
// directly rather than using GameScreen.tsx's fixed-5-round shell (variable turns, AI opponent,
// early win). Simplified from full checkers: single men only (no kings), single jumps (no chains),
// captures optional — it's a speech-practice game, not a checkers engine.

import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { LiveWaveform } from '@/components/games/live-waveform';
import { SmoothSailingSlider } from '@/components/games/smooth-sailing-slider';
import { StrategySwitcherModal } from '@/components/games/strategy-switcher-modal';
import { Fonts } from '@/constants/theme';
import { GamesPalette } from '@/constants/games-theme';
import { pickPracticeItems } from '@/content/practiceWords';
import { useFluencyRatings } from '@/contexts/fluency-rating-context';
import { categoryKeyForStrategy, useProgress } from '@/contexts/progress-context';
import { STRATEGY_META, useStrategy } from '@/contexts/strategy-context';
import { FinCharacter, FinState } from '@/game-engine/FinCharacter';
import { MicPermissionGate } from '@/game-engine/MicPermissionGate';
import { Snowfall } from '@/game-engine/Snowfall';
import { useSpeechMetric } from '@/game-engine/useSpeechMetric';
import { MAX_ATTEMPTS_PER_WORD, getFeedbackMessage, getFeedbackTier } from '@/utils/speech-analysis';

type Owner = 'child' | 'opponent';
type Cell = Owner | null;
type Move = { from: number; to: number; captured: number | null };
type MatchPhase = 'playing' | 'roundEnd' | 'rating' | 'summary';

const SIZE = 6;
const sq = (r: number, c: number) => r * SIZE + c;
const rowOf = (i: number) => Math.floor(i / SIZE);
const colOf = (i: number) => i % SIZE;
const inB = (r: number, c: number) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;
const playable = (r: number, c: number) => (r + c) % 2 === 1;

function initialBoard(): Cell[] {
  const b: Cell[] = Array(SIZE * SIZE).fill(null);
  for (let c = 0; c < SIZE; c++) {
    if (playable(0, c)) b[sq(0, c)] = 'opponent';
    if (playable(SIZE - 1, c)) b[sq(SIZE - 1, c)] = 'child';
  }
  return b;
}

function movesFor(board: Cell[], owner: Owner): Move[] {
  const dir = owner === 'child' ? -1 : 1;
  const moves: Move[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] !== owner) continue;
    const r = rowOf(i);
    const c = colOf(i);
    for (const dc of [-1, 1]) {
      const nr = r + dir;
      const nc = c + dc;
      if (!inB(nr, nc)) continue;
      const target = board[sq(nr, nc)];
      if (target === null) {
        moves.push({ from: i, to: sq(nr, nc), captured: null });
      } else if (target !== owner) {
        const jr = r + 2 * dir;
        const jc = c + 2 * dc;
        if (inB(jr, jc) && board[sq(jr, jc)] === null) {
          moves.push({ from: i, to: sq(jr, jc), captured: sq(nr, nc) });
        }
      }
    }
  }
  return moves;
}

function applyMove(board: Cell[], move: Move): Cell[] {
  const next = [...board];
  next[move.to] = next[move.from];
  next[move.from] = null;
  if (move.captured !== null) next[move.captured] = null;
  return next;
}

const countPieces = (board: Cell[], owner: Owner) => board.filter((c) => c === owner).length;

export function CheckersLiteGame() {
  const router = useRouter();
  const { recordGameResult } = useProgress();
  const { recordFluencyRating } = useFluencyRatings();
  const { activeStrategy, difficultyTier } = useStrategy();

  const [phase, setPhase] = useState<MatchPhase>('playing');
  const [board, setBoard] = useState<Cell[]>(() => initialBoard());
  const [currentPlayer, setCurrentPlayer] = useState<Owner>('child');
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
  const [pendingMove, setPendingMove] = useState<Move | null>(null);
  const [currentWord, setCurrentWord] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [finState, setFinState] = useState<FinState>('idle');
  const [matchWinner, setMatchWinner] = useState<Owner | null>(null);
  const [strategyModalOpen, setStrategyModalOpen] = useState(false);

  const attemptsRef = useRef(0);
  const wordsAttemptedRef = useRef(0);
  const wordsCorrectRef = useRef(0);
  const sessionStartRef = useRef(Date.now());
  const scoresRef = useRef<number[]>([]);
  const wordPoolRef = useRef<string[]>(pickPracticeItems(difficultyTier, 12));
  const wordCounterRef = useRef(0);

  const speechMetric = useSpeechMetric(activeStrategy);
  const categoryKey = categoryKeyForStrategy(STRATEGY_META[activeStrategy].label) ?? 'easy-onset';

  useEffect(() => {
    if (pendingMove === null) return;
    if (speechMetric.isProcessing) setFinState('thinking');
    else if (speechMetric.isRecording) setFinState('listening');
  }, [speechMetric.isRecording, speechMetric.isProcessing, pendingMove]);

  const childMoves = currentPlayer === 'child' ? movesFor(board, 'child') : [];
  const selectedMoves = selectedPiece !== null ? childMoves.filter((m) => m.from === selectedPiece) : [];
  const legalDests = new Set(selectedMoves.map((m) => m.to));

  const startMatch = () => {
    setBoard(initialBoard());
    setCurrentPlayer('child');
    setSelectedPiece(null);
    setPendingMove(null);
    setCurrentWord('');
    setAttempt(0);
    setFeedback('');
    setFinState('idle');
    setMatchWinner(null);
    attemptsRef.current = 0;
    wordsAttemptedRef.current = 0;
    wordsCorrectRef.current = 0;
    scoresRef.current = [];
    wordCounterRef.current = 0;
    sessionStartRef.current = Date.now();
    setPhase('playing');
  };

  const finishMatch = (winner: Owner) => {
    setMatchWinner(winner);
    setPhase('roundEnd');
    setFinState(winner === 'opponent' ? 'encouraging' : 'celebrating');
  };

  const placeAiMove = (currentBoard: Cell[]) => {
    setTimeout(() => {
      const moves = movesFor(currentBoard, 'opponent');
      if (moves.length === 0) {
        finishMatch('child');
        return;
      }
      const captures = moves.filter((m) => m.captured !== null);
      const pool = captures.length > 0 ? captures : moves;
      const move = pool[Math.floor(Math.random() * pool.length)];
      const next = applyMove(currentBoard, move);
      setBoard(next);
      if (countPieces(next, 'child') === 0) {
        finishMatch('opponent');
      } else if (movesFor(next, 'child').length === 0) {
        finishMatch('opponent');
      } else {
        setCurrentPlayer('child');
      }
    }, 700);
  };

  const handleCellPress = (index: number) => {
    if (phase !== 'playing' || currentPlayer !== 'child' || pendingMove !== null) return;
    if (board[index] === 'child') {
      // (Re)select one of your own pieces.
      setSelectedPiece(index);
      setFeedback('');
      return;
    }
    if (selectedPiece !== null && legalDests.has(index)) {
      const move = selectedMoves.find((m) => m.to === index);
      if (!move) return;
      setPendingMove(move);
      setAttempt(0);
      attemptsRef.current = 0;
      setFeedback('');
      const word = wordPoolRef.current[wordCounterRef.current % wordPoolRef.current.length];
      wordCounterRef.current += 1;
      setCurrentWord(word);
    }
  };

  const handleMicPress = async () => {
    if (pendingMove === null) return;
    if (speechMetric.isRecording) {
      speechMetric.stop();
      return;
    }
    setFeedback('');
    const result = await speechMetric.start();
    if (speechMetric.permissionDenied) {
      setFinState('idle');
      return;
    }
    if (result.noSpeechDetected) {
      setFinState('encouraging');
      setFeedback("Didn't catch that — try again! 💛");
      setTimeout(() => {
        setFinState('idle');
        setFeedback('');
      }, 1400);
      return;
    }

    attemptsRef.current += 1;
    wordsAttemptedRef.current += 1;
    scoresRef.current.push(result.score);
    const tier = getFeedbackTier(result.score, attemptsRef.current);
    const success = tier === 'excellent' || tier === 'good';
    setFeedback(getFeedbackMessage(tier));

    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      wordsCorrectRef.current += 1;
      setFinState('celebrating');
      const next = applyMove(board, pendingMove);
      setBoard(next);
      setSelectedPiece(null);
      setPendingMove(null);
      setAttempt(0);

      if (countPieces(next, 'opponent') === 0) {
        setTimeout(() => finishMatch('child'), 500);
        return;
      }
      setCurrentPlayer('opponent');
      setTimeout(() => setFinState('idle'), 500);
      placeAiMove(next);
    } else if (tier === 'skip' || attemptsRef.current >= MAX_ATTEMPTS_PER_WORD) {
      // Too many misses — cancel this move so the child can pick again; the turn stays theirs.
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setFinState('encouraging');
      setTimeout(() => {
        setPendingMove(null);
        setSelectedPiece(null);
        setAttempt(0);
        setFinState('idle');
      }, 1100);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setFinState('encouraging');
      setAttempt((a) => a + 1);
      setTimeout(() => setFinState('idle'), 900);
    }
  };

  const stars = matchWinner === 'child' ? 3 : wordsCorrectRef.current >= 3 ? 1 : 0;

  const finishSession = () => {
    const avgScore = scoresRef.current.length
      ? scoresRef.current.reduce((a, b) => a + b, 0) / scoresRef.current.length / 100
      : 0;
    recordGameResult({
      gameKey: 'checkers-lite',
      categoryKey,
      stars,
      gameName: 'Checkers-lite',
      wordsAttempted: wordsAttemptedRef.current,
      wordsCorrect: wordsCorrectRef.current,
      durationSeconds: Math.round((Date.now() - sessionStartRef.current) / 1000),
      strategyScore: avgScore,
    });
    setPhase('summary');
  };

  return (
    <MicPermissionGate>
      <View style={styles.root}>
        <Snowfall />

        <View style={styles.topBar}>
          <Pressable style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]} onPress={() => router.back()}>
            <Text style={styles.iconButtonText}>← Back</Text>
          </Pressable>
          <Text style={styles.title}>Checkers-lite</Text>
          <Pressable
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            onPress={() => setStrategyModalOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Strategy settings">
            <Text style={styles.iconButtonText}>⚙️</Text>
          </Pressable>
        </View>

        <Text style={styles.strategyLabel}>Strategy: {STRATEGY_META[activeStrategy].label}</Text>

        {phase === 'playing' && (
          <View style={styles.playArea}>
            <Text style={styles.turnIndicator}>
              {currentPlayer === 'child'
                ? selectedPiece === null
                  ? 'Your turn — tap a penguin!'
                  : 'Tap where to move it!'
                : 'Fin is thinking…'}
            </Text>

            <View style={styles.board}>
              {board.map((cell, i) => {
                const r = rowOf(i);
                const c = colOf(i);
                const dark = playable(r, c);
                const isSelected = selectedPiece === i;
                const isDest = legalDests.has(i);
                return (
                  <Pressable
                    key={i}
                    style={[
                      styles.cell,
                      dark ? styles.cellDark : styles.cellLight,
                      isSelected && styles.cellSelected,
                      isDest && styles.cellDest,
                    ]}
                    onPress={() => handleCellPress(i)}
                    disabled={!dark || currentPlayer !== 'child' || pendingMove !== null}>
                    {cell && <Text style={styles.pieceEmoji}>{cell === 'child' ? '🐧' : '🐾'}</Text>}
                  </Pressable>
                );
              })}
            </View>

            {pendingMove !== null && (
              <View style={styles.speakRow}>
                <FinCharacter state={finState} size={72} />
                <View style={styles.wordBubble}>
                  <Text style={styles.wordText}>{currentWord.toUpperCase()}</Text>
                </View>
                <Text style={styles.feedbackText}>
                  {speechMetric.isPrepping
                    ? 'Get ready…'
                    : speechMetric.isRecording
                      ? 'Listening…'
                      : speechMetric.isProcessing
                        ? 'Thinking…'
                        : feedback || 'Tap the mic and say it!'}
                </Text>
                {speechMetric.isRecording && (
                  <LiveWaveform levels={speechMetric.liveWaveform} color={GamesPalette.navyAccent} height={30} />
                )}
                <Pressable
                  style={({ pressed }) => [styles.micButton, speechMetric.isRecording && styles.micButtonActive, pressed && styles.pressed]}
                  disabled={speechMetric.isPrepping || speechMetric.isProcessing}
                  onPress={handleMicPress}>
                  <Text style={styles.micIcon}>🎤</Text>
                </Pressable>
                {attempt > 0 && <Text style={styles.attemptHint}>Try {attempt + 1} of {MAX_ATTEMPTS_PER_WORD}</Text>}
              </View>
            )}
          </View>
        )}

        {phase === 'roundEnd' && (
          <View style={styles.center}>
            <FinCharacter state={matchWinner === 'opponent' ? 'encouraging' : 'celebrating'} size={150} />
            <Text style={styles.modeTitle}>
              {matchWinner === 'child'
                ? 'You captured all of Fin’s pieces — you win! 🎉'
                : 'Fin captured your pieces this time — nice game! 🐧'}
            </Text>
            <Pressable style={({ pressed }) => [styles.modeButton, pressed && styles.pressed]} onPress={() => setPhase('rating')}>
              <Text style={styles.modeButtonText}>Continue</Text>
            </Pressable>
          </View>
        )}

        {phase === 'rating' && (
          <SmoothSailingSlider
            onSelect={(rating) => {
              recordFluencyRating('checkers-lite', rating);
              finishSession();
            }}
          />
        )}

        {phase === 'summary' && (
          <View style={styles.center}>
            <FinCharacter state="celebrating" size={150} />
            <Text style={styles.modeTitle}>{'⭐'.repeat(stars) || '💪'}</Text>
            <Text style={styles.summaryText}>
              {wordsCorrectRef.current} of {wordsAttemptedRef.current} words practiced smoothly!
            </Text>
            <Pressable style={({ pressed }) => [styles.modeButton, pressed && styles.pressed]} onPress={startMatch}>
              <Text style={styles.modeButtonText}>Play Again</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.modeButtonSecondary, pressed && styles.pressed]} onPress={() => router.back()}>
              <Text style={styles.modeButtonSecondaryText}>Back to Games</Text>
            </Pressable>
          </View>
        )}

        <StrategySwitcherModal visible={strategyModalOpen} onClose={() => setStrategyModalOpen(false)} />
      </View>
    </MicPermissionGate>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: GamesPalette.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
  },
  iconButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: GamesPalette.navyAccent,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  iconButtonText: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    fontWeight: '700',
    color: GamesPalette.navyAccent,
  },
  title: {
    fontFamily: Fonts.rounded,
    fontSize: 20,
    fontWeight: '800',
    color: GamesPalette.title,
  },
  strategyLabel: {
    fontFamily: Fonts.rounded,
    fontSize: 12,
    fontWeight: '700',
    color: GamesPalette.subtitle,
    textAlign: 'center',
    marginTop: 4,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 32,
  },
  modeTitle: {
    fontFamily: Fonts.rounded,
    fontSize: 22,
    fontWeight: '800',
    color: GamesPalette.title,
    textAlign: 'center',
  },
  modeButton: {
    backgroundColor: GamesPalette.amberAccent,
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 32,
    minWidth: 260,
    alignItems: 'center',
  },
  modeButtonText: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modeButtonSecondary: {
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 32,
    minWidth: 260,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: GamesPalette.navyAccent,
  },
  modeButtonSecondaryText: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '700',
    color: GamesPalette.navyAccent,
  },
  summaryText: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '600',
    color: GamesPalette.subtitle,
    textAlign: 'center',
  },
  playArea: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 8,
    gap: 14,
  },
  turnIndicator: {
    fontFamily: Fonts.rounded,
    fontSize: 17,
    fontWeight: '800',
    color: GamesPalette.title,
  },
  board: {
    width: 300,
    height: 300,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: GamesPalette.iceBorder,
  },
  cell: {
    width: `${100 / SIZE}%`,
    height: `${100 / SIZE}%`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellLight: {
    backgroundColor: '#EAF4FC',
  },
  cellDark: {
    backgroundColor: '#B5D4F4',
  },
  cellSelected: {
    backgroundColor: GamesPalette.amberAccent,
  },
  cellDest: {
    backgroundColor: '#CDEBD6',
  },
  pieceEmoji: {
    fontSize: 26,
  },
  speakRow: {
    alignItems: 'center',
    gap: 8,
  },
  wordBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: GamesPalette.iceBorder,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  wordText: {
    fontFamily: Fonts.rounded,
    fontSize: 20,
    fontWeight: '800',
    color: GamesPalette.title,
    letterSpacing: 1,
  },
  feedbackText: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '600',
    color: GamesPalette.subtitle,
    minHeight: 18,
  },
  micButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: GamesPalette.amberAccent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  micButtonActive: {
    opacity: 0.88,
  },
  micIcon: {
    fontSize: 28,
  },
  attemptHint: {
    fontFamily: Fonts.rounded,
    fontSize: 11,
    fontWeight: '600',
    color: GamesPalette.subtitle,
  },
  pressed: {
    opacity: 0.85,
  },
});
