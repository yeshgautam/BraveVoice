import { StyleSheet, Text, View } from 'react-native';

import { MeterVisualProps, MeterWordGame, WORDS_PER_ROUND } from '@/components/games/meter-word-game';
import { OnboardingPalette } from '@/constants/onboarding-theme';

const WORDS = ['snow', 'slow', 'slide', 'smooth', 'sleep', 'snail', 'soft'];
const WORD_EMOJIS = ['❄️', '🐢', '🛷', '✨', '😴', '🐌', '🪶'];
const DISTANCE_TARGET = 100;

function distanceMeters(wordFillRatios: number[]) {
  return Math.round((wordFillRatios.reduce((a, b) => a + b, 0) / WORDS_PER_ROUND) * DISTANCE_TARGET);
}

function GlacierGlideVisual({ wordFillRatios, liveFill, wordIndex, isListening }: MeterVisualProps) {
  const ratios = wordFillRatios.map((r, i) => (i === wordIndex && isListening ? liveFill : r));
  const progress = ratios.reduce((a, b) => a + b, 0) / WORDS_PER_ROUND;

  return (
    <View style={styles.sceneContainer}>
      <Text style={styles.mountains}>🏔️ 🏔️ 🏔️</Text>
      <View style={styles.track}>
        <View style={[styles.trackFill, { width: `${progress * 100}%` }]} />
        <View style={[styles.finSled, { left: `${Math.min(92, progress * 100)}%` }]}>
          <Text style={styles.finSledEmoji}>🛷</Text>
        </View>
        <Text style={styles.flag}>🚩</Text>
      </View>
    </View>
  );
}

export default function GlacierGlideScreen() {
  return (
    <MeterWordGame
      gameKey="glacier-glide"
      categoryKey="slow-speech"
      title="Glacier Glide"
      words={WORDS}
      wordEmojis={WORD_EMOJIS}
      hint="Speak slowly — take your time! 🐌"
      micHint="Slow and steady wins the race!"
      resultCompleteText="Fin reached the finish! Great slow speech! 🛷"
      resultPartialText={(score) => `You slid ${score} of ${WORDS_PER_ROUND} words!`}
      formatScore={(_g, _w, ratios) => `${distanceMeters(ratios)}m / ${DISTANCE_TARGET}m`}
      renderVisual={(props) => <GlacierGlideVisual {...props} />}
    />
  );
}

const styles = StyleSheet.create({
  sceneContainer: {
    flex: 1,
    backgroundColor: OnboardingPalette.speechBubble,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  mountains: {
    fontSize: 30,
    marginBottom: 24,
  },
  track: {
    width: '100%',
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: OnboardingPalette.cardBorder,
    position: 'relative',
    justifyContent: 'center',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 7,
    backgroundColor: OnboardingPalette.progressActive,
  },
  finSled: {
    position: 'absolute',
    top: -18,
  },
  finSledEmoji: {
    fontSize: 32,
  },
  flag: {
    position: 'absolute',
    right: -6,
    top: -22,
    fontSize: 26,
  },
});
