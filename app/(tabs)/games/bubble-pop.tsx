import { useEffect } from 'react';
import { DimensionValue, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { PulseVisualProps, PulseWordGame, WORDS_PER_ROUND } from '@/components/games/pulse-word-game';

const WORDS = ['butterfly', 'balloon', 'boat', 'bear', 'bird', 'ball', 'bubbles'];
const WORD_EMOJIS = ['🦋', '🎈', '⛵️', '🐻', '🐦', '⚽️', '🫧'];

type Bubble = { color: string; left: DimensionValue; top: number };

const BUBBLES: Bubble[] = [
  { color: '#E8394A', left: '2%', top: 6 },
  { color: '#E85A30', left: '58%', top: 0 },
  { color: '#E8724A', left: '30%', top: 82 },
  { color: '#E84A8B', left: '4%', top: 150 },
  { color: '#B44AC6', left: '62%', top: 130 },
  { color: '#9B4AE8', left: '34%', top: 210 },
  { color: '#7C3AED', left: '8%', top: 260 },
];

const BUBBLE_SIZE = 92;
const CONFETTI_ANGLES = [0, 60, 120, 180, 240, 300];

function ConfettiDot({ deg, progress, color }: { deg: number; progress: SharedValue<number>; color: string }) {
  const style = useAnimatedStyle(() => {
    const rad = (deg * Math.PI) / 180;
    const distance = progress.value * 50;
    return {
      opacity: 1 - progress.value,
      transform: [{ translateX: Math.cos(rad) * distance }, { translateY: Math.sin(rad) * distance }],
    };
  });
  return <Animated.View style={[styles.confettiDot, { backgroundColor: color }, style]} />;
}

function ConfettiBurst({ progress, color }: { progress: SharedValue<number>; color: string }) {
  return (
    <>
      {CONFETTI_ANGLES.map((deg) => (
        <ConfettiDot key={deg} deg={deg} progress={progress} color={color} />
      ))}
    </>
  );
}

function FloatingBubble({
  bubble,
  index,
  popped,
  justPopped,
}: {
  bubble: Bubble;
  index: number;
  popped: boolean;
  justPopped: boolean;
}) {
  const floatY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const confettiProgress = useSharedValue(0);

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 1400 + index * 120, easing: Easing.inOut(Easing.sin) }),
        withTiming(10, { duration: 1400 + index * 120, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (justPopped) {
      scale.value = withSequence(withTiming(1.25, { duration: 160 }), withTiming(0, { duration: 220 }));
      opacity.value = withTiming(0, { duration: 380 });
      confettiProgress.value = 0;
      confettiProgress.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justPopped]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: floatY.value }, { scale: scale.value }],
  }));

  if (popped && !justPopped) return null;

  return (
    <Animated.View
      style={[
        styles.bubble,
        { left: bubble.left, top: bubble.top, borderColor: bubble.color, backgroundColor: bubble.color + '66' },
        animatedStyle,
      ]}>
      <View style={styles.bubbleShine} />
      <ConfettiBurst progress={confettiProgress} color={bubble.color} />
    </Animated.View>
  );
}

function BubblePopVisual({ completedIndices, lastCompletedIndex }: PulseVisualProps) {
  return (
    <View style={styles.gameAreaInner}>
      {BUBBLES.map((bubble, i) => (
        <FloatingBubble
          key={i}
          bubble={bubble}
          index={i}
          popped={completedIndices[i]}
          justPopped={lastCompletedIndex === i}
        />
      ))}
    </View>
  );
}

export default function BubblePopScreen() {
  return (
    <PulseWordGame
      gameKey="bubble-pop"
      categoryKey="easy-onset"
      title="Bubble Pop"
      words={WORDS}
      wordEmojis={WORD_EMOJIS}
      hint="Start with a soft breath 🌬️"
      micHint="Tap to speak!"
      resultCompleteText="You popped all the bubbles!"
      resultPartialText={(score) => `You popped ${score} of ${WORDS_PER_ROUND} bubbles!`}
      renderVisual={(props) => <BubblePopVisual {...props} />}
    />
  );
}

const styles = StyleSheet.create({
  gameAreaInner: {
    flex: 1,
    position: 'relative',
  },
  bubble: {
    position: 'absolute',
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleShine: {
    position: 'absolute',
    top: 12,
    left: 14,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  confettiDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    top: BUBBLE_SIZE / 2 - 4,
    left: BUBBLE_SIZE / 2 - 4,
  },
});
