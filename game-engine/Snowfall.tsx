// Continuous light snow drift behind every 8+ game screen, per the visual design spec. Extracted
// from tic-tac-toe-game.tsx's original local implementation (the only game that had it) so every
// game — via the shared GameScreen shell or a custom build — gets the same ambient motion for
// free instead of re-implementing it.

import { useEffect, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';

export function Snowfall({ count = 16, color = '#FFFFFF' }: { count?: number; color?: string }) {
  const { width, height } = useWindowDimensions();
  const flakes = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * width,
        size: 8 + Math.random() * 10,
        delay: Math.random() * 4000,
        duration: 5000 + Math.random() * 4000,
        drift: (Math.random() - 0.5) * 40,
      })),
    [width, count]
  );
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {flakes.map((f) => (
        <Snowflake key={f.id} {...f} height={height} color={color} />
      ))}
    </View>
  );
}

function Snowflake({
  left,
  size,
  delay,
  duration,
  drift,
  height,
  color,
}: {
  left: number;
  size: number;
  delay: number;
  duration: number;
  drift: number;
  height: number;
  color: string;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false));
  }, [delay, duration, t]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: t.value * (height + 40) - 40 }, { translateX: t.value * drift }],
    opacity: 0.5 + Math.sin(t.value * Math.PI) * 0.3,
  }));
  return <Animated.Text style={[styles.flake, { left, fontSize: size, color }, style]}>❄</Animated.Text>;
}

const styles = StyleSheet.create({
  flake: {
    position: 'absolute',
    textShadowColor: 'rgba(63,134,196,0.4)',
    textShadowRadius: 2,
  },
});
