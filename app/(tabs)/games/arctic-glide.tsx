import { StyleSheet, Text, View } from 'react-native';

import { MeterVisualProps, MeterWordGame, WORDS_PER_ROUND } from '@/components/games/meter-word-game';
import { Fonts } from '@/constants/theme';
import { OnboardingPalette } from '@/constants/onboarding-theme';

const WORDS = ['glide', 'grow', 'great', 'green', 'ground', 'grass', 'glow'];
const WORD_EMOJIS = ['🪂', '🌱', '👍', '💚', '🌍', '🌿', '✨'];
const DISTANCE_TARGET = 100;

function distanceMeters(wordFillRatios: number[]) {
  return Math.round((wordFillRatios.reduce((a, b) => a + b, 0) / WORDS_PER_ROUND) * DISTANCE_TARGET);
}

function ArcticGlideVisual({ wordFillRatios, liveFill, wordIndex, isListening }: MeterVisualProps) {
  const ratios = wordFillRatios.map((r, i) => (i === wordIndex && isListening ? liveFill : r));
  const meters = distanceMeters(ratios);
  const progress = Math.min(1, meters / DISTANCE_TARGET);

  return (
    <View style={styles.sceneContainer}>
      <View style={styles.markerRow}>
        {[25, 50, 75, 100].map((m) => (
          <Text key={m} style={styles.markerText}>{m}m</Text>
        ))}
      </View>
      <View style={styles.track}>
        <View style={[styles.trackFill, { width: `${progress * 100}%` }]} />
        <Text style={[styles.boomerang, { left: `${Math.min(90, progress * 100)}%` }]}>🪃</Text>
      </View>
      <Text style={styles.finThrower}>🐧</Text>
    </View>
  );
}

export default function ArcticGlideScreen() {
  return (
    <MeterWordGame
      gameKey="arctic-glide"
      categoryKey="stretchy-speech"
      title="Arctic Glide"
      words={WORDS}
      wordEmojis={WORD_EMOJIS}
      hint="Stretch the sound to throw it far! 🪃"
      micHint="Streeetch to throw it further!"
      resultCompleteText="Fin's boomerang flew so far! 🪃"
      resultPartialText={(score) => `You threw ${score} of ${WORDS_PER_ROUND} great throws!`}
      formatScore={(_g, _w, ratios) => `${distanceMeters(ratios)}m / ${DISTANCE_TARGET}m`}
      renderVisual={(props) => <ArcticGlideVisual {...props} />}
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
    gap: 14,
  },
  markerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  markerText: {
    fontFamily: Fonts.rounded,
    fontSize: 11,
    color: OnboardingPalette.subtitle,
  },
  track: {
    width: '100%',
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: OnboardingPalette.cardBorder,
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
  boomerang: {
    position: 'absolute',
    top: -20,
    fontSize: 26,
  },
  finThrower: {
    fontSize: 34,
  },
});
