import { StyleSheet, Text, View } from 'react-native';

import { MeterVisualProps, MeterWordGame, WORDS_PER_ROUND } from '@/components/games/meter-word-game';
import { OnboardingPalette } from '@/constants/onboarding-theme';

const WORDS = ['ocean', 'over', 'open', 'owl', 'orange', 'old', 'oak'];
const WORD_EMOJIS = ['🌊', '⬆️', '🚪', '🦉', '🍊', '👴', '🌳'];
const WAVE_COLORS = ['#E8394A', '#E85A30', '#E8724A', '#E84A8B', '#B44AC6', '#9B4AE8', '#7C3AED'];

function OceanPullVisual({ wordFillRatios, liveFill, wordIndex, isListening }: MeterVisualProps) {
  const ratio = isListening ? liveFill : wordFillRatios[wordIndex] ?? 0;

  return (
    <View style={styles.sceneContainer}>
      <View style={styles.rippleRow}>
        {wordFillRatios.slice(0, wordIndex).map((r, i) =>
          r > 0.15 ? <View key={i} style={[styles.rippleTrail, { backgroundColor: WAVE_COLORS[i] }]} /> : null
        )}
      </View>
      <View style={styles.waveTrack}>
        <View style={[styles.waveFill, { width: `${ratio * 100}%`, backgroundColor: WAVE_COLORS[wordIndex] }]} />
      </View>
      <Text style={styles.finShore}>🐧</Text>
    </View>
  );
}

export default function OceanPullScreen() {
  return (
    <MeterWordGame
      gameKey="ocean-pull"
      categoryKey="stretchy-speech"
      title="Ocean Pull"
      words={WORDS}
      wordEmojis={WORD_EMOJIS}
      hint="Pull the wave across the ocean! 🌊"
      micHint="Puuull the wave all the way across!"
      resultCompleteText="You pulled 7 perfect waves! 🌊"
      resultPartialText={(score) => `You pulled ${score} of ${WORDS_PER_ROUND} waves!`}
      formatScore={(goodCount) => `${goodCount} / ${WORDS_PER_ROUND}`}
      renderVisual={(props) => <OceanPullVisual {...props} />}
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
    gap: 16,
  },
  rippleRow: {
    flexDirection: 'row',
    gap: 4,
    height: 6,
  },
  rippleTrail: {
    width: 20,
    height: 6,
    borderRadius: 3,
    opacity: 0.4,
  },
  waveTrack: {
    width: '100%',
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: OnboardingPalette.cardBorder,
    overflow: 'hidden',
  },
  waveFill: {
    height: '100%',
    borderRadius: 8,
  },
  finShore: {
    fontSize: 34,
  },
});
