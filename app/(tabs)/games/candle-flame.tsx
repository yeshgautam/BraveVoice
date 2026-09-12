import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { PulseVisualProps, PulseWordGame, WORDS_PER_ROUND } from '@/components/games/pulse-word-game';

const WORDS = ['candle', 'cat', 'cave', 'cold', 'coat', 'cup', 'crow'];
const WORD_EMOJIS = ['🕯️', '🐱', '🕳️', '❄️', '🧥', '☕', '🐦‍⬛'];

function CandleFlameVisual({ completedIndices, lastCompletedIndex }: PulseVisualProps) {
  const flicker = useSharedValue(0);
  const heart = useSharedValue(0);
  const completedCount = completedIndices.filter(Boolean).length;

  useEffect(() => {
    flicker.value = withRepeat(
      withSequence(withTiming(1, { duration: 260, easing: Easing.inOut(Easing.sin) }), withTiming(0, { duration: 260, easing: Easing.inOut(Easing.sin) })),
      -1,
      true
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (lastCompletedIndex !== null) {
      heart.value = withSequence(withTiming(1, { duration: 200 }), withTiming(0, { duration: 800 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastCompletedIndex]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: 1 + flicker.value * 0.15 }, { rotate: `${(flicker.value - 0.5) * 8}deg` }],
  }));
  const heartStyle = useAnimatedStyle(() => ({ opacity: heart.value, transform: [{ translateY: -heart.value * 20 }] }));

  return (
    <View style={styles.sceneContainer}>
      <Animated.Text style={[styles.heartEmoji, heartStyle]}>💛</Animated.Text>
      <Animated.View
        style={[styles.flame, completedCount > 0 ? styles.flameGold : styles.flameOrange, flameStyle]}
      />
      <View style={styles.wick} />
      <Text style={styles.finHolder}>🐧🕯️</Text>
    </View>
  );
}

export default function CandleFlameScreen() {
  return (
    <PulseWordGame
      gameKey="candle-flame"
      categoryKey="light-contact"
      title="Candle Flame"
      words={WORDS}
      wordEmojis={WORD_EMOJIS}
      hint="Speak gently — protect the flame! 🕯️"
      micHint="Light and gentle — protect Fin's flame!"
      resultCompleteText="Fin's flame kept glowing! 🕯️"
      resultPartialText={(score) => `The flame glowed ${score} of ${WORDS_PER_ROUND} times!`}
      renderVisual={(props) => <CandleFlameVisual {...props} />}
    />
  );
}

const styles = StyleSheet.create({
  sceneContainer: {
    flex: 1,
    backgroundColor: '#1A2A3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartEmoji: {
    position: 'absolute',
    top: '30%',
    fontSize: 24,
  },
  flame: {
    width: 26,
    height: 40,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  flameOrange: {
    backgroundColor: '#E8724A',
  },
  flameGold: {
    backgroundColor: '#F5C842',
  },
  wick: {
    width: 6,
    height: 60,
    backgroundColor: '#EAF0F5',
    marginTop: -4,
  },
  finHolder: {
    fontSize: 34,
    marginTop: 12,
  },
});
