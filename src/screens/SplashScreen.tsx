import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { BlurMask, Canvas, Circle, Points, vec } from '@shopify/react-native-skia';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { FredokaOne_400Regular, useFonts } from '@expo-google-fonts/fredoka-one';

import { FONT, Palette } from '../game/palette';

export type SplashScreenProps = {
  onEnter: () => void;
};

const ART = require('../../assets/castle-day.jpg');
/** Natural size of the artwork, used to map overlays onto image features. */
const ART_W = 1589;
const ART_H = 990;

/** Where things sit in the artwork, in 0-1 image space. */
const ANCHOR = {
  crystals: { x: 0.5, y: 0.66 },
  sign: { x: 0.5, y: 0.27, w: 0.19 },
};

const BUTTON_DELAY = 2600;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const range = (rnd: () => number, min: number, max: number) => min + rnd() * (max - min);

type Flake = { x: number; y: number; vy: number; vx: number; bucket: number };

/** Snow drifting over the artwork, stepped on the UI thread. */
function Snowfall({ W, H, reduced }: { W: number; H: number; reduced: boolean }) {
  const flakes = useSharedValue<Flake[]>([]);

  useEffect(() => {
    const rnd = mulberry32(4242);
    flakes.value = Array.from({ length: 90 }, () => ({
      x: range(rnd, 0, W),
      y: range(rnd, 0, H),
      vy: range(rnd, 26, 78),
      vx: range(rnd, -14, 14),
      bucket: Math.floor(range(rnd, 0, 3)),
    }));
  }, [W, H, flakes]);

  useFrameCallback((info) => {
    'worklet';
    if (reduced) return;
    const dt = Math.min(48, info.timeSincePreviousFrame ?? 16) / 1000;
    const list = flakes.value;
    const out: Flake[] = [];
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      let y = f.y + f.vy * dt;
      let x = f.x + f.vx * dt;
      if (y > H + 8) {
        y = -8;
        x = (i * 97.13) % W;
      }
      if (x < -8) x = W + 8;
      else if (x > W + 8) x = -8;
      out.push({ ...f, x, y });
    }
    flakes.value = out;
  }, !reduced);

  const collect = (bucket: number) => {
    'worklet';
    const out = [];
    const list = flakes.value;
    for (let i = 0; i < list.length; i++) if (list[i].bucket === bucket) out.push(vec(list[i].x, list[i].y));
    return out;
  };
  const small = useDerivedValue(() => collect(0));
  const mid = useDerivedValue(() => collect(1));
  const large = useDerivedValue(() => collect(2));

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Points points={small} mode="points" color="#FFFFFF" style="stroke" strokeWidth={1.8} strokeCap="round" opacity={0.55} />
      <Points points={mid} mode="points" color="#FFFFFF" style="stroke" strokeWidth={3.2} strokeCap="round" opacity={0.75} />
      <Points points={large} mode="points" color="#FFFFFF" style="stroke" strokeWidth={4.6} strokeCap="round" opacity={0.9} />
    </Canvas>
  );
}

function EnterButton({ u, visible, onPress }: { u: number; visible: SharedValue<number>; onPress: () => void }) {
  const press = useSharedValue(1);
  const sweep = useSharedValue(0);

  useEffect(() => {
    sweep.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(sweep);
  }, [sweep]);

  const wrapStyle = useAnimatedStyle(() => ({
    opacity: visible.value,
    transform: [{ scale: press.value }, { translateY: (1 - visible.value) * 14 }],
  }));
  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(sweep.value, [0, 1], [-320 * u, 320 * u]) }, { rotate: '12deg' }],
  }));

  const w = 290 * u;
  const h = 66 * u;

  return (
    <Animated.View style={[styles.enterWrap, wrapStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Enter BraveVoice"
        onPressIn={() => {
          press.value = withSpring(0.96, { damping: 14, stiffness: 260 });
        }}
        onPressOut={() => {
          press.value = withSpring(1, { damping: 14, stiffness: 260 });
        }}
        onPress={onPress}
        style={{
          width: w,
          height: h,
          borderRadius: h / 2,
          borderWidth: 2,
          borderColor: 'rgba(150,215,255,0.9)',
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <BlurView intensity={26} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,30,58,0.62)' }]} />
        <Animated.View style={[{ position: 'absolute', top: -h, width: 48 * u, height: h * 3 }, sweepStyle]}>
          <LinearGradient
            colors={['rgba(150,215,255,0)', 'rgba(225,245,255,0.7)', 'rgba(150,215,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Text style={[styles.buttonText, { fontSize: 22 * u }]}>Enter BraveVoice</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function SplashScreen({ onEnter }: SplashScreenProps) {
  const { width: W, height: H } = useWindowDimensions();
  const u = Math.min(Math.max(Math.min(W, H) / 390, 0.85), 1.75);
  const reduced = !!useReducedMotion();
  const [fontsLoaded] = useFonts({ FredokaOne_400Regular });
  const [ready, setReady] = useState(false);

  const buttonIn = useSharedValue(0);
  const push = useSharedValue(0);
  const glow = useSharedValue(0);
  const shimmer = useSharedValue(-1);

  /**
   * The artwork is drawn cover-style; this is the rectangle it actually occupies
   * so the glow and shimmer land on the right features at any aspect ratio.
   */
  const frame = useMemo(() => {
    const scale = Math.min(W / ART_W, H / ART_H);
    const w = ART_W * scale;
    const h = ART_H * scale;
    return { w, h, left: (W - w) / 2, top: (H - h) / 2 };
  }, [W, H]);

  useEffect(() => {
    if (!fontsLoaded) return;
    if (reduced) {
      setReady(true);
      buttonIn.value = withTiming(1, { duration: 300 });
      return;
    }
    // Slow push out of the gateway, so the shot breathes rather than sits still.
    push.value = withTiming(1, { duration: 11000, easing: Easing.out(Easing.quad) });
    glow.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }), -1, true);
    shimmer.value = withRepeat(
      withSequence(
        withDelay(1200, withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) })),
        withTiming(-1, { duration: 0 }),
      ),
      -1,
      false,
    );
    const timer = setTimeout(() => {
      setReady(true);
      buttonIn.value = withTiming(1, { duration: 800 });
    }, BUTTON_DELAY);
    return () => {
      clearTimeout(timer);
      cancelAnimation(push);
      cancelAnimation(glow);
      cancelAnimation(shimmer);
      cancelAnimation(buttonIn);
    };
  }, [fontsLoaded, reduced, buttonIn, push, glow, shimmer]);

  const artStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(push.value, [0, 1], [1.06, 1.0]) }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + glow.value * 0.4,
    transform: [{ scale: 1 + glow.value * 0.06 }],
  }));
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmer.value * frame.w * ANCHOR.sign.w }, { rotate: '16deg' }],
    opacity: interpolate(Math.abs(shimmer.value), [0, 0.7, 1], [0.85, 0.3, 0]),
  }));

  if (!fontsLoaded) {
    return (
      <View style={[styles.loading, { width: W, height: H }]}>
        <LinearGradient colors={['#0A1628', Palette.facade]} style={StyleSheet.absoluteFill} />
        <View style={styles.loadingRow}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.loadingDot, { opacity: 0.4 + i * 0.2 }]} />
          ))}
        </View>
      </View>
    );
  }

  const crystalX = frame.left + frame.w * ANCHOR.crystals.x;
  const crystalY = frame.top + frame.h * ANCHOR.crystals.y;
  const signX = frame.left + frame.w * ANCHOR.sign.x;
  const signY = frame.top + frame.h * ANCHOR.sign.y;
  const signW = frame.w * ANCHOR.sign.w;
  const glowR = frame.w * 0.13;

  return (
    <View
      style={[styles.root, { width: W, height: H }]}
      accessible
      accessibilityLabel="BraveVoice castle entrance splash screen"
    >
      {/* A blurred cover copy fills any letterbox area, so the whole composition
          can be shown with "contain" and never plain bars. Width and height are
          explicit because resizeMode alone does not size the element on web. */}
      <Image
        source={ART}
        style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, resizeMode: 'cover' }}
        blurRadius={22}
        accessible={false}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(12,32,60,0.4)' }]} pointerEvents="none" />
      <Animated.View style={[StyleSheet.absoluteFill, artStyle]}>
        <Image
          source={ART}
          style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, resizeMode: 'contain' }}
          accessible={false}
        />
      </Animated.View>

      {/* Ice crystals breathe with a soft blue pulse. */}
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', left: crystalX - glowR, top: crystalY - glowR, width: glowR * 2, height: glowR * 2 },
          glowStyle,
        ]}
      >
        <Canvas style={StyleSheet.absoluteFill}>
          <Circle cx={glowR} cy={glowR} r={glowR * 0.55} color={Palette.crystalBlue} opacity={0.5}>
            <BlurMask blur={glowR * 0.5} style="normal" />
          </Circle>
        </Canvas>
      </Animated.View>

      {/* Light sweeps across the BraveVoice sign. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: signX - signW / 2,
          top: signY - frame.h * 0.05,
          width: signW,
          height: frame.h * 0.1,
          overflow: 'hidden',
        }}
      >
        <Animated.View style={[{ position: 'absolute', top: -frame.h * 0.05, width: signW * 0.22, height: frame.h * 0.2 }, shimmerStyle]}>
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.75)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>

      <Snowfall W={W} H={H} reduced={reduced} />

      {/* Just enough shading at the base to seat the button. */}
      <LinearGradient
        colors={['rgba(8,26,52,0)', 'rgba(8,26,52,0.5)']}
        locations={[0.78, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {ready && <EnterButton u={u} visible={buttonIn} onPress={onEnter} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: Palette.facade, overflow: 'hidden' },
  loading: { alignItems: 'center', justifyContent: 'center' },
  loadingRow: { flexDirection: 'row', gap: 10 },
  loadingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Palette.logoGlow },
  enterWrap: { position: 'absolute', bottom: '4.5%', left: 0, right: 0, alignItems: 'center' },
  buttonText: { fontFamily: FONT, color: '#FFFFFF', letterSpacing: 0.5 },
});
