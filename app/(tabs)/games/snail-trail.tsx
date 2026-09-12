import { StyleSheet, Text, View } from 'react-native';

import { MeterVisualProps, MeterWordGame, WORDS_PER_ROUND } from '@/components/games/meter-word-game';
import { Fonts } from '@/constants/theme';
import { OnboardingPalette } from '@/constants/onboarding-theme';

const WORDS = ['sun', 'star', 'soup', 'sail', 'seed', 'seal', 'song'];
const WORD_EMOJIS = ['☀️', '⭐', '🍲', '⛵', '🌱', '🦭', '🎵'];

function SnailTrailVisual({ wordFillRatios, liveFill, wordIndex, isListening }: MeterVisualProps) {
  const ratios = wordFillRatios.map((r, i) => (i === wordIndex && isListening ? liveFill : r));
  const progress = ratios.reduce((a, b) => a + b, 0) / WORDS_PER_ROUND;
  const rushed = isListening && liveFill < 0.15 && wordFillRatios.slice(0, wordIndex).some((r) => r < 0.3);

  return (
    <View style={styles.sceneContainer}>
      <View style={styles.pathTrack}>
        <View style={[styles.trailFill, { width: `${progress * 100}%` }]} />
        <View style={[styles.snailWrap, { left: `${Math.min(90, progress * 100)}%` }]}>
          <Text style={styles.snailEmoji}>🐌</Text>
          {rushed && <Text style={styles.slowDownText}>Slow down!</Text>}
        </View>
        <Text style={styles.igloo}>🧊</Text>
      </View>
    </View>
  );
}

export default function SnailTrailScreen() {
  return (
    <MeterWordGame
      gameKey="snail-trail"
      categoryKey="slow-speech"
      title="Snail Trail"
      words={WORDS}
      wordEmojis={WORD_EMOJIS}
      hint="Match the snail's slow pace! 🐌"
      micHint="Slow and smooth keeps the snail moving!"
      resultCompleteText="The snail made it to Fin's igloo! 🐌"
      resultPartialText={(score) => `The snail moved ${score} of ${WORDS_PER_ROUND} steps!`}
      formatScore={(goodCount) => `${goodCount} / ${WORDS_PER_ROUND}`}
      renderVisual={(props) => <SnailTrailVisual {...props} />}
    />
  );
}

const styles = StyleSheet.create({
  sceneContainer: {
    flex: 1,
    backgroundColor: OnboardingPalette.speechBubble,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  pathTrack: {
    width: '100%',
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: OnboardingPalette.cardBorder,
    justifyContent: 'center',
  },
  trailFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 6,
    backgroundColor: OnboardingPalette.progressActive,
  },
  snailWrap: {
    position: 'absolute',
    top: -20,
    alignItems: 'center',
  },
  snailEmoji: {
    fontSize: 30,
  },
  slowDownText: {
    fontFamily: Fonts.rounded,
    fontSize: 11,
    fontWeight: '700',
    color: '#E8724A',
    marginTop: 2,
  },
  igloo: {
    position: 'absolute',
    right: -8,
    top: -22,
    fontSize: 28,
  },
});
