import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { FredokaOne_400Regular, useFonts } from '@expo-google-fonts/fredoka-one';
import Svg, { Circle as SvgCircle, Polygon } from 'react-native-svg';
import * as THREE from 'three';

import { FONT, Palette } from '../game/palette';
import { CastleScene, applySceneDefaults } from '../world3d/CastleScene';

export type SplashScreenProps = {
  onEnter: () => void;
};

/* Timings, in milliseconds, from the moment the scene mounts. */
const GATE_OPEN_AT = 2300;
const GATE_DURATION = 1800;
const BUTTON_AFTER_OPEN = 800;

/**
 * Slow cinematic push through the gateway: the camera starts outside the gates
 * and drifts in as they swing open, which is what gives the shot its depth.
 */
function SplashCamera({ reduced }: { reduced: boolean }) {
  const { camera } = useThree();
  const start = useRef<number | null>(null);

  useFrame((state) => {
    if (start.current === null) start.current = state.clock.elapsedTime;
    const t = state.clock.elapsedTime - start.current;

    if (reduced) {
      camera.position.set(0, 2.3, 24.8);
      camera.lookAt(0, 4.4, -8);
      return;
    }

    // Ease from just outside the gate to the mouth of the courtyard.
    const p = Math.min(1, t / 11);
    const eased = 1 - Math.pow(1 - p, 3);
    const z = 27.6 - eased * 3.0;
    const y = 2.45 - eased * 0.18;
    const sway = Math.sin(t * 0.18) * 0.3;

    camera.position.set(sway, y, z);
    camera.lookAt(sway * 0.3, 4.2 + eased * 0.35, -8);
  });

  return null;
}

/** The glowing wordmark and owl that sit over the scene. */
function LogoOverlay({ u, reduced }: { u: number; reduced: boolean }) {
  const shimmer = useSharedValue(-1);
  const halo = useSharedValue(1);
  const rise = useSharedValue(0);
  const textW = 260 * u;

  useEffect(() => {
    rise.value = withDelay(400, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
    if (reduced) return;
    shimmer.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 400, easing: Easing.inOut(Easing.quad) }),
        withDelay(2600, withTiming(-1, { duration: 0 })),
      ),
      -1,
      false,
    );
    halo.value = withRepeat(withTiming(1.08, { duration: 2000, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => {
      cancelAnimation(shimmer);
      cancelAnimation(halo);
    };
  }, [shimmer, halo, rise, reduced]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmer.value * textW }, { rotate: '18deg' }],
    opacity: interpolate(Math.abs(shimmer.value), [0, 0.6, 1], [1, 0.6, 0]),
  }));
  const haloStyle = useAnimatedStyle(() => ({ transform: [{ scale: halo.value }], opacity: rise.value * 0.9 }));
  const riseStyle = useAnimatedStyle(() => ({
    opacity: rise.value,
    transform: [{ translateY: (1 - rise.value) * 18 * u }],
  }));

  return (
    <View style={styles.logoWrap} pointerEvents="none">
      <Animated.View style={[styles.halo, { width: 320 * u, height: 320 * u, borderRadius: 160 * u }, haloStyle]}>
        <LinearGradient
          colors={['rgba(0,191,255,0.28)', 'rgba(0,191,255,0.08)', 'rgba(0,191,255,0)']}
          style={{ flex: 1, borderRadius: 160 * u }}
        />
      </Animated.View>

      <Animated.View style={[{ alignItems: 'center' }, riseStyle]}>
        <Svg width={54 * u} height={54 * u} viewBox="0 0 36 36">
          <SvgCircle cx={18} cy={18} r={16} fill="rgba(10,25,50,0.55)" stroke="rgba(140,212,255,0.95)" strokeWidth={2} />
          <SvgCircle cx={18} cy={18} r={11} fill="none" stroke="rgba(140,212,255,0.4)" strokeWidth={1} />
          <SvgCircle cx={12.5} cy={16} r={4.6} fill="#FFFFFF" />
          <SvgCircle cx={23.5} cy={16} r={4.6} fill="#FFFFFF" />
          <SvgCircle cx={12.5} cy={16} r={2.1} fill="#0A1628" />
          <SvgCircle cx={23.5} cy={16} r={2.1} fill="#0A1628" />
          <Polygon points="18,19 15.5,22.5 20.5,22.5" fill="#FFB040" />
          <Polygon points="8,8 11,3 13,9" fill="rgba(140,212,255,0.9)" />
          <Polygon points="28,8 25,3 23,9" fill="rgba(140,212,255,0.9)" />
        </Svg>

        <View style={{ width: textW, height: 62 * u, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <Text style={[styles.logoText, { fontSize: 42 * u, textShadowColor: 'rgba(0,191,255,0.85)', textShadowRadius: 22 }]}>
            BraveVoice
          </Text>
          <Text
            style={[
              styles.logoText,
              { position: 'absolute', fontSize: 42 * u, textShadowColor: 'rgba(255,255,255,0.95)', textShadowRadius: 7 },
            ]}
          >
            BraveVoice
          </Text>
          <Animated.View style={[{ position: 'absolute', top: -20 * u, width: 14 * u, height: 100 * u }, shimmerStyle]}>
            <LinearGradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.95)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
      </Animated.View>
    </View>
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
    transform: [{ translateX: interpolate(sweep.value, [0, 1], [-300 * u, 300 * u]) }, { rotate: '12deg' }],
  }));

  const w = 280 * u;
  const h = 64 * u;

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
          borderColor: 'rgba(140,200,255,0.8)',
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8,22,44,0.72)' }]} />
        <Animated.View style={[{ position: 'absolute', top: -h, width: 46 * u, height: h * 3 }, sweepStyle]}>
          <LinearGradient
            colors={['rgba(120,190,255,0)', 'rgba(210,240,255,0.6)', 'rgba(120,190,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Text style={[styles.buttonText, { fontSize: 21 * u }]}>Enter BraveVoice</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function SplashScreen({ onEnter }: SplashScreenProps) {
  const { width: W, height: H } = useWindowDimensions();
  const u = Math.min(Math.max(Math.min(W, H) / 390, 0.85), 1.75);
  const reducedMotion = !!useReducedMotion();
  const [fontsLoaded] = useFonts({ FredokaOne_400Regular });

  const buttonIn = useSharedValue(0);
  const [ready, setReady] = useState(false);
  const markReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    if (!fontsLoaded) return;
    if (reducedMotion) {
      buttonIn.value = withTiming(1, { duration: 300 });
      setReady(true);
      return;
    }
    const timer = setTimeout(() => {
      setReady(true);
      buttonIn.value = withTiming(1, { duration: 800 });
    }, GATE_OPEN_AT + GATE_DURATION + BUTTON_AFTER_OPEN);
    return () => {
      clearTimeout(timer);
      cancelAnimation(buttonIn);
    };
  }, [fontsLoaded, reducedMotion, buttonIn]);

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

  return (
    <View
      style={[styles.root, { width: W, height: H }]}
      accessible
      accessibilityLabel="BraveVoice castle entrance splash screen"
    >
      <Canvas
        style={StyleSheet.absoluteFill}
        shadows
        gl={{ antialias: true }}
        camera={{ fov: 72, near: 0.1, far: 340, position: [0, 2.45, 27.6] }}
        onCreated={({ gl, scene }) => applySceneDefaults(gl, scene)}
      >
        <SplashCamera reduced={reducedMotion} />
        <CastleScene animateGate={!reducedMotion} showStations={false} snowCount={900} reflectivity={0.6} />
      </Canvas>

      {/* Cold vignette, matching the darkened corners of the reference art. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <LinearGradient
          colors={['rgba(8,24,48,0.34)', 'rgba(8,24,48,0)', 'rgba(8,24,48,0)', 'rgba(8,24,48,0.3)']}
          locations={[0, 0.24, 0.74, 1]}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={['rgba(8,24,48,0.2)', 'rgba(8,24,48,0)', 'rgba(8,24,48,0.2)']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <LogoOverlay u={u} reduced={reducedMotion} />
      {ready && <EnterButton u={u} visible={buttonIn} onPress={onEnter} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: Palette.facade, overflow: 'hidden' },
  loading: { alignItems: 'center', justifyContent: 'center' },
  loadingRow: { flexDirection: 'row', gap: 10 },
  loadingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Palette.logoGlow },
  logoWrap: { position: 'absolute', left: 0, right: 0, top: '7%', alignItems: 'center' },
  halo: { position: 'absolute', top: '-40%' },
  logoText: {
    fontFamily: FONT,
    color: '#FFFFFF',
    letterSpacing: 2,
    textShadowOffset: { width: 0, height: 0 },
  },
  enterWrap: { position: 'absolute', bottom: '9%', alignSelf: 'center', left: 0, right: 0, alignItems: 'center' },
  buttonText: { fontFamily: FONT, color: '#FFFFFF', letterSpacing: 0.5 },
});
