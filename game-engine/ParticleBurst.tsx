// Reusable Skia particle effect for celebration payoffs (confetti, sparkles, ice shards —
// pass `colors` to match a game's theme). Driven by `burstKey`: bump it (e.g. GameScreen's
// `resultRevealKey`) each time a success should replay the burst. `burstKey === 0` is
// treated as "nothing has happened yet" and never fires, matching GameStageProps'
// convention where `resultRevealKey` starts at 0 and only increments once a real result
// lands — callers don't need special-case "skip the first render" logic.

import { Canvas, Circle } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Easing, useDerivedValue, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

export type ParticleBurstProps = {
  /** Bump this to (re)play the burst — e.g. a game's `resultRevealKey` on success. */
  burstKey: number;
  size?: number;
  count?: number;
  colors?: string[];
  particleRadius?: number;
  spread?: number;
  durationMs?: number;
};

const DEFAULT_COLORS = ['#FFD166', '#F0B429', '#FFFFFF', '#4DABF7'];

export function ParticleBurst({
  burstKey,
  size = 140,
  count = 14,
  colors = DEFAULT_COLORS,
  particleRadius = 4,
  spread = 60,
  durationMs = 650,
}: ParticleBurstProps) {
  const center = size / 2;

  const particles = useMemo(
    () =>
      Array.from({ length: count }).map((_, i) => ({
        key: i,
        angle: (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5,
        distance: spread * (0.55 + Math.random() * 0.45),
        radius: particleRadius * (0.6 + Math.random() * 0.8),
        color: colors[i % colors.length],
        delay: Math.random() * 60,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count, spread, particleRadius]
  );

  return (
    <Canvas style={[styles.canvas, { width: size, height: size }]} pointerEvents="none">
      {particles.map((particle) => (
        <BurstParticle
          key={particle.key}
          cxBase={center}
          cyBase={center}
          angle={particle.angle}
          distance={particle.distance}
          radius={particle.radius}
          color={particle.color}
          delay={particle.delay}
          durationMs={durationMs}
          burstKey={burstKey}
        />
      ))}
    </Canvas>
  );
}

function BurstParticle({
  cxBase,
  cyBase,
  angle,
  distance,
  radius,
  color,
  delay,
  durationMs,
  burstKey,
}: {
  cxBase: number;
  cyBase: number;
  angle: number;
  distance: number;
  radius: number;
  color: string;
  delay: number;
  durationMs: number;
  burstKey: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (burstKey === 0) return;
    progress.value = 0;
    progress.value = withDelay(delay, withTiming(1, { duration: durationMs, easing: Easing.out(Easing.cubic) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burstKey]);

  const cx = useDerivedValue(() => cxBase + Math.cos(angle) * distance * progress.value);
  const cy = useDerivedValue(() => cyBase + Math.sin(angle) * distance * progress.value - 20 * progress.value);
  const r = useDerivedValue(() => radius * (1 - progress.value * 0.4));
  const opacity = useDerivedValue(() => 1 - progress.value);

  return <Circle cx={cx} cy={cy} r={r} color={color} opacity={opacity} />;
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
  },
});
