import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { MeterVisualProps, MeterWordGame, WORDS_PER_ROUND } from '@/components/games/meter-word-game';
import { Fonts } from '@/constants/theme';
import { OnboardingPalette } from '@/constants/onboarding-theme';

const WORDS = ['whale', 'wave', 'water', 'willow', 'warm', 'wide', 'walk'];
const WORD_EMOJIS = ['🐋', '🌊', '💧', '🌳', '☀️', '↔️', '🚶'];
const BAR_COUNT = 11;

function WaveBar({ index, calmRatio }: { index: number; calmRatio: number }) {
  const height = useSharedValue(20);

  useEffect(() => {
    const amplitude = 30 * (1 - calmRatio) + 4;
    const phase = Math.sin(index / 1.4) * amplitude + amplitude + 8;
    height.value = withTiming(phase, { duration: 260 });
  }, [calmRatio, index, height]);

  const style = useAnimatedStyle(() => ({ height: height.value }));

  return <Animated.View style={[styles.waveBar, style]} />;
}

function SmoothWavesVisual({ wordFillRatios, liveFill, wordIndex, isListening }: MeterVisualProps) {
  const calmRatio = isListening ? liveFill : wordFillRatios[Math.max(0, wordIndex - 1)] ?? 0;
  const calmCount = wordFillRatios.filter((r) => r >= 0.6).length;

  return (
    <View style={[styles.sceneContainer, { backgroundColor: calmRatio > 0.6 ? '#D6EDF8' : OnboardingPalette.progressActive }]}>
      <Text style={styles.calmLabel}>Calm: {calmCount} / {WORDS_PER_ROUND}</Text>
      <View style={styles.waveRow}>
        {Array.from({ length: BAR_COUNT }, (_, i) => (
          <WaveBar key={i} index={i} calmRatio={calmRatio} />
        ))}
      </View>
      <Text style={styles.finSurf}>{calmRatio > 0.6 ? '🏄' : '🥶'}</Text>
    </View>
  );
}

export default function SmoothWavesScreen() {
  return (
    <MeterWordGame
      gameKey="smooth-waves"
      categoryKey="slow-speech"
      title="Smooth Waves"
      words={WORDS}
      wordEmojis={WORD_EMOJIS}
      hint="Speak slowly to calm the waves 🌊"
      micHint="Slow speech = smooth waves!"
      resultCompleteText="You kept the ocean calm! 🌊"
      resultPartialText={(score) => `You calmed ${score} of ${WORDS_PER_ROUND} waves!`}
      formatScore={(goodCount) => `Calm: ${goodCount} / ${WORDS_PER_ROUND}`}
      renderVisual={(props) => <SmoothWavesVisual {...props} />}
    />
  );
}

const styles = StyleSheet.create({
  sceneContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  calmLabel: {
    position: 'absolute',
    top: 14,
    right: 16,
    fontFamily: Fonts.rounded,
    fontSize: 13,
    color: '#FFFFFF',
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 90,
  },
  waveBar: {
    width: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  finSurf: {
    fontSize: 32,
    marginTop: 20,
  },
});
