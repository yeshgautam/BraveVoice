import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { PulseVisualProps, PulseWordGame, WORDS_PER_ROUND } from '@/components/games/pulse-word-game';

const WORDS = ['bubble', 'beautiful', 'baby', 'butter', 'bright', 'bow', 'big'];
const WORD_EMOJIS = ['🫧', '✨', '👶', '🧈', '🌟', '🎀', '📏'];
const SHIMMER_COLORS = ['#E8394A', '#E85A30', '#E8724A', '#E84A8B', '#B44AC6', '#9B4AE8', '#7C3AED'];

function SoapFilmVisual({ completedIndices, lastCompletedIndex }: PulseVisualProps) {
  const shimmer = useSharedValue(0.6);

  useEffect(() => {
    if (lastCompletedIndex !== null) {
      shimmer.value = withTiming(1, { duration: 150 }, () => {
        shimmer.value = withTiming(0.6, { duration: 500 });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastCompletedIndex]);

  const shimmerStyle = useAnimatedStyle(() => ({ opacity: shimmer.value }));

  return (
    <View style={styles.sceneContainer}>
      <View style={styles.thumbRow}>
        {completedIndices.map((done, i) => (
          <View key={i} style={[styles.thumb, done && { backgroundColor: SHIMMER_COLORS[i] }]} />
        ))}
      </View>
      <View style={styles.frame}>
        <Animated.View style={[styles.film, shimmerStyle]} />
      </View>
      <Text style={styles.finWatching}>🐧🔍</Text>
    </View>
  );
}

export default function SoapFilmScreen() {
  return (
    <PulseWordGame
      gameKey="soap-film"
      categoryKey="light-contact"
      title="Soap Film"
      words={WORDS}
      wordEmojis={WORD_EMOJIS}
      hint="Don't pop the bubble film! 🫧"
      micHint="Speak so softly the film stays whole!"
      resultCompleteText="You kept all 7 soap films whole! 🫧"
      resultPartialText={(score) => `You kept ${score} of ${WORDS_PER_ROUND} films whole!`}
      renderVisual={(props) => <SoapFilmVisual {...props} />}
    />
  );
}

const styles = StyleSheet.create({
  sceneContainer: {
    flex: 1,
    backgroundColor: '#F4F9FC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  thumbRow: {
    flexDirection: 'row',
    gap: 6,
  },
  thumb: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#E3ECF2',
  },
  frame: {
    width: 200,
    height: 150,
    borderWidth: 8,
    borderColor: '#C8DFF0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  film: {
    width: '100%',
    height: '100%',
    backgroundColor: '#D9C8F0',
  },
  finWatching: {
    fontSize: 30,
  },
});
