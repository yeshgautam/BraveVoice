// Shared visual foundation for the arctic-themed diorama games: sky/ground/mountains/trees,
// continuous ambient snow, Fin rendered as real character art with whole-body idle-breathing
// and pose transforms, and the small live tension-meter overlay. Every easy-onset game
// renders from this exact same source so the category reads as one cohesive set, not four
// separately-reinvented scenes — this is what actually keeps polish from drifting game to
// game, not just eyeballing "does it look about as good".

import { useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { Canvas, Circle, Group, Image as SkiaImage, LinearGradient, Path, useImage, vec, type SkImage } from '@shopify/react-native-skia';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

export type ArcticScene = {
  width: number;
  height: number;
  groundY: number;
  fin: { x: number; y: number };
  actionPoint: { x: number; y: number };
  focus: { x: number; y: number; radius: number };
};

export function computeArcticScene(
  width: number,
  height: number,
  overrides?: Partial<{
    finFrac: { x: number; y: number };
    actionFrac: { x: number; y: number };
    focusFrac: { x: number; y: number; radius: number };
    groundFrac: number;
  }>
): ArcticScene {
  const groundY = height * (overrides?.groundFrac ?? 0.76);
  const finFrac = overrides?.finFrac ?? { x: 0.24, y: 0.56 };
  const actionFrac = overrides?.actionFrac ?? { x: 0.36, y: 0.52 };
  const focusFrac = overrides?.focusFrac ?? { x: 0.83, y: 0.46, radius: 0.11 };
  return {
    width,
    height,
    groundY,
    fin: { x: width * finFrac.x, y: height * finFrac.y },
    actionPoint: { x: width * actionFrac.x, y: height * actionFrac.y },
    focus: { x: width * focusFrac.x, y: height * focusFrac.y, radius: Math.min(width * focusFrac.radius, 60) },
  };
}

/** Measures the play-area and returns a live-updating ArcticScene once layout is known. */
export function useArcticSceneLayout(overrides?: Parameters<typeof computeArcticScene>[2]) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setLayout({ width, height });
  };
  const scene = useMemo(() => computeArcticScene(layout.width, layout.height, overrides), [layout.width, layout.height]);
  return { scene, onLayout, ready: layout.width > 0 };
}

/** Continuous idle chest rise/fall — always running, independent of gameplay state. */
export function useIdleBreathing() {
  const breathe = useSharedValue(0);
  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1600, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return breathe;
}

export function useFinImage() {
  return useImage(require('@/assets/images/fin-character.png'));
}

// ---------------------------------------------------------------------------------------
// Background: sky, ground, mountains, trees — flat, cohesive with Fin's cartoon style.
// ---------------------------------------------------------------------------------------

export function SkyAndGround({ scene, skyColors = ['#16283F', '#3E6E93', '#8FC1DE'] }: { scene: ArcticScene; skyColors?: string[] }) {
  return (
    <>
      <Group>
        <Path path={`M0,0 L${scene.width},0 L${scene.width},${scene.groundY} L0,${scene.groundY} Z`}>
          <LinearGradient start={vec(0, 0)} end={vec(0, scene.groundY)} colors={skyColors} />
        </Path>
        <Path path={`M0,${scene.groundY} L${scene.width},${scene.groundY} L${scene.width},${scene.height} L0,${scene.height} Z`}>
          <LinearGradient start={vec(0, scene.groundY)} end={vec(0, scene.height)} colors={['#E7F3FB', '#C7E2F2']} />
        </Path>
      </Group>
      <Path path={`M0,${scene.groundY} L${scene.width},${scene.groundY}`} color="#B8D9EC" style="stroke" strokeWidth={2} />
    </>
  );
}

// ---------------------------------------------------------------------------------------
// Aurora — continuous, low-opacity flowing ribbons behind the mountains. Always running,
// independent of gameplay state, same as the snow.
// ---------------------------------------------------------------------------------------

const AURORA_BANDS = [
  { yFrac: 0.07, amp: 18, color: '#7CF7C9', opacity: 0.16, speed: 1 },
  { yFrac: 0.13, amp: 24, color: '#6FE3D9', opacity: 0.12, speed: 0.7 },
  { yFrac: 0.03, amp: 14, color: '#B6F7E0', opacity: 0.1, speed: 1.3 },
];

export function Aurora({ scene }: { scene: ArcticScene }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 9000, easing: Easing.linear }), -1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!scene.width) return null;
  return (
    <>
      {AURORA_BANDS.map((band, i) => (
        <AuroraBand key={i} scene={scene} t={t} {...band} />
      ))}
    </>
  );
}

function AuroraBand({
  scene,
  t,
  yFrac,
  amp,
  color,
  opacity,
  speed,
}: {
  scene: ArcticScene;
  t: SharedValue<number>;
  yFrac: number;
  amp: number;
  color: string;
  opacity: number;
  speed: number;
}) {
  const path = useDerivedValue(() => {
    const baseY = scene.height * yFrac;
    const phase = t.value * Math.PI * 2 * speed;
    const steps = 6;
    let top = '';
    for (let i = 0; i <= steps; i++) {
      const x = (scene.width / steps) * i;
      const y = baseY + Math.sin(phase + i * 0.9) * amp;
      top += i === 0 ? `M${x},${y}` : ` L${x},${y}`;
    }
    let bottom = '';
    for (let i = steps; i >= 0; i--) {
      const x = (scene.width / steps) * i;
      const y = baseY + 26 + Math.sin(phase + i * 0.9 + 0.4) * amp * 0.8;
      bottom += ` L${x},${y}`;
    }
    return `${top}${bottom} Z`;
  });

  return <Path path={path} color={color} opacity={opacity} />;
}

export function Mountains({ scene }: { scene: ArcticScene }) {
  const w = scene.width;
  const baseY = scene.groundY + 6;
  const peaks = [
    { path: `M${w * -0.05},${baseY} L${w * 0.18},${baseY - scene.height * 0.26} L${w * 0.42},${baseY} Z`, opacity: 0.28 },
    { path: `M${w * 0.28},${baseY} L${w * 0.52},${baseY - scene.height * 0.32} L${w * 0.78},${baseY} Z`, opacity: 0.22 },
    { path: `M${w * 0.58},${baseY} L${w * 0.85},${baseY - scene.height * 0.22} L${w * 1.05},${baseY} Z`, opacity: 0.18 },
  ];
  return (
    <>
      {peaks.map((p, i) => (
        <Path key={i} path={p.path} color="#EAF3FA" opacity={p.opacity} />
      ))}
    </>
  );
}

export function Trees({ scene }: { scene: ArcticScene }) {
  const positions = [scene.width * 0.06, scene.width * 0.95, scene.width * 0.68];
  return (
    <>
      {positions.map((x, i) => (
        <PineTree key={i} x={x} baseY={scene.groundY + 2} scale={0.75 + (i % 2) * 0.25} />
      ))}
    </>
  );
}

function PineTree({ x, baseY, scale }: { x: number; baseY: number; scale: number }) {
  const h = 70 * scale;
  const w = 34 * scale;
  const trunk = 10 * scale;
  return (
    <Group>
      <Path path={`M${x - 4 * scale},${baseY} L${x + 4 * scale},${baseY} L${x + 4 * scale},${baseY - trunk} L${x - 4 * scale},${baseY - trunk} Z`} color="#7C5A3C" />
      <Path path={`M${x},${baseY - h - trunk} L${x + w / 2},${baseY - trunk - h * 0.42} L${x - w / 2},${baseY - trunk - h * 0.42} Z`} color="#2F6B4F" />
      <Path path={`M${x},${baseY - h * 0.55 - trunk} L${x + w * 0.42},${baseY - trunk} L${x - w * 0.42},${baseY - trunk} Z`} color="#245939" />
    </Group>
  );
}

// ---------------------------------------------------------------------------------------
// Ambient snow — continuous, low-opacity, entirely independent of gameplay state.
// ---------------------------------------------------------------------------------------

const SNOW_COUNT = 22;

export function SnowLayer({ scene }: { scene: ArcticScene }) {
  const particles = useMemo(
    () =>
      Array.from({ length: SNOW_COUNT }).map((_, i) => ({
        id: i,
        startX: Math.random() * (scene.width || 320),
        radius: 1.4 + Math.random() * 2.2,
        durationMs: 5200 + Math.random() * 4200,
        delayMs: Math.random() * 4000,
        drift: 18 + Math.random() * 26,
        opacity: 0.35 + Math.random() * 0.35,
      })),
    [scene.width]
  );
  if (!scene.width) return null;
  return (
    <>
      {particles.map((p) => (
        <SnowFlake key={p.id} {...p} height={scene.height} />
      ))}
    </>
  );
}

function SnowFlake({
  startX,
  radius,
  durationMs,
  delayMs,
  drift,
  opacity,
  height,
}: {
  startX: number;
  radius: number;
  durationMs: number;
  delayMs: number;
  drift: number;
  opacity: number;
  height: number;
}) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withDelay(delayMs, withRepeat(withTiming(1, { duration: durationMs, easing: Easing.linear }), -1, false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cy = useDerivedValue(() => -20 + t.value * (height + 40));
  const cx = useDerivedValue(() => startX + Math.sin(t.value * Math.PI * 2) * drift);

  return <Circle cx={cx} cy={cy} r={radius} color="#FFFFFF" opacity={opacity} />;
}

// ---------------------------------------------------------------------------------------
// Fin — real character art, whole-body transforms (no separate limb layers to animate).
// `focusAmount` is the generic "how deep into the action" value (bow pull, cue pull,
// putter backswing, throttle) that adds a small forward lean while active.
// ---------------------------------------------------------------------------------------

export function FinCharacter({
  scene,
  image,
  breathe,
  anticipation,
  focusAmount,
  finBounce,
  finTilt,
  leanSign = -1,
}: {
  scene: ArcticScene;
  image: SkImage | null;
  breathe: SharedValue<number>;
  anticipation: SharedValue<number>;
  focusAmount: SharedValue<number>;
  finBounce: SharedValue<number>;
  finTilt: SharedValue<number>;
  /** Which way Fin leans while focused — -1 leans back (drawing something toward self), 1 leans in (pressing/pushing). */
  leanSign?: number;
}) {
  const width = 150;
  const height = 158;

  const transform = useDerivedValue(() => {
    const breathScale = 1 + breathe.value * 0.025 * (1 - anticipation.value * 0.6);
    const focusLean = leanSign * (anticipation.value * 4 + focusAmount.value * 5);
    return [{ translateY: finBounce.value }, { rotate: (focusLean + finTilt.value) * (Math.PI / 180) }, { scale: breathScale }];
  });

  if (!image) return null;

  return (
    <Group transform={transform} origin={vec(scene.fin.x, scene.fin.y)}>
      <SkiaImage image={image} x={scene.fin.x - width / 2} y={scene.fin.y - height * 0.72} width={width} height={height} fit="contain" />
    </Group>
  );
}

// ---------------------------------------------------------------------------------------
// Tension meter — small live readout of the action amount + jerkiness, shown while active.
// ---------------------------------------------------------------------------------------

const METER_TICKS = [0.25, 0.5, 0.75];

export function TensionMeter({ amount, jerk, scene }: { amount: SharedValue<number>; jerk: SharedValue<number>; scene: ArcticScene }) {
  const fillStyle = useAnimatedStyle(() => ({
    height: `${Math.round(amount.value * 100)}%`,
    backgroundColor: jerk.value > 0.5 ? '#FF6B6B' : jerk.value > 0.2 ? '#F0B429' : '#69DB7C',
  }));

  return (
    <View style={[styles.meterPanel, { top: scene.height * 0.12 }]} pointerEvents="none">
      <View style={styles.meterTrack}>
        {METER_TICKS.map((frac) => (
          <View key={frac} style={[styles.meterTick, { bottom: `${frac * 100}%` }]} />
        ))}
        <Animated.View style={[styles.meterFill, fillStyle]} />
      </View>
    </View>
  );
}

export const styles = StyleSheet.create({
  burstOverlay: {
    position: 'absolute',
    width: 140,
    height: 140,
  },
  meterPanel: {
    position: 'absolute',
    right: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(20,50,80,0.38)',
    borderWidth: 1.5,
    borderColor: 'rgba(180,230,255,0.6)',
    borderRadius: 10,
    padding: 4,
    shadowColor: '#8FD9F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  meterTrack: {
    width: 10,
    height: 90,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  meterTick: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  meterFill: {
    width: '100%',
    borderRadius: 5,
  },
});
