// Wavelength, reproduced from the design export: a "clue giver's word" card, a Cold→Hot gradient
// spectrum with a movable knob, a Team A / Team B score + round panel, and ← / LOCK IN / → controls
// — inside the shared GameFrame. Nudge the knob with the arrows toward where the word falls, then say
// the pill word (or LOCK IN) to score by how close you landed; play 10 rounds.

import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { GameFrame } from '@/components/games/game-frame';
import { Fonts } from '@/constants/theme';
import { MockupPalette } from '@/constants/games-theme';
import { pickPracticeItems } from '@/content/practiceWords';
import { categoryKeyForStrategy, useProgress } from '@/contexts/progress-context';
import { STRATEGY_META, useStrategy } from '@/contexts/strategy-context';
import { useSpeechMetric } from '@/game-engine/useSpeechMetric';
import { MAX_ATTEMPTS_PER_WORD, getFeedbackTier } from '@/utils/speech-analysis';

const CONCEPTS = ['SUNSHINE', 'AN ICE CUBE', 'A CAMPFIRE', 'A SNOWSTORM', 'FRESH SOUP', 'A COLD POOL'];
const BAR_W = 300;
const KNOB = 30;

export function WavelengthGame() {
  const { recordGameResult } = useProgress();
  const { activeStrategy, difficultyTier } = useStrategy();
  const speechMetric = useSpeechMetric(activeStrategy);
  const categoryKey = categoryKeyForStrategy(STRATEGY_META[activeStrategy].label) ?? 'easy-onset';

  const [concept, setConcept] = useState(() => CONCEPTS[Math.floor(Math.random() * CONCEPTS.length)]);
  const [pos, setPos] = useState(0.5);
  const [target, setTarget] = useState(() => Math.random());
  const [round, setRound] = useState(1);
  const [teams, setTeams] = useState({ a: 0, b: 0 });
  const [banner, setBanner] = useState<string | null>(null);
  const [currentWord, setCurrentWord] = useState(() => pickPracticeItems(difficultyTier, 1)[0] ?? 'rainbow');
  const knobX = useSharedValue(0.5 * (BAR_W - KNOB));

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

  const move = (delta: number) => {
    if (banner) return;
    setPos((p) => {
      const np = Math.max(0, Math.min(1, p + delta));
      knobX.value = withSpring(np * (BAR_W - KNOB), { damping: 14, stiffness: 140 });
      return np;
    });
  };

  const lockIn = () => {
    const closeness = 1 - Math.abs(pos - target);
    const pts = Math.round(closeness * 4);
    const finGain = Math.round(Math.random() * 3);
    Haptics.notificationAsync(pts >= 3 ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    setTeams((t) => {
      const a = t.a + pts;
      const b = t.b + finGain;
      if (round >= 10) {
        recordGameResult({
          gameKey: 'wavelength',
          categoryKey,
          stars: a >= b ? 3 : 1,
          gameName: 'Wavelength',
          wordsAttempted: statAttempt.current,
          wordsCorrect: statCorrect.current,
          durationSeconds: Math.round((Date.now() - startRef.current) / 1000),
          strategyScore: scoresRef.current.length ? scoresRef.current.reduce((x, y) => x + y, 0) / scoresRef.current.length / 100 : 0,
        });
        setBanner(a >= b ? `Team A wins, ${a}–${b}! 🎉` : `Team B wins, ${b}–${a}.`);
      }
      return { a, b };
    });
    if (round < 10) {
      setRound((r) => r + 1);
      setConcept(CONCEPTS[Math.floor(Math.random() * CONCEPTS.length)]);
      setTarget(Math.random());
      setPos(0.5);
      knobX.value = withSpring(0.5 * (BAR_W - KNOB));
    }
  };

  const handleMic = async () => {
    if (banner) {
      // tap-to-replay via mic once the match ends
      setBanner(null);
      setTeams({ a: 0, b: 0 });
      setRound(1);
      startRef.current = Date.now();
      statAttempt.current = 0;
      statCorrect.current = 0;
      scoresRef.current = [];
      return;
    }
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
      lockIn();
    } else if (tier === 'skip' || attemptsRef.current >= MAX_ATTEMPTS_PER_WORD) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      attemptsRef.current = 0;
      nextWord();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: knobX.value }] }));

  return (
    <GameFrame
      title="Wavelength"
      currentWord={currentWord}
      onMicPress={handleMic}
      isRecording={speechMetric.isRecording}
      micDisabled={speechMetric.isPrepping || speechMetric.isProcessing}
      waveformLevels={speechMetric.liveWaveform}>
      <View style={styles.body}>
        <View style={styles.conceptCard}>
          <Text style={styles.concept}>{concept}</Text>
          <Text style={styles.conceptSub}>Clue giver&apos;s word</Text>
        </View>

        <View style={styles.spectrumWrap}>
          <View style={styles.labelRow}>
            <Text style={[styles.endLabel, { color: MockupPalette.navy }]}>Cold</Text>
            <Text style={[styles.endLabel, { color: MockupPalette.coral }]}>Hot</Text>
          </View>
          <View style={styles.barWrap}>
            <LinearGradient colors={['#3E5C8A', '#9B6E86', MockupPalette.coral]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.bar} />
            <Animated.View style={[styles.knob, knobStyle]} />
          </View>
        </View>

        <View style={styles.scorePanel}>
          <View style={styles.teamRow}>
            <Text style={styles.teamText}>
              <Text style={{ color: MockupPalette.navy }}>● </Text>Team A: {teams.a}
            </Text>
            <Text style={styles.teamText}>
              Team B: {teams.b}<Text style={{ color: MockupPalette.coral }}> ●</Text>
            </Text>
          </View>
          <Text style={styles.roundText}>{banner ?? `Round ${Math.min(round, 10)}/10`}</Text>
        </View>

        <View style={styles.controls}>
          <Pressable onPress={() => move(-0.08)} style={({ pressed }) => [styles.arrowBtn, pressed && styles.pressed]}>
            <Text style={styles.arrowText}>←</Text>
          </Pressable>
          <Pressable onPress={banner ? handleMic : lockIn} style={({ pressed }) => [styles.lockBtn, pressed && styles.pressed]}>
            <Text style={styles.lockText}>{banner ? 'PLAY AGAIN' : 'LOCK IN'}</Text>
          </Pressable>
          <Pressable onPress={() => move(0.08)} style={({ pressed }) => [styles.arrowBtn, pressed && styles.pressed]}>
            <Text style={styles.arrowText}>→</Text>
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
    gap: 18,
  },
  conceptCard: {
    alignSelf: 'stretch',
    alignItems: 'center',
    backgroundColor: MockupPalette.cream,
    borderRadius: 16,
    paddingVertical: 18,
    gap: 4,
  },
  concept: {
    fontFamily: Fonts.rounded,
    fontSize: 26,
    fontWeight: '800',
    color: MockupPalette.navy,
    letterSpacing: 1,
  },
  conceptSub: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '600',
    color: MockupPalette.subtitle,
  },
  spectrumWrap: {
    alignSelf: 'stretch',
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  endLabel: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '800',
  },
  barWrap: {
    width: BAR_W,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  bar: {
    height: 34,
    borderRadius: 17,
  },
  knob: {
    position: 'absolute',
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: MockupPalette.yellow,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    left: 2,
  },
  scorePanel: {
    alignSelf: 'stretch',
    backgroundColor: MockupPalette.cream,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 8,
  },
  teamRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  teamText: {
    fontFamily: Fonts.rounded,
    fontSize: 16,
    fontWeight: '800',
    color: MockupPalette.title,
  },
  roundText: {
    fontFamily: Fonts.rounded,
    fontSize: 13,
    fontWeight: '600',
    color: MockupPalette.subtitle,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
    alignSelf: 'stretch',
  },
  arrowBtn: {
    width: 72,
    backgroundColor: MockupPalette.lightBlue,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  arrowText: {
    fontFamily: Fonts.rounded,
    fontSize: 20,
    fontWeight: '800',
    color: MockupPalette.navy,
  },
  lockBtn: {
    flex: 1,
    backgroundColor: MockupPalette.navy,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  lockText: {
    fontFamily: Fonts.rounded,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.85,
  },
});
