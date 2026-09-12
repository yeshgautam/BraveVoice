// Checkers, reproduced from the design export: two "Captured" pills, an 8x8 navy/cream board with
// yellow pieces (Fin, top) and coral pieces (you, bottom), a "Your Turn" line, and UNDO / END TURN
// buttons — inside the shared GameFrame. Tap your piece, tap a legal diagonal square (or a jump to
// capture), say the pill word to move, then END TURN to hand it to Fin. Simplified: single men,
// single jumps.

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

type Cell = 'you' | 'fin' | null;
type Move = { from: number; to: number; captured: number | null };
const N = 8;
const sq = (r: number, c: number) => r * N + c;
const rc = (i: number) => [Math.floor(i / N), i % N] as const;
const inB = (r: number, c: number) => r >= 0 && r < N && c >= 0 && c < N;
const playable = (r: number, c: number) => (r + c) % 2 === 1;

function initial(): Cell[] {
  const b: Cell[] = Array(N * N).fill(null);
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      if (!playable(r, c)) continue;
      if (r < 3) b[sq(r, c)] = 'fin';
      else if (r > 4) b[sq(r, c)] = 'you';
    }
  return b;
}

function movesFor(b: Cell[], who: Cell): Move[] {
  const dir = who === 'you' ? -1 : 1;
  const out: Move[] = [];
  for (let i = 0; i < b.length; i++) {
    if (b[i] !== who) continue;
    const [r, c] = rc(i);
    for (const dc of [-1, 1]) {
      const nr = r + dir;
      const nc = c + dc;
      if (!inB(nr, nc)) continue;
      const t = b[sq(nr, nc)];
      if (t === null) out.push({ from: i, to: sq(nr, nc), captured: null });
      else if (t !== who) {
        const jr = r + 2 * dir;
        const jc = c + 2 * dc;
        if (inB(jr, jc) && b[sq(jr, jc)] === null) out.push({ from: i, to: sq(jr, jc), captured: sq(nr, nc) });
      }
    }
  }
  return out;
}

const apply = (b: Cell[], m: Move): Cell[] => {
  const n = [...b];
  n[m.to] = n[m.from];
  n[m.from] = null;
  if (m.captured !== null) n[m.captured] = null;
  return n;
};

export function CheckersGame() {
  const { recordGameResult } = useProgress();
  const { activeStrategy, difficultyTier } = useStrategy();
  const speechMetric = useSpeechMetric(activeStrategy);
  const categoryKey = categoryKeyForStrategy(STRATEGY_META[activeStrategy].label) ?? 'easy-onset';

  const [board, setBoard] = useState<Cell[]>(initial);
  const [selected, setSelected] = useState<number | null>(null);
  const [pending, setPending] = useState<Move | null>(null);
  const [captured, setCaptured] = useState({ you: 0, fin: 0 });
  const [movedThisTurn, setMovedThisTurn] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [currentWord, setCurrentWord] = useState(() => pickPracticeItems(difficultyTier, 1)[0] ?? 'rainbow');

  const prevRef = useRef<{ board: Cell[]; captured: { you: number; fin: number } } | null>(null);
  const attemptsRef = useRef(0);
  const wordPoolRef = useRef<string[]>(pickPracticeItems(difficultyTier, 16));
  const wordCounterRef = useRef(0);
  const statAttempt = useRef(0);
  const statCorrect = useRef(0);
  const scoresRef = useRef<number[]>([]);
  const startRef = useRef(Date.now());

  const yourMoves = movesFor(board, 'you');
  const selMoves = selected !== null ? yourMoves.filter((m) => m.from === selected) : [];
  const dests = new Set(selMoves.map((m) => m.to));

  const nextWord = () => {
    const w = wordPoolRef.current[wordCounterRef.current % wordPoolRef.current.length];
    wordCounterRef.current += 1;
    setCurrentWord(w);
  };

  const finish = (youWon: boolean) => {
    setBanner(youWon ? 'You captured them all! 🎉' : 'Fin cleared the board 🐧');
    recordGameResult({
      gameKey: 'checkers',
      categoryKey,
      stars: youWon ? 3 : 1,
      gameName: 'Checkers',
      wordsAttempted: statAttempt.current,
      wordsCorrect: statCorrect.current,
      durationSeconds: Math.round((Date.now() - startRef.current) / 1000),
      strategyScore: scoresRef.current.length ? scoresRef.current.reduce((a, b) => a + b, 0) / scoresRef.current.length / 100 : 0,
    });
  };

  const handleCell = (i: number) => {
    if (banner || movedThisTurn) return;
    if (board[i] === 'you') {
      setSelected(i);
      setPending(null);
      return;
    }
    if (selected !== null && dests.has(i)) {
      const m = selMoves.find((mv) => mv.to === i);
      if (m) {
        setPending(m);
        attemptsRef.current = 0;
        nextWord();
      }
    }
  };

  const handleMic = async () => {
    if (pending === null || banner) return;
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
      prevRef.current = { board, captured };
      const next = apply(board, pending);
      setBoard(next);
      if (pending.captured !== null) setCaptured((c) => ({ ...c, you: c.you + 1 }));
      setSelected(null);
      setPending(null);
      setMovedThisTurn(true);
      if (movesFor(next, 'fin').length === 0 && next.every((v) => v !== 'fin')) finish(true);
    } else if (tier === 'skip' || attemptsRef.current >= MAX_ATTEMPTS_PER_WORD) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setPending(null);
      setSelected(null);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const undo = () => {
    if (!movedThisTurn || !prevRef.current) return;
    setBoard(prevRef.current.board);
    setCaptured(prevRef.current.captured);
    setMovedThisTurn(false);
    setSelected(null);
    setPending(null);
  };

  const endTurn = () => {
    if (banner) return;
    setMovedThisTurn(false);
    setSelected(null);
    setPending(null);
    setTimeout(() => {
      setBoard((b) => {
        const moves = movesFor(b, 'fin');
        if (moves.length === 0) {
          finish(true);
          return b;
        }
        const caps = moves.filter((m) => m.captured !== null);
        const m = (caps.length ? caps : moves)[Math.floor(Math.random() * (caps.length ? caps.length : moves.length))];
        const next = apply(b, m);
        if (m.captured !== null) setCaptured((c) => ({ ...c, fin: c.fin + 1 }));
        if (next.every((v) => v !== 'you')) finish(false);
        return next;
      });
    }, 650);
  };

  return (
    <GameFrame
      title="Checkers"
      currentWord={currentWord}
      onMicPress={handleMic}
      isRecording={speechMetric.isRecording}
      micDisabled={pending === null || banner !== null || speechMetric.isPrepping || speechMetric.isProcessing}
      waveformLevels={speechMetric.liveWaveform}>
      <View style={styles.body}>
        <View style={styles.capRow}>
          <View style={styles.capPill}>
            <View style={[styles.capDot, { backgroundColor: MockupPalette.coral }]} />
            <Text style={styles.capText}>Captured: {captured.you}</Text>
          </View>
          <View style={styles.capPill}>
            <View style={[styles.capDot, { backgroundColor: MockupPalette.yellow }]} />
            <Text style={styles.capText}>Captured: {captured.fin}</Text>
          </View>
        </View>

        <View style={styles.board}>
          {board.map((cell, i) => {
            const [r, c] = rc(i);
            const dark = playable(r, c);
            return (
              <Pressable
                key={i}
                onPress={() => handleCell(i)}
                disabled={!dark || banner !== null || movedThisTurn}
                style={[styles.cell, dark ? styles.cellDark : styles.cellLight, selected === i && styles.cellSel, dests.has(i) && styles.cellDest]}>
                {cell && <View style={[styles.piece, cell === 'you' ? styles.pieceYou : styles.pieceFin]} />}
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.turn}>{banner ?? 'Your Turn'}</Text>

        <View style={styles.btnRow}>
          <Pressable onPress={undo} style={({ pressed }) => [styles.undoBtn, pressed && styles.pressed]}>
            <Text style={styles.undoText}>UNDO</Text>
          </Pressable>
          <Pressable onPress={banner ? () => { setBoard(initial()); setCaptured({ you: 0, fin: 0 }); setBanner(null); setMovedThisTurn(false); startRef.current = Date.now(); } : endTurn} style={({ pressed }) => [styles.endBtn, pressed && styles.pressed]}>
            <Text style={styles.endText}>{banner ? 'NEW GAME' : 'END TURN'}</Text>
          </Pressable>
        </View>
      </View>
    </GameFrame>
  );
}

const CELL = 42;

const styles = StyleSheet.create({
  body: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 12,
  },
  capRow: {
    flexDirection: 'row',
    gap: 12,
    alignSelf: 'stretch',
    backgroundColor: MockupPalette.cream,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  capPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  capDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  capText: {
    fontFamily: Fonts.rounded,
    fontSize: 14,
    fontWeight: '700',
    color: MockupPalette.title,
  },
  board: {
    width: CELL * N,
    height: CELL * N,
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 14,
    overflow: 'hidden',
  },
  cell: {
    width: CELL,
    height: CELL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellLight: {
    backgroundColor: MockupPalette.cream,
  },
  cellDark: {
    backgroundColor: MockupPalette.navy,
  },
  cellSel: {
    backgroundColor: MockupPalette.amber,
  },
  cellDest: {
    backgroundColor: '#3E6DB5',
  },
  piece: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.25)',
  },
  pieceYou: {
    backgroundColor: MockupPalette.coral,
  },
  pieceFin: {
    backgroundColor: MockupPalette.yellow,
  },
  turn: {
    fontFamily: Fonts.rounded,
    fontSize: 18,
    fontWeight: '800',
    color: MockupPalette.navy,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 14,
    alignSelf: 'stretch',
  },
  undoBtn: {
    flex: 1,
    backgroundColor: MockupPalette.lightBlue,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  undoText: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '800',
    color: MockupPalette.navy,
  },
  endBtn: {
    flex: 1,
    backgroundColor: MockupPalette.coral,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
  },
  endText: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.85,
  },
});
