import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { MeterVisualProps, MeterWordGame, WORDS_PER_ROUND } from '@/components/games/meter-word-game';
import { OnboardingPalette } from '@/constants/onboarding-theme';

const WORDS = ['ball', 'big', 'blue', 'bear', 'boat', 'bird', 'balloon'];
const WORD_EMOJIS = ['⚽️', '📏', '🔵', '🐻', '⛵', '🐦', '🎈'];
const BALLOON_COLORS = ['#E8394A', '#E85A30', '#E8724A', '#E84A8B', '#B44AC6', '#9B4AE8', '#7C3AED'];

function FloatedBalloon({ color, index }: { color: string; index: number }) {
  return (
    <View style={[styles.floatedBalloon, { backgroundColor: color, left: `${8 + index * 12}%`, bottom: 20 + (index % 3) * 24 }]} />
  );
}

function BalloonBlowVisual({ wordFillRatios, liveFill, wordIndex, isListening }: MeterVisualProps) {
  const ratio = isListening ? liveFill : wordFillRatios[wordIndex] ?? 0;
  const scale = useSharedValue(0.15);

  useEffect(() => {
    scale.value = withTiming(0.15 + ratio * 0.85, { duration: 150 });
  }, [ratio, scale]);

  const balloonStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={styles.sceneContainer}>
      {wordFillRatios.slice(0, wordIndex).map((r, i) => (r > 0.15 ? <FloatedBalloon key={i} color={BALLOON_COLORS[i]} index={i} /> : null))}
      <Animated.View style={[styles.balloon, { backgroundColor: BALLOON_COLORS[wordIndex] }, balloonStyle]}>
        <View style={styles.balloonShine} />
      </Animated.View>
      <View style={styles.balloonString} />
      <Text style={styles.finHolder}>🐧</Text>
    </View>
  );
}

export default function BalloonBlowScreen() {
  return (
    <MeterWordGame
      gameKey="balloon-blow"
      categoryKey="stretchy-speech"
      title="Balloon Blow"
      words={WORDS}
      wordEmojis={WORD_EMOJIS}
      hint="Stretch the word to blow up the balloon! 🎈"
      micHint="Keep stretching!"
      resultCompleteText="All 7 balloons are flying high! 🎈"
      resultPartialText={(score) => `You blew up ${score} of ${WORDS_PER_ROUND} balloons!`}
      formatScore={(goodCount) => `${goodCount} / ${WORDS_PER_ROUND}`}
      renderVisual={(props) => <BalloonBlowVisual {...props} />}
    />
  );
}

const styles = StyleSheet.create({
  sceneContainer: {
    flex: 1,
    backgroundColor: OnboardingPalette.speechBubble,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  balloon: {
    width: 100,
    height: 120,
    borderRadius: 50,
  },
  balloonShine: {
    position: 'absolute',
    top: 16,
    left: 20,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  balloonString: {
    width: 2,
    height: 40,
    backgroundColor: '#7A9AB0',
  },
  finHolder: {
    fontSize: 34,
    marginTop: 4,
  },
  floatedBalloon: {
    position: 'absolute',
    width: 30,
    height: 36,
    borderRadius: 15,
    opacity: 0.5,
  },
});
