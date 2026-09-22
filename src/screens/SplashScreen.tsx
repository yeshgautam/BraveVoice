import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedReaction,
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
import {
  BlurMask,
  FillType,
  Paint,
  Blur,
  Canvas,
  Circle,
  Group,
  LinearGradient as SkLinearGradient,
  Oval,
  Path as SkPath,
  Points,
  RadialGradient as SkRadialGradient,
  Rect as SkRect,
  RoundedRect,
  Skia,
  vec,
  type SkPath as SkPathType,
} from '@shopify/react-native-skia';
import Svg, {
  Circle as SvgCircle,
  Defs,
  Ellipse,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  Polygon,
  RadialGradient as SvgRadialGradient,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { FredokaOne_400Regular, useFonts } from '@expo-google-fonts/fredoka-one';

/* ------------------------------------------------------------------ */
/* Palette                                                             */
/* ------------------------------------------------------------------ */

const C = {
  skyTop: '#87CEEB',
  skyHorizon: '#B8D9F0',
  woodDark: '#2C1A0A',
  woodMid: '#4A2E10',
  woodHighlight: '#6B4220',
  facade: '#0F1F35',
  glass: 'rgba(200,230,255,0.2)',
  interiorGlow: '#FFE8C0',
  banner: '#1A3A7A',
  bannerBorder: '#2E5BB5',
  logoGlow: '#00BFFF',
  crystalBlue: '#00BFFF',
  crystalCore: '#7DF9FF',
  marbleBase: '#B8C8D8',
  marbleTint: '#A0B8CC',
  compass: '#4A7AB5',
  snow: '#F0F8FF',
  pineDark: '#1E3D28',
  pineMid: '#2D5A3D',
  pineDeep: '#162E1E',
  mountainGrey: '#8899AA',
  mountainSnow: '#EEF4FA',
  lanternGold: '#FFD080',
  haze: 'rgba(100,160,220,0.15)',
  frame: '#1A0E07',
  trunk: '#4A2E1A',
} as const;

const FONT = 'FredokaOne_400Regular';

/* ------------------------------------------------------------------ */
/* Deterministic random so wood grain / veins / branches never jitter */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Timing                                                              */
/* ------------------------------------------------------------------ */

const MOUNT_DELAY = 500;
const GATE_DELAY = 1800;
const GATE_DURATION = 1800;
const GATE_ANGLE = 78;
const SHAKE_AT = 200;
const BUTTON_AFTER_OPEN = 800;
const GATE_EASING = Easing.bezier(0.25, 0.1, 0.25, 1.0);

/* ------------------------------------------------------------------ */
/* Shared types                                                        */
/* ------------------------------------------------------------------ */

type Dims = { W: number; H: number; u: number };

export type SplashScreenProps = {
  onEnter: () => void;
};

/* ================================================================== */
/* LAYER 1 + 2 + 3 — Sky, clouds, mountains, back pine row (Skia)     */
/* ================================================================== */

function buildMountain(points: Array<[number, number]>): SkPathType {
  const p = Skia.Path.Make();
  points.forEach(([x, y], i) => (i === 0 ? p.moveTo(x, y) : p.lineTo(x, y)));
  p.close();
  return p;
}

function snowCapPath(peak: [number, number], left: [number, number], right: [number, number], depth: number) {
  const p = Skia.Path.Make();
  const lx = peak[0] + (left[0] - peak[0]) * depth;
  const ly = peak[1] + (left[1] - peak[1]) * depth;
  const rx = peak[0] + (right[0] - peak[0]) * depth;
  const ry = peak[1] + (right[1] - peak[1]) * depth;
  p.moveTo(peak[0], peak[1]);
  p.lineTo(rx, ry);
  p.lineTo(rx - (rx - lx) * 0.2, ry + 6);
  p.lineTo(lx + (rx - lx) * 0.3, ly - 4);
  p.lineTo(lx, ly);
  p.close();
  return p;
}

function PineTreeSkia({
  x,
  baseY,
  height,
  seed,
  withShadow,
}: {
  x: number;
  baseY: number;
  height: number;
  seed: number;
  withShadow: boolean;
}) {
  const scale = height / 180;
  const geo = useMemo(() => {
    const rnd = mulberry32(seed);
    const trunkH = 20 * scale;
    const trunkW = 8 * scale;
    const tiers = [
      { base: 68 * scale, h: 62 * scale, color: C.pineDeep, offset: 0, snow: 1.0 },
      { base: 52 * scale, h: 56 * scale, color: C.pineMid, offset: 16 * scale, snow: 0.8 },
      { base: 36 * scale, h: 50 * scale, color: C.pineDark, offset: 18 * scale, snow: 0.7 },
    ];
    let bottom = baseY - trunkH;
    const out: Array<{ tri: SkPathType; snow: SkPathType; color: string }> = [];
    tiers.forEach((t) => {
      const top = bottom - t.h;
      const tri = Skia.Path.Make();
      tri.moveTo(x, top);
      tri.lineTo(x + t.base / 2, bottom);
      tri.lineTo(x - t.base / 2, bottom);
      tri.close();
      const snow = Skia.Path.Make();
      const half = t.base / 2;
      const cover = t.snow;
      const sy = top + t.h * (1 - cover) * 0.35;
      snow.moveTo(x, top - 1);
      let px = x;
      let py = top;
      const steps = 4;
      for (let i = 1; i <= steps; i++) {
        const nx = x + (half * cover * i) / steps;
        const ny = top + (t.h * cover * i) / steps;
        snow.cubicTo(px + range(rnd, 2, 5), py + range(rnd, 1, 4), nx - 3, ny + range(rnd, 3, 7), nx, ny + range(rnd, 2, 6));
        px = nx;
        py = ny;
      }
      snow.lineTo(x + half * cover - 2, sy + t.h * cover);
      snow.lineTo(x - half * cover + 2, sy + t.h * cover);
      px = x - half * cover;
      py = top + t.h * cover;
      for (let i = steps - 1; i >= 0; i--) {
        const nx = x - (half * cover * i) / steps;
        const ny = top + (t.h * cover * i) / steps;
        snow.cubicTo(px - range(rnd, 2, 5), py + range(rnd, 1, 4), nx + 3, ny + range(rnd, 3, 7), nx, ny + range(rnd, 2, 6));
        px = nx;
        py = ny;
      }
      snow.close();
      out.push({ tri, snow, color: t.color });
      bottom = top + t.offset;
    });
    return { trunkH, trunkW, out };
  }, [x, baseY, height, seed, scale]);

  return (
    <Group>
      {withShadow && (
        <Oval x={x - 34 * scale} y={baseY - 7 * scale} width={68 * scale} height={14 * scale} color="rgba(10,20,40,0.3)">
          <BlurMask blur={6} style="normal" />
        </Oval>
      )}
      <SkRect x={x - geo.trunkW / 2} y={baseY - geo.trunkH} width={geo.trunkW} height={geo.trunkH} color={C.trunk} />
      {geo.out.map((t, i) => (
        <Group key={i}>
          <SkPath path={t.tri} color={t.color} />
          <SkPath path={t.snow} color={C.snow} />
        </Group>
      ))}
    </Group>
  );
}

function BackgroundCanvas({ W, H, u }: Dims) {
  const cloudX = useSharedValue(0);
  useEffect(() => {
    cloudX.value = withRepeat(withTiming(W * 0.35, { duration: 30000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(cloudX);
  }, [W, cloudX]);
  const cloudTransform = useDerivedValue(() => [{ translateX: cloudX.value }]);
  const cloudTransformBack = useDerivedValue(() => [{ translateX: cloudX.value - W * 0.35 }]);

  const mountains = useMemo(() => {
    const groundY = H * 0.5;
    const left: Array<[number, number]> = [
      [W * 0.05, groundY],
      [W * 0.09, H * 0.38],
      [W * 0.13, H * 0.31],
      [W * 0.17, H * 0.33],
      [W * 0.21, H * 0.25],
      [W * 0.25, H * 0.3],
      [W * 0.29, H * 0.28],
      [W * 0.35, groundY],
    ];
    const mid: Array<[number, number]> = [
      [W * 0.25, groundY],
      [W * 0.33, H * 0.3],
      [W * 0.4, H * 0.24],
      [W * 0.45, H * 0.26],
      [W * 0.5, H * 0.18],
      [W * 0.56, H * 0.25],
      [W * 0.62, H * 0.22],
      [W * 0.68, H * 0.29],
      [W * 0.75, groundY],
    ];
    const right: Array<[number, number]> = [
      [W * 0.62, groundY],
      [W * 0.7, H * 0.32],
      [W * 0.76, H * 0.27],
      [W * 0.82, H * 0.22],
      [W * 0.88, H * 0.29],
      [W * 0.94, H * 0.31],
      [W * 1.02, groundY],
    ];
    const rnd = mulberry32(7);
    const texture = Skia.Path.Make();
    const addTexture = (pts: Array<[number, number]>) => {
      const xs = pts.map((p) => p[0]);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      for (let x = minX + 6; x < maxX; x += range(rnd, 7, 12)) {
        let topY = groundY;
        for (let i = 0; i < pts.length - 1; i++) {
          const [x1, y1] = pts[i];
          const [x2, y2] = pts[i + 1];
          if (x >= Math.min(x1, x2) && x <= Math.max(x1, x2) && x1 !== x2) {
            const y = y1 + ((x - x1) * (y2 - y1)) / (x2 - x1);
            topY = Math.min(topY, y);
          }
        }
        const start = topY + (groundY - topY) * range(rnd, 0.32, 0.5);
        texture.moveTo(x, start);
        texture.lineTo(x + range(rnd, -2, 2), groundY - range(rnd, 0, 8));
      }
    };
    addTexture(left);
    addTexture(mid);
    addTexture(right);
    return {
      left: buildMountain(left),
      mid: buildMountain(mid),
      right: buildMountain(right),
      capLeft: snowCapPath([W * 0.21, H * 0.25], [W * 0.13, H * 0.31], [W * 0.29, H * 0.28], 0.3 * 2.2),
      capMid: snowCapPath([W * 0.5, H * 0.18], [W * 0.4, H * 0.24], [W * 0.62, H * 0.22], 0.3 * 2.2),
      capRight: snowCapPath([W * 0.82, H * 0.22], [W * 0.76, H * 0.27], [W * 0.88, H * 0.29], 0.3 * 2.2),
      texture,
    };
  }, [W, H]);

  const clouds = useMemo(() => {
    const rnd = mulberry32(21);
    const defs = [
      { x: W * 0.12, y: H * 0.11, s: 1.0 },
      { x: W * 0.55, y: H * 0.07, s: 1.25 },
      { x: W * 0.85, y: H * 0.14, s: 0.9 },
    ];
    return defs.map((d) => {
      const blobs: Array<{ x: number; y: number; w: number; h: number }> = [];
      const count = 5;
      for (let i = 0; i < count; i++) {
        const w = range(rnd, 44, 80) * d.s * u;
        const h = range(rnd, 22, 34) * d.s * u;
        blobs.push({ x: d.x + (i - count / 2) * 22 * d.s * u, y: d.y - (i % 2) * 9 * d.s * u, w, h });
      }
      return blobs;
    });
  }, [W, H, u]);

  const backTrees = useMemo(() => {
    const baseY = H * 0.47;
    return [
      { x: W * 0.28, h: 180 * 0.7 * u, seed: 101 },
      { x: W * 0.36, h: 220 * 0.7 * u, seed: 102 },
      { x: W * 0.64, h: 220 * 0.7 * u, seed: 103 },
      { x: W * 0.72, h: 180 * 0.7 * u, seed: 104 },
    ].map((t) => ({ ...t, baseY }));
  }, [W, H, u]);

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Group layer={<Paint><Blur blur={1.5} /></Paint>}>
        <SkRect x={0} y={0} width={W} height={H}>
          <SkLinearGradient start={vec(0, 0)} end={vec(0, H * 0.6)} colors={[C.skyTop, C.skyHorizon]} />
        </SkRect>
        <SkRect x={0} y={H * 0.6} width={W} height={H * 0.4} color={C.skyHorizon} />
        <Group layer={<Paint><Blur blur={8} /></Paint>}>
          <Group transform={cloudTransform}>
            {clouds.map((cloud, ci) =>
              cloud.map((b, bi) => (
                <Oval key={`c${ci}-${bi}`} x={b.x - b.w / 2} y={b.y - b.h / 2} width={b.w} height={b.h} color="rgba(255,255,255,0.92)" />
              )),
            )}
          </Group>
          <Group transform={cloudTransformBack}>
            {clouds.map((cloud, ci) =>
              cloud.map((b, bi) => (
                <Oval key={`d${ci}-${bi}`} x={b.x - b.w / 2} y={b.y - b.h / 2} width={b.w} height={b.h} color="rgba(255,255,255,0.92)" />
              )),
            )}
          </Group>
        </Group>
      </Group>
      <Group layer={<Paint><Blur blur={1.5} /></Paint>}>
        <SkPath path={mountains.left} color={C.mountainGrey} />
        <SkPath path={mountains.right} color={C.mountainGrey} />
        <SkPath path={mountains.mid} color={C.mountainGrey} />
        <SkPath path={mountains.texture} color="rgba(96,110,126,0.45)" style="stroke" strokeWidth={1} />
        <SkPath path={mountains.capLeft} color={C.mountainSnow} />
        <SkPath path={mountains.capRight} color={C.mountainSnow} />
        <SkPath path={mountains.capMid} color={C.mountainSnow} />
        <SkRect x={0} y={H * 0.42} width={W} height={H * 0.1}>
          <SkLinearGradient start={vec(0, H * 0.42)} end={vec(0, H * 0.52)} colors={['rgba(238,244,250,0)', 'rgba(238,244,250,0.85)']} />
        </SkRect>
      </Group>
      <Group layer={<Paint><Blur blur={0.8} /></Paint>} opacity={0.6}>
        {backTrees.map((t) => (
          <PineTreeSkia key={t.seed} x={t.x} baseY={t.baseY} height={t.h} seed={t.seed} withShadow={false} />
        ))}
      </Group>
    </Canvas>
  );
}

/* ================================================================== */
/* LAYER 7 — Front pine trees (Skia, sharp)                            */
/* ================================================================== */

function FrontTreesCanvas({ W, H, u }: Dims) {
  const trees = useMemo(() => {
    const baseY = H * 0.62;
    const left = [
      { x: W * 0.08, h: 180 * u, seed: 201, baseY: baseY + 10 * u },
      { x: W * 0.16, h: 220 * u, seed: 202, baseY: baseY - 4 * u },
      { x: W * 0.22, h: 160 * u, seed: 203, baseY: baseY - 22 * u },
    ];
    const right = [
      { x: W * 0.78, h: 160 * u, seed: 204, baseY: baseY - 22 * u },
      { x: W * 0.84, h: 220 * u, seed: 205, baseY: baseY - 4 * u },
      { x: W * 0.92, h: 180 * u, seed: 206, baseY: baseY + 10 * u },
    ];
    return [...left, ...right].sort((a, b) => a.baseY - b.baseY);
  }, [W, H, u]);
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {trees.map((t) => (
        <PineTreeSkia key={t.seed} x={t.x} baseY={t.baseY} height={t.h} seed={t.seed} withShadow />
      ))}
    </Canvas>
  );
}

/* ================================================================== */
/* Icicles (SVG)                                                       */
/* ================================================================== */

function IcicleRow({
  width,
  count,
  minLen,
  maxLen,
  seed,
  idPrefix,
}: {
  width: number;
  count: number;
  minLen: number;
  maxLen: number;
  seed: number;
  idPrefix: string;
}) {
  const icicles = useMemo(() => {
    const rnd = mulberry32(seed);
    const gap = width / (count + 1);
    return Array.from({ length: count }, (_, i) => {
      const x = gap * (i + 1) + range(rnd, -gap * 0.2, gap * 0.2);
      const len = range(rnd, minLen, maxLen);
      return { x, len, bend: range(rnd, -1.5, 1.5) };
    });
  }, [width, count, minLen, maxLen, seed]);
  const height = maxLen + 2;
  return (
    <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
      <Defs>
        <SvgLinearGradient id={`${idPrefix}-ice`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="rgb(200,235,255)" stopOpacity="0.9" />
          <Stop offset="1" stopColor="rgb(180,220,255)" stopOpacity="0.3" />
        </SvgLinearGradient>
      </Defs>
      {icicles.map((ic, i) => (
        <Path
          key={i}
          d={`M ${ic.x - 2} 0 L ${ic.x + 2} 0 Q ${ic.x + 1.2 + ic.bend} ${ic.len * 0.55} ${ic.x + 0.5 + ic.bend} ${ic.len} Q ${ic.x + ic.bend} ${ic.len * 0.6} ${ic.x - 2} 0 Z`}
          fill={`url(#${idPrefix}-ice)`}
        />
      ))}
    </Svg>
  );
}

function SnowLedge({ width, depth, seed, style }: { width: number; depth: number; seed: number; style?: object }) {
  const d = useMemo(() => {
    const rnd = mulberry32(seed);
    let path = `M 0 ${depth} L 0 ${depth * 0.55}`;
    const segs = Math.max(4, Math.round(width / 18));
    for (let i = 1; i <= segs; i++) {
      const x = (width * i) / segs;
      const px = (width * (i - 0.5)) / segs;
      const cy = range(rnd, 0, depth * 0.35);
      path += ` Q ${px} ${cy} ${x} ${range(rnd, depth * 0.3, depth * 0.65)}`;
    }
    path += ` L ${width} ${depth} Z`;
    return path;
  }, [width, depth, seed]);
  return (
    <Svg width={width} height={depth} style={[{ position: 'absolute' }, style]} pointerEvents="none">
      <Path d={d} fill={C.snow} />
      <Path d={d} fill="rgba(180,210,240,0.25)" transform={`translate(0 ${depth * 0.35})`} />
    </Svg>
  );
}

/* ================================================================== */
/* LAYER 4 — Building facade                                           */
/* ================================================================== */

function BuildingFacade({ W, H, u }: Dims) {
  const bw = W * 0.75;
  const bh = H * 0.3;
  const left = (W - bw) / 2;
  const top = H * 0.15;
  const domeRx = bw * 0.36;
  const domeRy = bh * 0.24;
  const domeBottom = domeRy * 2 - 4 * u;
  const bodyTop = domeRy * 1.05;
  const colW = 22 * u;
  const colH = bh * 0.65;
  const winW = 20 * u;
  const winH = 14 * u;
  const ledge1 = bodyTop + (bh - bodyTop) * 0.3;
  const ledge2 = bodyTop + (bh - bodyTop) * 0.64;
  const rowY = bodyTop + (bh - bodyTop) * 0.08;
  const midY = ledge1 + 12 * u;
  const midW = bw * 0.6;
  const midH = 28 * u;
  const doorW = 24 * u;
  const doorH = 44 * u;
  const domeStroke = `M ${bw / 2 - domeRx} ${domeRy} A ${domeRx} ${domeRy} 0 0 1 ${bw / 2 + domeRx} ${domeRy}`;

  return (
    <View style={{ position: 'absolute', left, top, width: bw, height: bh }} pointerEvents="none">
      <Svg width={bw} height={bh} style={StyleSheet.absoluteFill}>
        <Defs>
          <SvgLinearGradient id="dome-fill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#152A48" />
            <Stop offset="1" stopColor="#0A1628" />
          </SvgLinearGradient>
        </Defs>
        <Ellipse cx={bw / 2} cy={domeRy - 8 * u} rx={domeRx} ry={domeRy} fill={C.snow} />
        <Ellipse cx={bw / 2} cy={domeRy} rx={domeRx} ry={domeRy} fill="url(#dome-fill)" />
        <Path d={domeStroke} stroke="rgba(144,202,249,0.3)" strokeWidth={1.5} fill="none" />
      </Svg>
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: bodyTop,
          width: bw,
          height: bh - bodyTop,
          backgroundColor: C.facade,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
        }}
      />
      <View style={{ position: 'absolute', left: 0, top: domeBottom, width: bw, height: Math.max(50, 48 * u) }}>
        <IcicleRow width={bw} count={9} minLen={18 * u} maxLen={48 * u} seed={31} idPrefix="dome" />
      </View>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const span = bw * 0.6;
        const x = (bw - span) / 2 + (span / 6) * i + (span / 6 - winW) / 2;
        return (
          <View
            key={`w${i}`}
            style={{
              position: 'absolute',
              left: x,
              top: rowY,
              width: winW,
              height: winH,
              backgroundColor: 'rgba(255,232,192,0.4)',
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.55)',
              borderRadius: 2,
            }}
          />
        );
      })}
      {[ledge1, ledge2].map((ly, i) => (
        <View key={`l${i}`} style={{ position: 'absolute', left: 0, top: ly, width: bw, height: 60 * u }}>
          <View style={{ position: 'absolute', left: 0, top: 0, width: bw, height: 6 * u, backgroundColor: '#1A3050', borderRadius: 2 }} />
          <SnowLedge width={bw} depth={10 * u} seed={40 + i} style={{ top: -9 * u }} />
          <View style={{ position: 'absolute', left: 0, top: 6 * u, width: bw, height: 30 * u }}>
            <IcicleRow width={bw} count={7} minLen={10 * u} maxLen={26 * u} seed={50 + i} idPrefix={`ledge${i}`} />
          </View>
        </View>
      ))}
      <View
        style={{
          position: 'absolute',
          left: (bw - midW) / 2,
          top: midY,
          width: midW,
          height: midH,
          backgroundColor: C.glass,
          borderRadius: midH / 2,
          borderWidth: 1,
          borderColor: 'rgba(200,230,255,0.35)',
          overflow: 'hidden',
        }}
      >
        <View style={{ position: 'absolute', left: midW * 0.08, top: midH * 0.5, width: midW * 0.14, height: midH * 0.34, backgroundColor: 'rgba(255,232,192,0.55)', borderRadius: 3 }} />
        <View style={{ position: 'absolute', left: midW * 0.3, top: midH * 0.55, width: midW * 0.1, height: midH * 0.3, backgroundColor: 'rgba(255,232,192,0.45)', borderRadius: 3 }} />
        <View style={{ position: 'absolute', left: midW * 0.58, top: midH * 0.5, width: midW * 0.16, height: midH * 0.34, backgroundColor: 'rgba(255,232,192,0.55)', borderRadius: 3 }} />
        <View style={{ position: 'absolute', left: midW * 0.82, top: midH * 0.58, width: midW * 0.08, height: midH * 0.28, backgroundColor: 'rgba(255,232,192,0.45)', borderRadius: 3 }} />
        {[0.2, 0.5, 0.8].map((f) => (
          <View key={f} style={{ position: 'absolute', left: midW * f - 3 * u, top: midH * 0.14, width: 6 * u, height: 6 * u, borderRadius: 3 * u, backgroundColor: C.interiorGlow, opacity: 0.9 }} />
        ))}
      </View>
      {[-1, 1].map((dir) => (
        <View
          key={`door${dir}`}
          style={{
            position: 'absolute',
            left: bw / 2 + (dir < 0 ? -doorW - 2 * u : 2 * u),
            top: bh - doorH,
            width: doorW,
            height: doorH,
            backgroundColor: 'rgba(255,232,192,0.55)',
            borderTopLeftRadius: doorW / 2,
            borderTopRightRadius: doorW / 2,
            borderWidth: 1,
            borderColor: 'rgba(200,230,255,0.5)',
          }}
        >
          <View style={{ position: 'absolute', left: doorW * 0.2, top: doorH * 0.35, width: doorW * 0.6, height: doorH * 0.5, backgroundColor: 'rgba(255,240,210,0.45)', borderRadius: 3 }} />
        </View>
      ))}
      {[0.18, 0.82].map((f) => (
        <View key={`col${f}`} style={{ position: 'absolute', left: bw * f - colW / 2, top: bh - colH, width: colW, height: colH }}>
          <LinearGradient
            colors={['#1A3050', '#2A4570', '#1A3050']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={{ position: 'absolute', left: -2 * u, top: -4 * u, width: 26 * u, height: 8 * u, borderRadius: 13 * u, backgroundColor: C.snow }} />
          <View style={{ position: 'absolute', left: 0, top: 3 * u, width: colW, height: 20 * u }}>
            <IcicleRow width={colW} count={3} minLen={6 * u} maxLen={12 * u} seed={60 + f * 100} idPrefix={`col${Math.round(f * 100)}`} />
          </View>
        </View>
      ))}
    </View>
  );
}

/* ================================================================== */
/* LAYER 5 — Logo                                                      */
/* ================================================================== */

function Logo({ W, H, u }: Dims) {
  const shimmer = useSharedValue(-1);
  const halo = useSharedValue(1);
  const textW = 190 * u;
  useEffect(() => {
    shimmer.value = withRepeat(
      withSequence(withTiming(1, { duration: 400, easing: Easing.inOut(Easing.quad) }), withDelay(2600, withTiming(-1, { duration: 0 }))),
      -1,
      false,
    );
    halo.value = withRepeat(withTiming(1.08, { duration: 2000, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => {
      cancelAnimation(shimmer);
      cancelAnimation(halo);
    };
  }, [shimmer, halo]);
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmer.value * textW }, { rotate: '20deg' }],
    opacity: interpolate(Math.abs(shimmer.value), [0, 0.6, 1], [1, 0.7, 0]),
  }));
  const haloStyle = useAnimatedStyle(() => ({ transform: [{ scale: halo.value }] }));
  const owlR = 16 * u;
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: H * 0.2 - 30 * u, alignItems: 'center' }} pointerEvents="none">
      <Animated.View style={[{ position: 'absolute', top: -50 * u, width: 160 * u, height: 160 * u }, haloStyle]}>
        <Canvas style={{ width: 160 * u, height: 160 * u }}>
          <Circle cx={80 * u} cy={80 * u} r={80 * u}>
            <SkRadialGradient c={vec(80 * u, 80 * u)} r={80 * u} colors={['rgba(0,191,255,0.2)', 'rgba(0,191,255,0)']} />
          </Circle>
        </Canvas>
      </Animated.View>
      <View style={{ width: 64 * u, height: 64 * u, alignItems: 'center', justifyContent: 'center' }}>
        <Canvas style={{ position: 'absolute', width: 64 * u, height: 64 * u }}>
          <Circle cx={32 * u} cy={32 * u} r={owlR} color={C.logoGlow} opacity={0.9}>
            <BlurMask blur={12} style="normal" />
          </Circle>
        </Canvas>
        <Svg width={owlR * 2 + 4} height={owlR * 2 + 4} viewBox="0 0 36 36">
          <SvgCircle cx={18} cy={18} r={16} fill="rgba(10,25,50,0.85)" stroke="rgba(100,180,255,0.8)" strokeWidth={2} />
          <SvgCircle cx={18} cy={18} r={11} fill="none" stroke="rgba(100,180,255,0.35)" strokeWidth={1} />
          <SvgCircle cx={12.5} cy={16} r={4.6} fill="#FFFFFF" />
          <SvgCircle cx={23.5} cy={16} r={4.6} fill="#FFFFFF" />
          <SvgCircle cx={12.5} cy={16} r={2.1} fill="#0A1628" />
          <SvgCircle cx={23.5} cy={16} r={2.1} fill="#0A1628" />
          <Polygon points="18,19 15.5,22.5 20.5,22.5" fill="#FFB040" />
          <Polygon points="8,8 11,3 13,9" fill="rgba(100,180,255,0.8)" />
          <Polygon points="28,8 25,3 23,9" fill="rgba(100,180,255,0.8)" />
        </Svg>
      </View>
      <View style={{ width: textW, height: 40 * u, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <Text style={[styles.logoText, { fontSize: 28 * u, textShadowColor: 'rgba(0,191,255,0.6)', textShadowRadius: 16 }]}>BraveVoice</Text>
        <Text style={[styles.logoText, { position: 'absolute', fontSize: 28 * u, textShadowColor: 'rgba(255,255,255,0.9)', textShadowRadius: 6 }]}>BraveVoice</Text>
        <Text style={[styles.logoText, { position: 'absolute', fontSize: 28 * u }]}>BraveVoice</Text>
        <Animated.View style={[{ position: 'absolute', top: -10 * u, width: 10 * u, height: 70 * u }, shimmerStyle]}>
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.95)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </View>
    </View>
  );
}

/* ================================================================== */
/* LAYER 6 — Banners                                                   */
/* ================================================================== */

function starPoints(cx: number, cy: number, outer: number, inner: number, points = 8) {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI * i) / points - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}

function Banner({ side, W, H, u }: Dims & { side: 'left' | 'right' }) {
  const sway = useSharedValue(-1.5);
  useEffect(() => {
    sway.value = withRepeat(withTiming(1.5, { duration: 4000, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(sway);
  }, [sway]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${sway.value * (side === 'left' ? 1 : -1)}deg` }] }));
  const bw = 42 * u;
  const bh = 160 * u;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: H * 0.28,
          width: bw,
          height: bh,
          transformOrigin: 'top center',
          borderWidth: 1.5,
          borderColor: 'rgba(100,160,255,0.5)',
          overflow: 'hidden',
        },
        // Set in from the screen edge so each banner hangs on the facade rather
        // than behind the front row of pines.
        side === 'left' ? { left: W * 0.26 } : { right: W * 0.26 },
        style,
      ]}
    >
      <LinearGradient colors={[C.banner, '#1E4A99', '#162E6A']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={{ position: 'absolute', left: 4, top: 4, right: 4, bottom: 4, borderWidth: 1, borderColor: 'rgba(100,160,255,0.2)' }} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: bh / 2 - 15 * u, alignItems: 'center' }}>
        <Svg width={30 * u} height={30 * u} viewBox="0 0 30 30">
          <Polygon points={starPoints(15, 15, 13.5, 5.2)} fill="rgba(200,230,255,0.35)" opacity={0.8} />
          <Polygon points={starPoints(15, 15, 11, 4.2)} fill="rgba(200,230,255,0.9)" />
        </Svg>
      </View>
      <Canvas style={{ position: 'absolute', left: 0, top: bh / 2 - 20 * u, width: bw, height: 40 * u }} pointerEvents="none">
        <Circle cx={bw / 2} cy={20 * u} r={11 * u} color="rgba(200,230,255,0.5)">
          <BlurMask blur={4} style="normal" />
        </Circle>
      </Canvas>
    </Animated.View>
  );
}

/* ================================================================== */
/* LAYER 8 — Courtyard floor + compass                                 */
/* ================================================================== */

function CompassRose({ size }: { size: number }) {
  const c = size / 2;
  const R = size / 2 - 2;
  const pts = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI * i) / 4 - Math.PI / 2;
      const long = i % 2 === 0;
      const len = long ? R * 0.92 : R * 0.6;
      const w = long ? R * 0.14 : R * 0.1;
      const tipX = c + len * Math.cos(a);
      const tipY = c + len * Math.sin(a);
      const lx = c + w * Math.cos(a + Math.PI / 2);
      const ly = c + w * Math.sin(a + Math.PI / 2);
      const rx = c + w * Math.cos(a - Math.PI / 2);
      const ry = c + w * Math.sin(a - Math.PI / 2);
      out.push(`${tipX},${tipY} ${lx},${ly} ${c},${c} ${rx},${ry}`);
    }
    return out;
  }, [c, R]);
  const labelR = R * 0.78;
  return (
    <Svg width={size} height={size}>
      <SvgCircle cx={c} cy={c} r={R} stroke="rgba(74,122,181,0.6)" strokeWidth={1.5} fill="none" />
      <SvgCircle cx={c} cy={c} r={R * 0.62} stroke="rgba(74,122,181,0.4)" strokeWidth={1} fill="none" />
      {[0, 1, 2, 3].map((i) => {
        const a = (Math.PI * i) / 2;
        return (
          <Path
            key={`card${i}`}
            d={`M ${c - R * Math.cos(a)} ${c - R * Math.sin(a)} L ${c + R * Math.cos(a)} ${c + R * Math.sin(a)}`}
            stroke="rgba(74,122,181,0.5)"
            strokeWidth={1}
          />
        );
      })}
      {pts.map((p, i) => (
        <Polygon key={`pt${i}`} points={p} fill="rgba(74,122,181,0.7)" />
      ))}
      <Polygon points={`${c},${c - R * 0.12} ${c + R * 0.12},${c} ${c},${c + R * 0.12} ${c - R * 0.12},${c}`} fill="rgba(74,122,181,0.8)" />
      {[
        { l: 'N', x: c, y: c - labelR + 3 },
        { l: 'S', x: c, y: c + labelR + 4 },
        { l: 'E', x: c + labelR, y: c + 3.5 },
        { l: 'W', x: c - labelR, y: c + 3.5 },
      ].map((t) => (
        <SvgText key={t.l} x={t.x} y={t.y} fontSize={10} fontFamily={FONT} fill="rgba(100,150,200,0.8)" textAnchor="middle">
          {t.l}
        </SvgText>
      ))}
    </Svg>
  );
}

function CourtyardFloor({ W, H, u, floorTop }: Dims & { floorTop: number }) {
  const floorH = H - floorTop;
  const veins = useMemo(() => {
    const rnd = mulberry32(88);
    return Array.from({ length: 8 }, () => {
      const x = range(rnd, 0, W);
      const y = range(rnd, 0, floorH);
      const len = range(rnd, W * 0.12, W * 0.4);
      const dx = len * 0.8;
      const dy = len * range(rnd, 0.2, 0.5) * (rnd() > 0.5 ? 1 : -1);
      return `M ${x} ${y} Q ${x + dx * 0.5 + range(rnd, -20, 20)} ${y + dy * 0.5 + range(rnd, -14, 14)} ${x + dx} ${y + dy}`;
    });
  }, [W, floorH]);
  const pathW = W * 0.15;
  return (
    <View style={{ position: 'absolute', left: 0, top: floorTop, width: W, height: floorH }} pointerEvents="none">
      <LinearGradient colors={['rgba(184,200,216,0.9)', 'rgba(160,184,204,0.95)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      <Svg width={W} height={floorH} style={StyleSheet.absoluteFill}>
        {veins.map((d, i) => (
          <Path key={i} d={d} stroke="rgba(140,165,190,0.4)" strokeWidth={1} fill="none" />
        ))}
        <Polygon
          points={`${W / 2 - pathW * 0.35},0 ${W / 2 + pathW * 0.35},0 ${W / 2 + pathW / 2},${floorH} ${W / 2 - pathW / 2},${floorH}`}
          fill="rgba(200,220,235,0.3)"
        />
      </Svg>
      <View style={{ position: 'absolute', left: W / 2 - 80 * u, top: floorH * 0.66 - 44 * u, width: 160 * u, height: 160 * u, transform: [{ scaleY: 0.55 }] }}>
        <CompassRose size={160 * u} />
      </View>
    </View>
  );
}

function FloorReflection({ W, H, u, floorTop }: Dims & { floorTop: number }) {
  const floorH = H - floorTop;
  const reflH = floorH * 0.3;
  return (
    <View style={{ position: 'absolute', left: 0, top: floorTop, width: W, height: reflH, overflow: 'hidden', opacity: 0.25 }} pointerEvents="none">
      <View style={{ position: 'absolute', left: 0, top: -floorTop, width: W, height: H, transformOrigin: ['50%', floorTop, 0], transform: [{ scaleY: -1 }] }}>
        <BuildingFacade W={W} H={H} u={u} />
        <Logo W={W} H={H} u={u} />
      </View>
      <BlurView intensity={10} tint="light" style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(184,200,216,0)', 'rgba(184,200,216,1)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
    </View>
  );
}

/* ================================================================== */
/* LAYER 9 — Ice crystal tree, garden, lanterns                        */
/* ================================================================== */

type Branch = { x1: number; y1: number; x2: number; y2: number; w1: number; w2: number };

function buildTree(u: number) {
  const rnd = mulberry32(555);
  const cx = 80 * u;
  const base = 150 * u;
  const trunkTop = base - 48 * u;
  const branches: Branch[] = [];
  const minors: Branch[] = [];
  const snow: Array<{ cx: number; cy: number; rx: number; ry: number }> = [];
  const junctions: Array<{ cx: number; cy: number; r: number }> = [];
  const angles = [30, 45, 60, 120, 135, 150];
  angles.forEach((deg, idx) => {
    const a = (deg * Math.PI) / 180;
    const len = range(rnd, 52, 68) * u;
    const x2 = cx + Math.cos(a) * len;
    const y2 = trunkTop - Math.sin(a) * len;
    branches.push({ x1: cx, y1: trunkTop, x2, y2, w1: 4 * u, w2: 2 * u });
    junctions.push({ cx, cy: trunkTop, r: 5 * u });
    for (let i = 0; i < 12; i++) {
      const t = 0.18 + (i / 12) * 0.78;
      const bx = cx + (x2 - cx) * t;
      const by = trunkTop + (y2 - trunkTop) * t;
      const side = i % 2 === 0 ? 1 : -1;
      const ma = a + side * range(rnd, 0.5, 0.95);
      const ml = range(rnd, 10, 22) * u * (1 - t * 0.4);
      const mx = bx + Math.cos(ma) * ml;
      const my = by - Math.sin(ma) * ml;
      minors.push({ x1: bx, y1: by, x2: mx, y2: my, w1: 1.5 * u, w2: 1 * u });
      snow.push({ cx: (bx + mx) / 2, cy: (by + my) / 2 - 2 * u, rx: ml * 0.45, ry: range(rnd, 3, 6) * u * 0.5 });
      if (i % 3 === 0) junctions.push({ cx: bx, cy: by - 1.5 * u, r: 3.2 * u });
    }
    for (let s = 0.25; s < 1; s += 0.22) {
      snow.push({ cx: cx + (x2 - cx) * s, cy: trunkTop + (y2 - trunkTop) * s - 3 * u, rx: 8 * u, ry: range(rnd, 3, 6) * u * 0.55 });
    }
    if (idx % 2 === 0) junctions.push({ cx: x2, cy: y2, r: 3.5 * u });
  });
  const crystals = [
    { dx: -46, h: 40 }, { dx: -30, h: 62 }, { dx: -14, h: 50 }, { dx: 0, h: 90 }, { dx: 14, h: 55 }, { dx: 30, h: 70 }, { dx: 46, h: 42 },
  ].map((c) => {
    const w = Math.max(14, c.h * 0.32) * u;
    const h = c.h * u;
    const x = cx + c.dx * u;
    const tilt = range(rnd, -4, 4) * u;
    const front = `${x + tilt},${base - h} ${x + w / 2},${base - h * 0.78} ${x + w / 2},${base - h * 0.12} ${x},${base} ${x - w / 2},${base - h * 0.12} ${x - w / 2},${base - h * 0.78}`;
    const sideFace = `${x + tilt},${base - h} ${x + w / 2},${base - h * 0.78} ${x + w * 0.72},${base - h * 0.7} ${x + w * 0.72},${base - h * 0.18} ${x + w / 2},${base - h * 0.12} ${x},${base}`;
    return { front, sideFace, x, h, w, tilt };
  });
  return { cx, base, trunkTop, branches, minors, snow, junctions, crystals };
}

function branchPath(b: Branch) {
  const dx = b.x2 - b.x1;
  const dy = b.y2 - b.y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  return `M ${b.x1 + nx * b.w1 / 2} ${b.y1 + ny * b.w1 / 2} L ${b.x2 + nx * b.w2 / 2} ${b.y2 + ny * b.w2 / 2} L ${b.x2 - nx * b.w2 / 2} ${b.y2 - ny * b.w2 / 2} L ${b.x1 - nx * b.w1 / 2} ${b.y1 - ny * b.w1 / 2} Z`;
}

function IceCrystalTree({ W, H, u, baseY }: Dims & { baseY: number }) {
  const tree = useMemo(() => buildTree(u), [u]);
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(pulse);
  }, [pulse]);
  const crystalStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.03 }] }));
  const brightStyle = useAnimatedStyle(() => ({ opacity: pulse.value * 0.35 }));
  const glowOpacity = useDerivedValue(() => 0.6 + pulse.value * 0.4);
  const canvasW = 160 * u;
  const canvasH = 150 * u;
  const left = W / 2 - canvasW / 2;
  const top = baseY - canvasH;
  const crystalPaths = useMemo(
    () =>
      tree.crystals.map((c) => {
        const p = Skia.Path.Make();
        const pts = c.front.split(' ').map((s) => s.split(',').map(Number));
        pts.forEach(([x, y], i) => (i === 0 ? p.moveTo(x, y) : p.lineTo(x, y)));
        p.close();
        return p;
      }),
    [tree],
  );
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: left - 60 * u, top: top - 30 * u, width: canvasW + 120 * u, height: canvasH + 90 * u }}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Oval x={60 * u + tree.cx - 80 * u} y={30 * u + tree.base - 30 * u} width={160 * u} height={60 * u} color="rgba(0,150,255,0.12)" />
        <Group opacity={glowOpacity}>
          <Oval x={60 * u + tree.cx - 60 * u} y={30 * u + tree.base - 20 * u} width={120 * u} height={40 * u}>
            <SkRadialGradient c={vec(60 * u + tree.cx, 30 * u + tree.base)} r={60 * u} colors={['rgba(0,191,255,0.4)', 'rgba(0,191,255,0)']} />
          </Oval>
          <Group transform={[{ translateX: 60 * u }, { translateY: 30 * u }]}>
            {crystalPaths.map((p, i) => (
              <SkPath key={i} path={p} color={C.crystalBlue} opacity={0.85}>
                <BlurMask blur={20} style="normal" />
              </SkPath>
            ))}
          </Group>
        </Group>
      </Canvas>
      <View style={{ position: 'absolute', left: 60 * u, top: 30 * u, width: canvasW, height: canvasH }}>
        <Svg width={canvasW} height={canvasH} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgLinearGradient id="trunk" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#B0C4D0" />
              <Stop offset="0.5" stopColor="#C8D8E0" />
              <Stop offset="1" stopColor="#A8BCC8" />
            </SvgLinearGradient>
          </Defs>
          <Polygon
            points={`${tree.cx - 4 * u},${tree.base} ${tree.cx + 4 * u},${tree.base} ${tree.cx + 2.5 * u},${tree.trunkTop} ${tree.cx - 2.5 * u},${tree.trunkTop}`}
            fill="url(#trunk)"
          />
          {tree.branches.map((b, i) => (
            <Path key={`b${i}`} d={branchPath(b)} fill="#D0E0E8" />
          ))}
          {tree.minors.map((b, i) => (
            <Path key={`m${i}`} d={branchPath(b)} fill="#D0E0E8" />
          ))}
          {tree.snow.map((s, i) => (
            <Ellipse key={`s${i}`} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill={C.snow} />
          ))}
          {tree.junctions.map((j, i) => (
            <SvgCircle key={`j${i}`} cx={j.cx} cy={j.cy} r={j.r} fill={C.snow} />
          ))}
        </Svg>
        <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: ['50%', tree.base, 0] }, crystalStyle]}>
          <Svg width={canvasW} height={canvasH} style={StyleSheet.absoluteFill}>
            <Defs>
              <SvgLinearGradient id="crystal" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="rgb(0,100,200)" stopOpacity="0.4" />
                <Stop offset="0.3" stopColor={C.crystalBlue} />
                <Stop offset="0.5" stopColor={C.crystalCore} />
                <Stop offset="0.7" stopColor={C.crystalBlue} />
                <Stop offset="1" stopColor="rgb(0,100,200)" stopOpacity="0.4" />
              </SvgLinearGradient>
              <SvgLinearGradient id="crystal-side" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={C.crystalBlue} stopOpacity="0.85" />
                <Stop offset="1" stopColor="rgb(0,100,200)" stopOpacity="0.5" />
              </SvgLinearGradient>
            </Defs>
            {tree.crystals.map((c, i) => (
              <G key={`c${i}`}>
                <Polygon points={c.sideFace} fill="url(#crystal-side)" />
                <Polygon points={c.front} fill="url(#crystal)" stroke="rgba(200,245,255,0.7)" strokeWidth={0.8} />
                <Path d={`M ${c.x + c.tilt} ${tree.base - c.h} L ${c.x - c.w * 0.18} ${tree.base - c.h * 0.4} L ${c.x} ${tree.base - c.h * 0.1}`} stroke="rgba(255,255,255,0.75)" strokeWidth={1} fill="none" />
              </G>
            ))}
          </Svg>
          <Animated.View style={[StyleSheet.absoluteFill, brightStyle]}>
            <Svg width={canvasW} height={canvasH} style={StyleSheet.absoluteFill}>
              {tree.crystals.map((c, i) => (
                <Polygon key={`w${i}`} points={c.front} fill="#FFFFFF" />
              ))}
            </Svg>
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

function GardenRing({ W, u, centerY }: Dims & { centerY: number }) {
  const rxOuter = 90 * u;
  const ryOuter = 34 * u;
  const rxInner = 70 * u;
  const ryInner = 26 * u;
  const cx = W / 2;
  const ring = useMemo(() => {
    const p = Skia.Path.Make();
    p.addOval({ x: cx - rxOuter, y: centerY - ryOuter, width: rxOuter * 2, height: ryOuter * 2 });
    p.addOval({ x: cx - rxInner, y: centerY - ryInner, width: rxInner * 2, height: ryInner * 2 });
    p.setFillType(FillType.EvenOdd);
    return p;
  }, [cx, centerY, rxOuter, ryOuter, rxInner, ryInner]);
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <SkPath path={ring} color="rgba(144,202,249,0.2)" />
      <Oval x={cx - rxOuter} y={centerY - ryOuter} width={rxOuter * 2} height={ryOuter * 2} color="rgba(74,122,181,0.45)" style="stroke" strokeWidth={1.2} />
      <Oval x={cx - rxInner} y={centerY - ryInner} width={rxInner * 2} height={ryInner * 2} color="rgba(74,122,181,0.35)" style="stroke" strokeWidth={1} />
    </Canvas>
  );
}

function StoneLanternBody({ x, y, u, flicker }: { x: number; y: number; u: number; flicker: SharedValue<number> }) {
  const glowStyle = useAnimatedStyle(() => ({ opacity: flicker.value }));
  const w = 40 * u;
  const h = 56 * u;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x - w / 2, top: y - h, width: w, height: h }}>
      <View style={{ position: 'absolute', left: w / 2 - 4 * u, bottom: 0, width: 8 * u, height: 20 * u, backgroundColor: '#7A8590', borderRadius: 1 }} />
      <View style={{ position: 'absolute', left: w / 2 - 5 * u, bottom: 20 * u, width: 10 * u, height: 12 * u, backgroundColor: '#5C6670', borderRadius: 2, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[{ width: 6 * u, height: 8 * u, backgroundColor: C.lanternGold, borderRadius: 1 }, glowStyle]} />
      </View>
      <View style={{ position: 'absolute', left: w / 2 - 7 * u, bottom: 32 * u, width: 14 * u, height: 8 * u, backgroundColor: '#6A7580', borderTopLeftRadius: 7 * u, borderTopRightRadius: 7 * u }} />
      <View style={{ position: 'absolute', left: w / 2 - 7 * u, bottom: 39 * u, width: 14 * u, height: 4 * u, backgroundColor: C.snow, borderRadius: 3 * u }} />
    </View>
  );
}

type LanternSpec = { x: number; y: number; duration: number; delay: number };

function LanternRing({ W, H, u, centerY }: Dims & { centerY: number }) {
  const lanterns = useMemo<LanternSpec[]>(() => {
    const durations = [400, 700, 500, 640, 460, 580];
    const delays = [0, 1800, 900, 300, 1400, 600];
    return Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI * 2 * i) / 6 + Math.PI / 6;
      return {
        x: W / 2 + Math.cos(a) * 82 * u,
        y: centerY + Math.sin(a) * 31 * u + 4 * u,
        duration: durations[i],
        delay: delays[i],
      };
    }).sort((a, b) => a.y - b.y);
  }, [W, u, centerY]);

  const flickers = lanterns.map((l) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const v = useSharedValue(1);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      v.value = withDelay(l.delay, withRepeat(withTiming(0.75, { duration: l.duration, easing: Easing.inOut(Easing.quad) }), -1, true));
      return () => cancelAnimation(v);
    }, [v]);
    return v;
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        {lanterns.map((l, i) => (
          <Circle key={i} cx={l.x} cy={l.y - 26 * u} r={12 * u} color={C.lanternGold} opacity={flickers[i]}>
            <BlurMask blur={12} style="normal" />
          </Circle>
        ))}
      </Canvas>
      {lanterns.map((l, i) => (
        <StoneLanternBody key={i} x={l.x} y={l.y} u={u} flicker={flickers[i]} />
      ))}
    </View>
  );
}

/* ================================================================== */
/* LAYER 10 — Wooden gates (Skia wood grain + SVG hardware)            */
/* ================================================================== */

function WoodGrain({ w, h, side }: { w: number; h: number; side: 'left' | 'right' }) {
  const grain = useMemo(() => {
    const rnd = mulberry32(side === 'left' ? 909 : 707);
    const lines: Array<{ path: SkPathType; color: string; width: number }> = [];
    let x = 6;
    let i = 0;
    while (x < w - 4) {
      const p = Skia.Path.Make();
      p.moveTo(x, -2);
      const segs = 6;
      for (let s = 1; s <= segs; s++) {
        const y = (h * s) / segs;
        const py = (h * (s - 0.5)) / segs;
        const wob = range(rnd, -4, 4);
        p.cubicTo(x + wob, py, x + wob * 0.5, py + h / segs / 2, x + range(rnd, -2, 2), y);
      }
      lines.push({
        path: p,
        color: i % 2 === 0 ? 'rgba(74,46,16,0.6)' : 'rgba(20,10,4,0.4)',
        width: range(rnd, 1, 2.4),
      });
      x += range(rnd, 4, 6);
      i++;
    }
    const knots = Array.from({ length: 3 }, () => ({
      cx: range(rnd, w * 0.2, w * 0.8),
      cy: range(rnd, h * 0.1, h * 0.9),
      rx: range(rnd, 5, 10),
      ry: range(rnd, 3, 6),
    }));
    return { lines, knots };
  }, [w, h, side]);

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <SkRect x={0} y={0} width={w} height={h} color={C.woodDark} />
      <SkRect x={0} y={0} width={w} height={h}>
        <SkLinearGradient
          start={side === 'left' ? vec(0, 0) : vec(w, 0)}
          end={side === 'left' ? vec(w, 0) : vec(0, 0)}
          colors={['#1A0E07', '#2C1A0A', '#3D1F0A']}
          positions={[0, 0.2, 1]}
        />
      </SkRect>
      {grain.lines.map((l, i) => (
        <SkPath key={i} path={l.path} color={l.color} style="stroke" strokeWidth={l.width} />
      ))}
      {grain.knots.map((k, i) => (
        <Group key={`k${i}`}>
          <Oval x={k.cx - k.rx} y={k.cy - k.ry} width={k.rx * 2} height={k.ry * 2} color="rgba(20,10,4,0.5)" />
          <Oval x={k.cx - k.rx * 0.5} y={k.cy - k.ry * 0.5} width={k.rx} height={k.ry} color="rgba(107,66,32,0.4)" />
        </Group>
      ))}
      <SkRect x={side === 'left' ? 0 : w - 8} y={0} width={8} height={h} color="rgba(255,255,255,0.04)" />
      <SkRect x={0} y={0} width={w} height={12} color={C.frame} />
      <SkRect x={0} y={h - 12} width={w} height={12} color={C.frame} />
      <SkRect x={side === 'left' ? 0 : w - 12} y={0} width={12} height={h} color={C.frame} />
      <SkRect x={side === 'left' ? w - 12 : 0} y={0} width={12} height={h} color={C.frame} />
      <SkRect x={12} y={12} width={w - 24} height={2} color="rgba(255,255,255,0.06)" />
      <SkRect x={side === 'left' ? w - 14 : 12} y={12} width={2} height={h - 24} color="rgba(255,255,255,0.06)" />
    </Canvas>
  );
}

function OwlMedallion({ size, glow }: { size: number; glow: SharedValue<number> }) {
  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[StyleSheet.absoluteFill, glowStyle]}>
        <Canvas style={StyleSheet.absoluteFill}>
          <Circle cx={size / 2} cy={size / 2} r={size * 0.42} color="rgba(0,150,255,0.8)">
            <BlurMask blur={16} style="normal" />
          </Circle>
        </Canvas>
      </Animated.View>
      <Svg width={size} height={size} viewBox="0 0 72 72">
        <SvgCircle cx={36} cy={36} r={34.5} fill="rgba(20,40,80,0.7)" stroke="rgba(100,160,220,0.8)" strokeWidth={3} />
        <SvgCircle cx={36} cy={36} r={25} fill="none" stroke="rgba(100,160,220,0.5)" strokeWidth={2} />
        <Polygon points="20,20 25,10 30,22" fill="rgba(100,160,220,0.75)" />
        <Polygon points="52,20 47,10 42,22" fill="rgba(100,160,220,0.75)" />
        <SvgCircle cx={28} cy={33} r={9} fill="#FFFFFF" />
        <SvgCircle cx={44} cy={33} r={9} fill="#FFFFFF" />
        <SvgCircle cx={28} cy={33} r={4} fill="#08111F" />
        <SvgCircle cx={44} cy={33} r={4} fill="#08111F" />
        <Polygon points="36,38 31,46 41,46" fill="#FFB040" />
        <Path d="M 22 50 Q 36 58 50 50" stroke="rgba(100,160,220,0.5)" strokeWidth={2} fill="none" />
      </Svg>
    </View>
  );
}

function GateHinge({ u }: { u: number }) {
  const w = 18 * u;
  const h = 44 * u;
  return (
    <View style={{ width: w, height: h, borderWidth: 1, borderColor: 'rgba(200,160,40,0.5)', borderRadius: 4, overflow: 'hidden' }}>
      <LinearGradient colors={['#8B6914', '#C49A2A', '#8B6914']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
      {[
        { l: 2, t: 2 },
        { l: w - 6, t: 2 },
        { l: 2, t: h - 6 },
        { l: w - 6, t: h - 6 },
      ].map((b, i) => (
        <View key={i} style={{ position: 'absolute', left: b.l, top: b.t, width: 4, height: 4, borderRadius: 2, backgroundColor: '#5C4508' }} />
      ))}
    </View>
  );
}

function WallLantern({ u, side }: { u: number; side: 'left' | 'right' }) {
  const flicker = useSharedValue(1);
  useEffect(() => {
    const pulse = () =>
      withSequence(
        withTiming(0.7, { duration: 150 + Math.random() * 150 }),
        withTiming(1, { duration: 150 + Math.random() * 300 }),
      );
    flicker.value = withRepeat(pulse(), -1, true);
    return () => cancelAnimation(flicker);
  }, [flicker]);
  const style = useAnimatedStyle(() => ({ opacity: flicker.value }));
  const dir = side === 'left' ? 1 : -1;
  return (
    <View style={{ width: 46 * u, height: 40 * u, flexDirection: side === 'left' ? 'row' : 'row-reverse', alignItems: 'flex-start' }}>
      <Animated.View style={[{ position: 'absolute', left: 0, top: -10 * u, width: 60 * u, height: 60 * u }, style]} pointerEvents="none">
        <Canvas style={StyleSheet.absoluteFill}>
          <Circle cx={30 * u} cy={30 * u} r={30 * u}>
            <SkRadialGradient c={vec(30 * u, 30 * u)} r={30 * u} colors={['rgba(255,160,60,0.15)', 'rgba(255,160,60,0)']} />
          </Circle>
        </Canvas>
      </Animated.View>
      <View style={{ width: 16 * u, height: 3 * u, backgroundColor: '#1A1A1A', marginTop: 2 * u }} />
      <View style={{ width: 3 * u, height: 10 * u, backgroundColor: '#1A1A1A', marginLeft: dir > 0 ? -3 * u : 0, marginRight: dir > 0 ? 0 : -3 * u, marginTop: 2 * u }} />
      <View
        style={{
          position: 'absolute',
          left: side === 'left' ? 14 * u : undefined,
          right: side === 'right' ? 14 * u : undefined,
          top: 10 * u,
          width: 14 * u,
          height: 22 * u,
          backgroundColor: '#2A2A2A',
          borderRadius: 2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Animated.View style={[{ width: 8 * u, height: 14 * u, backgroundColor: '#FFB040', borderRadius: 1 }, style]} />
      </View>
    </View>
  );
}

function Gate({
  side,
  W,
  H,
  u,
  progress,
}: Dims & { side: 'left' | 'right'; progress: SharedValue<number> }) {
  const gw = W * 0.15;
  const style = useAnimatedStyle(() => {
    const angle = progress.value * GATE_ANGLE * (side === 'left' ? -1 : 1);
    return {
      transform: [{ perspective: 800 }, { rotateY: `${angle}deg` }],
    };
  });
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: (1 - progress.value) * 0.45,
    transform: [{ scaleX: 1 - progress.value * 0.8 }],
  }));
  const medallionGlow = useDerivedValue(() => progress.value);

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: H * 0.58,
            width: gw * 1.4,
            height: H * 0.42,
            backgroundColor: 'rgba(10,18,32,0.5)',
            transformOrigin: side === 'left' ? 'left center' : 'right center',
          },
          side === 'left' ? { left: 0 } : { right: 0 },
          shadowStyle,
        ]}
      />
      <Animated.View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: gw,
            transformOrigin: side === 'left' ? 'left center' : 'right center',
            backgroundColor: C.woodDark,
          },
          side === 'left' ? { left: 0 } : { right: 0 },
          style,
        ]}
      >
        <WoodGrain w={gw} h={H} side={side} />
        <View style={{ position: 'absolute', left: 0, right: 0, top: H * 0.38 - gw * 0.24, alignItems: 'center' }}>
          <OwlMedallion size={Math.min(72 * u, gw * 0.75)} glow={medallionGlow} />
        </View>
        {[0.15, 0.5, 0.85].map((t) => (
          <View
            key={t}
            style={[
              { position: 'absolute', top: H * t - 22 * u },
              side === 'left' ? { right: 2 } : { left: 2 },
            ]}
          >
            <GateHinge u={u} />
          </View>
        ))}
        <View
          style={[
            { position: 'absolute', top: H * 0.25 },
            side === 'left' ? { right: -8 * u } : { left: -8 * u },
          ]}
        >
          <WallLantern u={u} side={side} />
        </View>
        <SnowLedge width={gw} depth={10 * u} seed={side === 'left' ? 11 : 12} style={{ top: 0 }} />
      </Animated.View>
    </>
  );
}

/* ================================================================== */
/* LAYER 11 — Snow particles (Skia, JS-driven RAF)                     */
/* ================================================================== */

type Flake = {
  x: number;
  y: number;
  r: number;
  vy: number;
  vx: number;
  opacity: number;
  bucket: number;
  glintPhase: number;
  glintGold: boolean;
};

const FLAKE_COUNT = 80;
/** Three size buckets let 80 flakes draw in three batched calls instead of 80. */
const BUCKET_STYLE = [
  { width: 1.6, opacity: 0.5 },
  { width: 3.0, opacity: 0.7 },
  { width: 4.4, opacity: 0.85 },
];

function makeFlakes(W: number, H: number, spread: boolean): Flake[] {
  const rnd = mulberry32(4242);
  return Array.from({ length: FLAKE_COUNT }, (_, i) => {
    const r = range(rnd, 1.5, 4.5) / 2;
    return {
      x: range(rnd, 0, W),
      y: spread ? range(rnd, 0, H) : range(rnd, -H, H),
      r,
      vy: range(rnd, 0.4, 1.2) * 60,
      vx: range(rnd, -0.2, 0.2) * 60,
      opacity: range(rnd, 0.4, 0.9),
      bucket: r < 1 ? 0 : r < 1.7 ? 1 : 2,
      glintPhase: i / FLAKE_COUNT < 0.12 ? range(rnd, 0, 4) : -1,
      glintGold: rnd() > 0.5,
    };
  });
}

/**
 * Snow runs on the UI thread and writes straight into Skia shared values, so the
 * particle loop never triggers a React render.
 */
function SnowField({ W, H, reduced }: Dims & { reduced: boolean }) {
  const flakes = useSharedValue<Flake[]>(makeFlakes(W, H, reduced));
  const elapsed = useSharedValue(0);

  useEffect(() => {
    flakes.value = makeFlakes(W, H, reduced);
  }, [W, H, reduced, flakes]);

  useFrameCallback((info) => {
    'worklet';
    if (reduced) return;
    const dt = Math.min(48, info.timeSincePreviousFrame ?? 16) / 1000;
    elapsed.value += dt;
    const next = flakes.value;
    const out: Flake[] = [];
    for (let i = 0; i < next.length; i++) {
      const f = next[i];
      let y = f.y + f.vy * dt;
      let x = f.x + f.vx * dt;
      if (y > H + 6) {
        y = -6;
        x = (i * 97.13) % W;
      }
      if (x < -6) x = W + 6;
      else if (x > W + 6) x = -6;
      out.push({ ...f, x, y });
    }
    flakes.value = out;
  }, !reduced);

  const collect = (bucket: number) => {
    'worklet';
    const out = [];
    const list = flakes.value;
    for (let i = 0; i < list.length; i++) {
      if (list[i].bucket === bucket && list[i].glintPhase < 0) out.push(vec(list[i].x, list[i].y));
    }
    return out;
  };
  const smallPoints = useDerivedValue(() => collect(0));
  const midPoints = useDerivedValue(() => collect(1));
  const largePoints = useDerivedValue(() => collect(2));
  const bucketPoints = [smallPoints, midPoints, largePoints];

  const glintWhite = useDerivedValue(() => {
    const out = [];
    const list = flakes.value;
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      if (f.glintPhase >= 0 && (elapsed.value + f.glintPhase) % 4 >= 0.2) out.push(vec(f.x, f.y));
    }
    return out;
  });
  const glintGold = useDerivedValue(() => {
    const out = [];
    const list = flakes.value;
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      if (f.glintPhase >= 0 && f.glintGold && (elapsed.value + f.glintPhase) % 4 < 0.2) out.push(vec(f.x, f.y));
    }
    return out;
  });
  const glintBlue = useDerivedValue(() => {
    const out = [];
    const list = flakes.value;
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      if (f.glintPhase >= 0 && !f.glintGold && (elapsed.value + f.glintPhase) % 4 < 0.2) out.push(vec(f.x, f.y));
    }
    return out;
  });

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      {bucketPoints.map((points, i) => (
        <Points
          key={i}
          points={points}
          mode="points"
          color="#FFFFFF"
          style="stroke"
          strokeWidth={BUCKET_STYLE[i].width}
          strokeCap="round"
          opacity={BUCKET_STYLE[i].opacity}
        />
      ))}
      <Points points={glintWhite} mode="points" color="#FFFFFF" style="stroke" strokeWidth={3} strokeCap="round" opacity={0.75} />
      <Points points={glintGold} mode="points" color={C.lanternGold} style="stroke" strokeWidth={4.5} strokeCap="round" />
      <Points points={glintBlue} mode="points" color={C.crystalCore} style="stroke" strokeWidth={4.5} strokeCap="round" />
    </Canvas>
  );
}

/* ================================================================== */
/* LAYER 12 — Enter button                                             */
/* ================================================================== */

function EnterButton({ u, visible, onPress }: { u: number; visible: SharedValue<number>; onPress: () => void }) {
  const press = useSharedValue(1);
  const sweep = useSharedValue(0);
  useEffect(() => {
    sweep.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(sweep);
  }, [sweep]);
  const wrapStyle = useAnimatedStyle(() => ({
    opacity: visible.value,
    transform: [{ scale: press.value }, { translateY: (1 - visible.value) * 12 }],
  }));
  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(sweep.value, [0, 1], [-260 * u, 260 * u]) }, { rotate: '12deg' }],
  }));
  const w = 240 * u;
  const h = 56 * u;
  return (
    <Animated.View style={[{ position: 'absolute', bottom: '10%', alignSelf: 'center' }, wrapStyle]}>
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
          borderColor: 'rgba(100,160,255,0.6)',
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(10,22,40,0.85)',
        }}
      >
        <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,22,40,0.75)' }]} />
        <Animated.View style={[{ position: 'absolute', top: -h, width: 40 * u, height: h * 3 }, sweepStyle]}>
          <LinearGradient
            colors={['rgba(100,160,255,0.0)', 'rgba(200,230,255,0.55)', 'rgba(100,160,255,0.0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <View style={[StyleSheet.absoluteFill, { borderRadius: h / 2, borderWidth: 4, borderColor: 'rgba(100,160,255,0.15)' }]} pointerEvents="none" />
        <Text style={[styles.buttonText, { fontSize: 18 * u }]}>Enter BraveVoice</Text>
      </Pressable>
    </Animated.View>
  );
}

/* ================================================================== */
/* Main screen                                                         */
/* ================================================================== */

export default function SplashScreen({ onEnter }: SplashScreenProps) {
  const { width: W, height: H } = useWindowDimensions();
  const u = Math.min(Math.max(Math.min(W, H) / 390, 0.85), 1.9);
  const dims: Dims = { W, H, u };
  const reducedMotion = useReducedMotion();

  const [fontsLoaded] = useFonts({ FredokaOne_400Regular });

  const gate = useSharedValue(0);
  const shake = useSharedValue(0);
  const buttonIn = useSharedValue(0);
  const [gatesOpen, setGatesOpen] = useState(false);

  const markOpen = useCallback(() => setGatesOpen(true), []);

  useEffect(() => {
    if (!fontsLoaded) return;
    if (reducedMotion) {
      gate.value = 1;
      buttonIn.value = withTiming(1, { duration: 300 });
      setGatesOpen(true);
      return;
    }
    gate.value = withDelay(
      MOUNT_DELAY + GATE_DELAY,
      withTiming(1, { duration: GATE_DURATION, easing: GATE_EASING }, (finished) => {
        'worklet';
        if (finished) runOnJS(markOpen)();
      }),
    );
    shake.value = withDelay(
      MOUNT_DELAY + GATE_DELAY + SHAKE_AT,
      withSequence(
        withTiming(2, { duration: 50 }),
        withTiming(-2, { duration: 50 }),
        withTiming(1, { duration: 50 }),
        withTiming(0, { duration: 50 }),
      ),
    );
    buttonIn.value = withDelay(MOUNT_DELAY + GATE_DELAY + GATE_DURATION + BUTTON_AFTER_OPEN, withTiming(1, { duration: 800 }));
    return () => {
      cancelAnimation(gate);
      cancelAnimation(shake);
      cancelAnimation(buttonIn);
    };
  }, [fontsLoaded, reducedMotion, gate, shake, buttonIn, markOpen]);

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));
  const warmLightStyle = useAnimatedStyle(() => ({
    opacity: interpolate(gate.value, [0, 45 / GATE_ANGLE, 1], [0, 0.5, 1]),
  }));

  const floorTop = H * 0.56;

  if (!fontsLoaded) {
    return (
      <View style={[styles.loading, { width: W, height: H }]}>
        <LinearGradient colors={['#0A1628', C.facade]} style={StyleSheet.absoluteFill} />
        <View style={styles.loadingDotRow}>
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
      <Animated.View style={[StyleSheet.absoluteFill, shakeStyle]}>
        <BackgroundCanvas {...dims} />
        <BuildingFacade {...dims} />
        <Logo {...dims} />
        <Banner {...dims} side="left" />
        <Banner {...dims} side="right" />
        <CourtyardFloor {...dims} floorTop={floorTop} />
        <FloorReflection {...dims} floorTop={floorTop} />
        <GardenRing {...dims} centerY={H * 0.68} />
        <IceCrystalTree {...dims} baseY={H * 0.7} />
        <LanternRing {...dims} centerY={H * 0.68} />
        <FrontTreesCanvas {...dims} />

        <Animated.View style={[StyleSheet.absoluteFill, warmLightStyle]} pointerEvents="none">
          <Canvas style={StyleSheet.absoluteFill}>
            <Circle cx={W / 2} cy={H * 0.5} r={Math.max(W, H) * 0.6}>
              <SkRadialGradient
                c={vec(W / 2, H * 0.5)}
                r={Math.max(W, H) * 0.6}
                colors={['rgba(255,240,200,0.12)', 'rgba(255,240,200,0)']}
              />
            </Circle>
          </Canvas>
        </Animated.View>

        <Gate {...dims} side="left" progress={gate} />
        <Gate {...dims} side="right" progress={gate} />

        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          <SkRect x={0} y={0} width={W} height={H}>
            <SkRadialGradient
              c={vec(W / 2, H / 2)}
              r={Math.max(W, H) * 0.72}
              colors={['rgba(100,160,220,0)', 'rgba(100,160,220,0.04)', 'rgba(100,160,220,0.12)']}
              positions={[0, 0.65, 1]}
            />
          </SkRect>
        </Canvas>

        <SnowField {...dims} reduced={!!reducedMotion} />
      </Animated.View>

      {(gatesOpen || reducedMotion) && <EnterButton u={u} visible={buttonIn} onPress={onEnter} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: C.facade, overflow: 'hidden' },
  loading: { alignItems: 'center', justifyContent: 'center' },
  loadingDotRow: { flexDirection: 'row', gap: 10 },
  loadingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.logoGlow },
  logoText: {
    fontFamily: FONT,
    color: '#FFFFFF',
    letterSpacing: 2,
    textShadowOffset: { width: 0, height: 0 },
  },
  buttonText: { fontFamily: FONT, color: '#FFFFFF', letterSpacing: 0.5 },
});
