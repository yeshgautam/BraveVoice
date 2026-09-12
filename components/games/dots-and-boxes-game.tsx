// Dots & Boxes, reproduced from the design export: a grid of navy dots on cream, a slate divider,
// and RED / BLACK score cards — inside the shared GameFrame. Say the pill word to draw the next line;
// completing a box claims it for RED and lets you go again, otherwise Fin (BLACK) takes a line. Most
// boxes when the grid fills wins, then it resets.

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

const BW = 6; // boxes wide
const BH = 9; // boxes tall
const SP = 32;
type Owner = 'red' | 'black';

const allEdges = (() => {
  const e: string[] = [];
  for (let r = 0; r <= BH; r++) for (let c = 0; c < BW; c++) e.push(`h-${r}-${c}`);
  for (let r = 0; r < BH; r++) for (let c = 0; c <= BW; c++) e.push(`v-${r}-${c}`);
  return e;
})();

export function DotsAndBoxesGame() {
  const { recordGameResult } = useProgress();
  const { activeStrategy, difficultyTier } = useStrategy();
  const speechMetric = useSpeechMetric(activeStrategy);
  const categoryKey = categoryKeyForStrategy(STRATEGY_META[activeStrategy].label) ?? 'easy-onset';

  const [drawn, setDrawn] = useState<Set<string>>(new Set());
  const [boxes, setBoxes] = useState<Record<string, Owner>>({});
  const [score, setScore] = useState({ red: 0, black: 0 });
  const [banner, setBanner] = useState<string | null>(null);
  const [currentWord, setCurrentWord] = useState(() => pickPracticeItems(difficultyTier, 1)[0] ?? 'rainbow');

  const attemptsRef = useRef(0);
  const wordPoolRef = useRef<string[]>(pickPracticeItems(difficultyTier, 16));
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

  // Draws a random undrawn edge into the given working sets, returns whether it completed a box.
  const drawInto = (dr: Set<string>, bx: Record<string, Owner>, who: Owner): boolean => {
    const avail = allEdges.filter((e) => !dr.has(e));
    if (avail.length === 0) return false;
    const edge = avail[Math.floor(Math.random() * avail.length)];
    dr.add(edge);
    const [dir, rs, cs] = edge.split('-');
    const r = Number(rs);
    const c = Number(cs);
    const candidates = dir === 'h' ? [[r - 1, c], [r, c]] : [[r, c - 1], [r, c]];
    let completed = false;
    for (const [br, bc] of candidates) {
      if (br < 0 || br >= BH || bc < 0 || bc >= BW) continue;
      const key = `${br}-${bc}`;
      if (bx[key]) continue;
      if (dr.has(`h-${br}-${bc}`) && dr.has(`h-${br + 1}-${bc}`) && dr.has(`v-${br}-${bc}`) && dr.has(`v-${br}-${bc + 1}`)) {
        bx[key] = who;
        completed = true;
      }
    }
    return completed;
  };

  const finishIfFull = (bx: Record<string, Owner>, red: number, black: number) => {
    if (Object.keys(bx).length >= BW * BH) {
      setBanner(red >= black ? `You win, ${red}–${black}! 🎉` : `Fin wins, ${black}–${red}.`);
      recordGameResult({
        gameKey: 'dots-and-boxes',
        categoryKey,
        stars: red >= black ? 3 : 1,
        gameName: 'Dots & Boxes',
        wordsAttempted: statAttempt.current,
        wordsCorrect: statCorrect.current,
        durationSeconds: Math.round((Date.now() - startRef.current) / 1000),
        strategyScore: scoresRef.current.length ? scoresRef.current.reduce((a, b) => a + b, 0) / scoresRef.current.length / 100 : 0,
      });
      setTimeout(() => {
        setDrawn(new Set());
        setBoxes({});
        setScore({ red: 0, black: 0 });
        setBanner(null);
        startRef.current = Date.now();
        statAttempt.current = 0;
        statCorrect.current = 0;
        scoresRef.current = [];
      }, 1600);
    }
  };

  const play = () => {
    const dr = new Set(drawn);
    const bx = { ...boxes };
    let red = score.red;
    let black = score.black;
    if (drawInto(dr, bx, 'red')) {
      red += 1; // you completed a box — you'd go again; next word keeps your turn
    } else {
      // Fin takes lines until it stops completing boxes.
      let guard = 0;
      do {
        if (allEdges.every((e) => dr.has(e))) break;
        const did = drawInto(dr, bx, 'black');
        if (did) black += 1;
        else break;
        guard++;
      } while (guard < 40);
    }
    setDrawn(dr);
    setBoxes(bx);
    setScore({ red, black });
    finishIfFull(bx, red, black);
  };

  const handleMic = async () => {
    if (banner) return;
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
      play();
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
      title="Dots & Boxes"
      currentWord={currentWord}
      onMicPress={handleMic}
      isRecording={speechMetric.isRecording}
      micDisabled={banner !== null || speechMetric.isPrepping || speechMetric.isProcessing}
      waveformLevels={speechMetric.liveWaveform}>
      <View style={styles.body}>
        <View style={styles.gridCard}>
          <View style={{ width: BW * SP, height: BH * SP }}>
            {/* filled boxes */}
            {Object.entries(boxes).map(([key, owner]) => {
              const [br, bc] = key.split('-').map(Number);
              return <View key={key} style={[styles.box, { left: bc * SP + 4, top: br * SP + 4, backgroundColor: owner === 'red' ? 'rgba(232,105,74,0.5)' : 'rgba(43,75,142,0.5)' }]} />;
            })}
            {/* drawn edges */}
            {[...drawn].map((e) => {
              const [dir, rs, cs] = e.split('-');
              const r = Number(rs);
              const c = Number(cs);
              return dir === 'h' ? (
                <View key={e} style={[styles.hLine, { left: c * SP, top: r * SP - 1.5 }]} />
              ) : (
                <View key={e} style={[styles.vLine, { left: c * SP - 1.5, top: r * SP }]} />
              );
            })}
            {/* dots */}
            {Array.from({ length: (BH + 1) * (BW + 1) }, (_, i) => {
              const r = Math.floor(i / (BW + 1));
              const c = i % (BW + 1);
              return <View key={i} style={[styles.dot, { left: c * SP - 3, top: r * SP - 3 }]} />;
            })}
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.scores}>
          <View style={styles.scoreCard}>
            <Text style={[styles.scoreLabel, { color: MockupPalette.coral }]}>RED</Text>
            <Text style={styles.scoreValue}>{score.red}</Text>
          </View>
          <View style={styles.scoreCard}>
            <Text style={[styles.scoreLabel, { color: MockupPalette.navy }]}>BLACK</Text>
            <Text style={styles.scoreValue}>{score.black}</Text>
          </View>
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
    paddingTop: 10,
    gap: 12,
  },
  gridCard: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: MockupPalette.cream,
    borderRadius: 16,
    paddingVertical: 16,
  },
  dot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: MockupPalette.navy,
  },
  hLine: {
    position: 'absolute',
    width: SP,
    height: 3,
    borderRadius: 2,
    backgroundColor: MockupPalette.coral,
  },
  vLine: {
    position: 'absolute',
    width: 3,
    height: SP,
    borderRadius: 2,
    backgroundColor: MockupPalette.coral,
  },
  box: {
    position: 'absolute',
    width: SP - 8,
    height: SP - 8,
    borderRadius: 4,
  },
  divider: {
    alignSelf: 'stretch',
    height: 8,
    borderRadius: 4,
    backgroundColor: MockupPalette.slate,
  },
  scores: {
    flexDirection: 'row',
    gap: 14,
    alignSelf: 'stretch',
  },
  scoreCard: {
    flex: 1,
    backgroundColor: MockupPalette.cream,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 4,
  },
  scoreLabel: {
    fontFamily: Fonts.rounded,
    fontSize: 18,
    fontWeight: '800',
  },
  scoreValue: {
    fontFamily: Fonts.rounded,
    fontSize: 30,
    fontWeight: '800',
    color: MockupPalette.title,
  },
});
