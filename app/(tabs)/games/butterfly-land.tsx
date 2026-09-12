import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { PulseVisualProps, PulseWordGame, WORDS_PER_ROUND } from '@/components/games/pulse-word-game';

const WORDS = ['butterfly', 'breeze', 'blossom', 'bright', 'blue', 'bow', 'branch'];
const WORD_EMOJIS = ['🦋', '💨', '🌸', '✨', '🔵', '🎀', '🌿'];

function ButterflyLandVisual({ completedIndices }: PulseVisualProps) {
  const completedCount = completedIndices.filter(Boolean).length;
  const progress = completedCount / WORDS.length;
  const x = useSharedValue(80);

  useEffect(() => {
    x.value = withTiming(80 - progress * 78, { duration: 500 });
  }, [progress, x]);

  const style = useAnimatedStyle(() => ({ left: `${x.value}%` }));
  const landed = completedCount >= WORDS.length;

  return (
    <View style={styles.sceneContainer}>
      <View style={styles.petalRow}>
        {Array.from({ length: WORDS.length }, (_, i) => (
          <Text key={i} style={[styles.petal, completedIndices[i] && styles.petalActive]}>🌸</Text>
        ))}
      </View>
      <View style={styles.meadow}>
        <Text style={styles.finWing}>{landed ? '🥰' : '🐧'}</Text>
        <Animated.Text style={[styles.butterfly, style]}>{landed ? '🦋' : progress > 0.5 ? '🦋' : '🦟'}</Animated.Text>
      </View>
    </View>
  );
}

export default function ButterflyLandScreen() {
  return (
    <PulseWordGame
      gameKey="butterfly-land"
      categoryKey="light-contact"
      title="Butterfly Land"
      words={WORDS}
      wordEmojis={WORD_EMOJIS}
      hint="Be super gentle — don't scare the butterfly! 🦋"
      micHint="Gentle voice brings the butterfly closer!"
      resultCompleteText="The butterfly landed on Fin! 🦋"
      resultPartialText={(score) => `The butterfly got ${score} of ${WORDS_PER_ROUND} steps closer!`}
      renderVisual={(props) => <ButterflyLandVisual {...props} />}
    />
  );
}

const styles = StyleSheet.create({
  sceneContainer: {
    flex: 1,
    backgroundColor: '#EAF7EE',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  petalRow: {
    flexDirection: 'row',
    gap: 6,
  },
  petal: {
    fontSize: 16,
    opacity: 0.3,
  },
  petalActive: {
    opacity: 1,
  },
  meadow: {
    width: '90%',
    height: 60,
    position: 'relative',
    justifyContent: 'center',
  },
  finWing: {
    fontSize: 36,
  },
  butterfly: {
    position: 'absolute',
    fontSize: 30,
    top: -6,
  },
});
