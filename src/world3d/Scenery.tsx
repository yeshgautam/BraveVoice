import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';

import { Palette } from '../game/palette';
import { CASTLE, GATE, ICE_TREE, LANTERNS, PLAZA_RADIUS, TREES } from '../game/world';
import {
  branchGeometry,
  branchSnowGeometry,
  courtyardTexture,
  mountainGeometry,
  mulberry32,
  radialGlowTexture,
  rand,
  woodTexture,
} from './geometry';

/* ------------------------------------------------------------------ */
/* Ground, sky dome and distant mountains                              */
/* ------------------------------------------------------------------ */

export function Ground() {
  const marble = useMemo(() => courtyardTexture(512), []);
  const snowTex = useMemo(() => {
    const t = courtyardTexture(64);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(24, 24);
    return t;
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[PLAZA_RADIUS, 64]} />
        <meshStandardMaterial map={marble} roughness={0.25} metalness={0.05} color="#FFFFFF" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]} receiveShadow>
        <circleGeometry args={[110, 48]} />
        <meshStandardMaterial map={snowTex} color={Palette.snow} roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[PLAZA_RADIUS - 0.5, PLAZA_RADIUS, 64]} />
        <meshStandardMaterial color={Palette.snow} roughness={0.85} />
      </mesh>
    </group>
  );
}

export function SkyDome() {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(170, 24, 16);
    const colors: number[] = [];
    const top = new THREE.Color(Palette.skyTop);
    const horizon = new THREE.Color(Palette.skyHorizon);
    const pos = g.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 170;
      const c = horizon.clone().lerp(top, Math.min(1, Math.max(0, y * 1.6 + 0.15)));
      colors.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return g;
  }, []);
  return (
    <mesh geometry={geo} scale={[1, 1, 1]}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} />
    </mesh>
  );
}

export function Mountains() {
  const geo = useMemo(() => mountainGeometry(12), []);
  return (
    <mesh geometry={geo} position={[0, -1, 0]}>
      <meshLambertMaterial vertexColors fog={false} />
    </mesh>
  );
}

export function Clouds() {
  const group = useRef<THREE.Group>(null);
  const puffs = useMemo(() => {
    const rnd = mulberry32(3);
    return Array.from({ length: 24 }, () => {
      const a = rand(rnd, 0, Math.PI * 2);
      const r = rand(rnd, 55, 105);
      return {
        pos: [Math.cos(a) * r, rand(rnd, 34, 58), Math.sin(a) * r] as [number, number, number],
        scale: [rand(rnd, 9, 18), rand(rnd, 3, 5.5), rand(rnd, 7, 13)] as [number, number, number],
      };
    });
  }, []);
  useFrame((_, dt) => {
    if (group.current) group.current.rotation.y += dt * 0.004;
  });
  return (
    <group ref={group}>
      {puffs.map((p, i) => (
        <mesh key={i} position={p.pos} scale={p.scale}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.85} fog={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Pine trees                                                          */
/* ------------------------------------------------------------------ */

export function PineForest() {
  const tiers = useMemo(
    () => [
      { y: 0.9, r: 1.5, h: 2.2, color: Palette.pineDeep },
      { y: 2.1, r: 1.15, h: 2.0, color: Palette.pineMid },
      { y: 3.2, r: 0.8, h: 1.8, color: Palette.pineDark },
    ],
    [],
  );
  return (
    <group>
      {TREES.map((t) => (
        <group key={t.seed} position={[t.x, 0, t.z]} scale={[t.scale, t.scale, t.scale]}>
          <mesh position={[0, 0.45, 0]} castShadow>
            <cylinderGeometry args={[0.16, 0.24, 0.9, 6]} />
            <meshStandardMaterial color={Palette.trunk} roughness={0.9} />
          </mesh>
          {tiers.map((tier, i) => (
            <group key={i}>
              <mesh position={[0, tier.y + tier.h / 2, 0]} castShadow>
                <coneGeometry args={[tier.r, tier.h, 8]} />
                <meshStandardMaterial color={tier.color} roughness={0.85} flatShading />
              </mesh>
              <mesh position={[0, tier.y + tier.h * 0.72, 0]}>
                <coneGeometry args={[tier.r * 0.62, tier.h * 0.55, 8]} />
                <meshStandardMaterial color={Palette.snow} roughness={0.7} flatShading />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Castle facade                                                       */
/* ------------------------------------------------------------------ */

function Icicles({ width, count, y, z, seed }: { width: number; count: number; y: number; z: number; seed: number }) {
  const spikes = useMemo(() => {
    const rnd = mulberry32(seed);
    return Array.from({ length: count }, (_, i) => ({
      x: -width / 2 + (width * (i + 0.5)) / count + rand(rnd, -0.15, 0.15),
      len: rand(rnd, 0.28, 0.8),
      r: rand(rnd, 0.05, 0.1),
    }));
  }, [width, count, seed]);
  return (
    <group position={[0, y, z]}>
      {spikes.map((s, i) => (
        <mesh key={i} position={[s.x, -s.len / 2, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[s.r, s.len, 5]} />
          <meshStandardMaterial color="#C8EBFF" transparent opacity={0.72} roughness={0.15} metalness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

export function Castle() {
  const { z, width, height, depth, doorWidth, doorHeight } = CASTLE;
  const wing = (width - doorWidth) / 2;
  const glass = useMemo(() => new THREE.Color(Palette.glass), []);
  const windows = useMemo(() => {
    const out: Array<{ x: number; y: number }> = [];
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 10; i++) {
        const x = -width / 2 + 1.6 + i * ((width - 3.2) / 9);
        if (Math.abs(x) < doorWidth / 2 + 0.8 && row === 0) continue;
        out.push({ x, y: 5.4 + row * 3.4 });
      }
    }
    return out;
  }, [width, doorWidth]);

  return (
    <group position={[0, 0, z]}>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (doorWidth / 2 + wing / 2), height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[wing, height, depth]} />
          <meshStandardMaterial color={Palette.facade} roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, height - 1.6, 0]} castShadow>
        <boxGeometry args={[doorWidth + 0.6, 3.2, depth]} />
        <meshStandardMaterial color={Palette.facade} roughness={0.7} />
      </mesh>

      {/* Dome */}
      <mesh position={[0, height + 0.4, 0]} castShadow>
        <sphereGeometry args={[6.4, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#13253F" roughness={0.55} metalness={0.15} />
      </mesh>
      <mesh position={[0, height + 0.5, 0]}>
        <sphereGeometry args={[6.45, 28, 14, 0, Math.PI * 2, 0, Math.PI / 3.1]} />
        <meshStandardMaterial color={Palette.snow} roughness={0.8} transparent opacity={0.92} />
      </mesh>
      <mesh position={[0, height + 0.42, 0]}>
        <torusGeometry args={[6.42, 0.06, 6, 40, Math.PI]} />
        <meshBasicMaterial color="#90CAF9" transparent opacity={0.4} />
      </mesh>

      {/* Columns flanking the entrance */}
      {[-1, 1].map((side) => (
        <group key={`col${side}`} position={[side * (doorWidth / 2 + 1.5), 0, depth / 2 + 0.4]}>
          <mesh position={[0, 4.2, 0]} castShadow>
            <cylinderGeometry args={[0.55, 0.62, 8.4, 16]} />
            <meshStandardMaterial color={Palette.facadeLight} roughness={0.5} metalness={0.15} />
          </mesh>
          <mesh position={[0, 8.55, 0]}>
            <sphereGeometry args={[0.72, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={Palette.snow} roughness={0.8} />
          </mesh>
          <Icicles width={1.3} count={3} y={8.35} z={0.5} seed={side > 0 ? 5 : 6} />
        </group>
      ))}

      {/* Warm interior seen through the doorway */}
      <mesh position={[0, doorHeight / 2, -depth / 2 + 0.05]}>
        <planeGeometry args={[doorWidth, doorHeight]} />
        <meshBasicMaterial color={Palette.interiorGlow} />
      </mesh>
      <pointLight position={[0, 2.6, -1]} color={Palette.interiorGlow} intensity={22} distance={16} decay={2} />

      {/* Glass window rows */}
      {windows.map((w, i) => (
        <mesh key={i} position={[w.x, w.y, depth / 2 + 0.03]}>
          <planeGeometry args={[1.25, 0.95]} />
          <meshBasicMaterial color={glass} transparent opacity={0.55} />
        </mesh>
      ))}
      <mesh position={[0, 8.9, depth / 2 + 0.02]}>
        <planeGeometry args={[width * 0.62, 1.9]} />
        <meshBasicMaterial color={Palette.interiorGlow} transparent opacity={0.4} />
      </mesh>

      {/* Balcony ledges with snow and icicles */}
      {[4.6, 8.0].map((y, i) => (
        <group key={y}>
          <mesh position={[0, y, depth / 2 + 0.25]} castShadow>
            <boxGeometry args={[width, 0.35, 0.9]} />
            <meshStandardMaterial color={Palette.facadeLight} roughness={0.6} />
          </mesh>
          <mesh position={[0, y + 0.26, depth / 2 + 0.25]}>
            <boxGeometry args={[width, 0.2, 1.0]} />
            <meshStandardMaterial color={Palette.snow} roughness={0.85} />
          </mesh>
          <Icicles width={width - 1} count={7} y={y - 0.18} z={depth / 2 + 0.6} seed={20 + i} />
        </group>
      ))}
      <Icicles width={11} count={9} y={height + 0.2} z={4.6} seed={31} />

      {/* Snow on the roofline */}
      <mesh position={[0, height + 0.1, 0]}>
        <boxGeometry args={[width + 0.4, 0.3, depth + 0.4]} />
        <meshStandardMaterial color={Palette.snow} roughness={0.85} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Banners                                                             */
/* ------------------------------------------------------------------ */

export function Banners() {
  const refs = useRef<Array<THREE.Group | null>>([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    refs.current.forEach((g, i) => {
      if (g) g.rotation.z = Math.sin(t * 0.8 + i * 1.7) * 0.026;
    });
  });
  const spots: Array<{ x: number; z: number; ry: number }> = [
    { x: -9.5, z: CASTLE.z + CASTLE.depth / 2 + 0.3, ry: 0 },
    { x: 9.5, z: CASTLE.z + CASTLE.depth / 2 + 0.3, ry: 0 },
    { x: -(GATE.gap + GATE.leafWidth + 0.6), z: GATE.z - 0.4, ry: Math.PI },
    { x: GATE.gap + GATE.leafWidth + 0.6, z: GATE.z - 0.4, ry: Math.PI },
  ];
  return (
    <group>
      {spots.map((s, i) => (
        <group
          key={i}
          position={[s.x, 9.4, s.z]}
          rotation={[0, s.ry, 0]}
          ref={(g) => {
            refs.current[i] = g;
          }}
        >
          <mesh position={[0, -2.2, 0]}>
            <planeGeometry args={[1.5, 4.4]} />
            <meshStandardMaterial color={Palette.banner} side={THREE.DoubleSide} roughness={0.8} />
          </mesh>
          <mesh position={[0, -4.55, 0.01]}>
            <coneGeometry args={[1.06, 0.7, 4]} />
            <meshStandardMaterial color="#162E6A" side={THREE.DoubleSide} roughness={0.8} />
          </mesh>
          <mesh position={[0, -2.2, 0.02]}>
            <ringGeometry args={[0.42, 0.52, 8]} />
            <meshBasicMaterial color="#C8E6FF" side={THREE.DoubleSide} transparent opacity={0.9} />
          </mesh>
          <mesh position={[0, -2.2, 0.02]} rotation={[0, 0, Math.PI / 8]}>
            <ringGeometry args={[0.16, 0.44, 8]} />
            <meshBasicMaterial color="#C8E6FF" side={THREE.DoubleSide} transparent opacity={0.75} />
          </mesh>
          <mesh position={[0, 0.08, 0]}>
            <boxGeometry args={[1.7, 0.16, 0.16]} />
            <meshStandardMaterial color={Palette.gold} metalness={0.7} roughness={0.35} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
