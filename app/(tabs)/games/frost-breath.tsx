import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { PulseVisualProps, PulseWordGame, WORDS_PER_ROUND } from '@/components/games/pulse-word-game';
import { OnboardingPalette } from '@/constants/onboarding-theme';

const WORDS = ['feather', 'fish', 'flower', 'fox', 'fan', 'frog', 'fire'];
const WORD_EMOJIS = ['🪶', '🐟', '🌸', '🦊', '🪭', '🐸', '🔥'];

function FrostPane({ frosted }: { frosted: boolean }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(frosted ? 1 : 0, { duration: 500 });
  }, [frosted, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={styles.pane}>
      <Animated.View style={[styles.paneFrost, animatedStyle]}>
        <View style={styles.frostSparkleA} />
        <View style={styles.frostSparkleB} />
        <View style={styles.frostSparkleC} />
      </Animated.View>
    </View>
  );
}

function FrostBreathVisual({ completedIndices }: PulseVisualProps) {
  const topRow = [0, 1, 2];
  const midRow = [3, 4, 5];
  const bottomRow = [6];

  return (
    <View style={styles.sceneContainer}>
      <View style={styles.windowFrame}>
        <View style={styles.paneRow}>
          {topRow.map((i) => (
            <FrostPane key={i} frosted={completedIndices[i]} />
          ))}
        </View>
        <View style={styles.paneRow}>
          {midRow.map((i) => (
            <FrostPane key={i} frosted={completedIndices[i]} />
          ))}
        </View>
        <View style={styles.paneRowCenter}>
          {bottomRow.map((i) => (
            <FrostPane key={i} frosted={completedIndices[i]} />
          ))}
        </View>
      </View>
      <Image source={require('@/assets/images/fin-avatar.png')} style={styles.finCorner} contentFit="contain" />
    </View>
  );
}

export default function FrostBreathScreen() {
  return (
    <PulseWordGame
      gameKey="frost-breath"
      categoryKey="easy-onset"
      title="Frost Breath"
      words={WORDS}
      wordEmojis={WORD_EMOJIS}
      hint="Breathe out before you speak ❄️"
      micHint="Breathe first, then speak!"
      resultCompleteText="You frosted the whole window! ❄️"
      resultPartialText={(score) => `You frosted ${score} of ${WORDS_PER_ROUND} panes!`}
      renderVisual={(props) => <FrostBreathVisual {...props} />}
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
  windowFrame: {
    backgroundColor: '#FFFFFF',
    borderWidth: 8,
    borderColor: '#C8DFF0',
    borderRadius: 16,
    padding: 10,
    gap: 8,
  },
  paneRow: {
    flexDirection: 'row',
    gap: 8,
  },
  paneRowCenter: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  pane: {
    width: 78,
    height: 68,
    backgroundColor: '#EAF5FC',
    borderWidth: 2,
    borderColor: '#C8DFF0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  paneFrost: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  frostSparkleA: {
    position: 'absolute',
    top: 10,
    left: 12,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#D6EDF8',
  },
  frostSparkleB: {
    position: 'absolute',
    bottom: 10,
    right: 14,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#D6EDF8',
  },
  frostSparkleC: {
    position: 'absolute',
    top: 26,
    right: 24,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#C8DFF0',
  },
  finCorner: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    width: 56,
    height: 56,
  },
});
