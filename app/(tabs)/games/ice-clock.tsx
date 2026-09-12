import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { MeterVisualProps, MeterWordGame, WORDS_PER_ROUND } from '@/components/games/meter-word-game';
import { OnboardingPalette } from '@/constants/onboarding-theme';

const WORDS = ['clock', 'cold', 'cool', 'cloud', 'climb', 'close', 'clap'];
const WORD_EMOJIS = ['⏰', '🥶', '😎', '☁️', '🧗', '🚪', '👏'];
const MAX_SIZE = 200;
const MIN_SIZE = 70;
const START_SIZE = 140;

function computeClockSize(ratios: number[]) {
  let size = START_SIZE;
  for (const r of ratios) {
    if (r <= 0) continue;
    size += r >= 0.6 ? 12 : -18;
  }
  return Math.max(MIN_SIZE, Math.min(MAX_SIZE, size));
}

function IceClockVisual({ wordFillRatios, liveFill, wordIndex, isListening }: MeterVisualProps) {
  const ratios = wordFillRatios.map((r, i) => (i === wordIndex && isListening ? liveFill : r));
  const size = computeClockSize(ratios);
  const sizeValue = useSharedValue(size);

  useEffect(() => {
    sizeValue.value = withTiming(size, { duration: 350 });
  }, [size, sizeValue]);

  const style = useAnimatedStyle(() => ({
    width: sizeValue.value,
    height: sizeValue.value,
    borderRadius: sizeValue.value / 2,
  }));

  const melting = size < START_SIZE;

  return (
    <View style={styles.sceneContainer}>
      <Animated.View style={[styles.clockCircle, style]}>
        <View style={styles.clockHandHour} />
        <View style={styles.clockHandMinute} />
      </Animated.View>
      {melting && <Text style={styles.drip}>💧</Text>}
      <Text style={styles.finWorried}>{size <= MIN_SIZE + 10 ? '😟' : size >= START_SIZE ? '🎉' : '🐧'}</Text>
    </View>
  );
}

export default function IceClockScreen() {
  return (
    <MeterWordGame
      gameKey="ice-clock"
      categoryKey="slow-speech"
      title="Ice Clock"
      words={WORDS}
      wordEmojis={WORD_EMOJIS}
      hint="Speak slowly to save the clock! ⏰"
      micHint="Speak slowly to keep the clock frozen!"
      resultCompleteText="You saved the ice clock! ⏰"
      resultPartialText={(score) => `You kept ${score} of ${WORDS_PER_ROUND} words slow!`}
      formatScore={(goodCount) => `${goodCount} / ${WORDS_PER_ROUND}`}
      renderVisual={(props) => <IceClockVisual {...props} />}
    />
  );
}

const styles = StyleSheet.create({
  sceneContainer: {
    flex: 1,
    backgroundColor: OnboardingPalette.speechBubble,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockCircle: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 4,
    borderColor: '#C8DFF0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockHandHour: {
    position: 'absolute',
    width: 4,
    height: 30,
    backgroundColor: OnboardingPalette.progressActive,
    borderRadius: 2,
    top: '50%',
    marginTop: -30,
  },
  clockHandMinute: {
    position: 'absolute',
    width: 3,
    height: 44,
    backgroundColor: OnboardingPalette.progressActive,
    borderRadius: 2,
    transform: [{ rotate: '70deg' }],
  },
  drip: {
    position: 'absolute',
    bottom: 40,
    fontSize: 20,
  },
  finWorried: {
    position: 'absolute',
    bottom: 16,
    fontSize: 30,
  },
});
