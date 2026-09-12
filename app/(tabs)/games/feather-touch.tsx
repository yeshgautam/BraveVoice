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

const WORDS = ['pillow', 'paper', 'petal', 'pink', 'pond', 'peace', 'play'];
const WORD_EMOJIS = ['🛏️', '📄', '🌸', '💗', '💧', '☮️', '🎮'];

function FeatherTouchVisual({ completedIndices, lastCompletedIndex }: PulseVisualProps) {
  const sway = useSharedValue(0);
  const sparkle = useSharedValue(0);
  const completedCount = completedIndices.filter(Boolean).length;

  useEffect(() => {
    sway.value = withRepeat(
      withSequence(withTiming(6, { duration: 900, easing: Easing.inOut(Easing.sin) }), withTiming(-6, { duration: 900, easing: Easing.inOut(Easing.sin) })),
      -1,
      true
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (lastCompletedIndex !== null) {
      sparkle.value = withSequence(withTiming(1, { duration: 200 }), withTiming(0, { duration: 700 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastCompletedIndex]);

  const featherStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${sway.value}deg` }] }));
  const sparkleStyle = useAnimatedStyle(() => ({ opacity: sparkle.value }));

  return (
    <View style={styles.sceneContainer}>
      <View style={styles.snowflakeRow}>
        {Array.from({ length: WORDS.length }, (_, i) => (
          <Text key={i} style={[styles.snowflake, completedIndices[i] && styles.snowflakeGold]}>❄️</Text>
        ))}
      </View>
      <View style={styles.featherWrap}>
        <View style={styles.featherString} />
        <Animated.Text style={[styles.sparkleText, sparkleStyle]}>✨</Animated.Text>
        <Animated.Text style={[styles.featherEmoji, featherStyle]}>🪶</Animated.Text>
      </View>
      <Text style={styles.finWatching}>{completedCount >= WORDS.length ? '🥰' : '🐧'}</Text>
    </View>
  );
}

export default function FeatherTouchScreen() {
  return (
    <PulseWordGame
      gameKey="feather-touch"
      categoryKey="light-contact"
      title="Feather Touch"
      words={WORDS}
      wordEmojis={WORD_EMOJIS}
      hint="Touch your lips super gently! 🪶"
      micHint="Be as gentle as possible! 🪶"
      resultCompleteText="You touched as gently as a feather! 🪶"
      resultPartialText={(score) => `You were gentle ${score} of ${WORDS_PER_ROUND} times!`}
      renderVisual={(props) => <FeatherTouchVisual {...props} />}
    />
  );
}

const styles = StyleSheet.create({
  sceneContainer: {
    flex: 1,
    backgroundColor: '#FFF9E8',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  snowflakeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  snowflake: {
    fontSize: 18,
    opacity: 0.3,
  },
  snowflakeGold: {
    opacity: 1,
  },
  featherWrap: {
    alignItems: 'center',
  },
  featherString: {
    width: 2,
    height: 40,
    backgroundColor: '#C8A85A',
  },
  sparkleText: {
    position: 'absolute',
    top: 30,
    fontSize: 20,
  },
  featherEmoji: {
    fontSize: 56,
  },
  finWatching: {
    fontSize: 34,
  },
});
