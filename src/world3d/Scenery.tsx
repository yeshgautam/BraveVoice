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
  const snowTex = useMemo(() => {
    const t = courtyardTexture(64);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(24, 24);
    return t;
  }, []);
  return (
    <group>
      {/* Snowfield beyond the plaza. The plaza disc itself is the mirror floor. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, 0]} receiveShadow>
        <circleGeometry args={[110, 48]} />
        <meshStandardMaterial map={snowTex} color={Palette.snow} roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]}>
        <ringGeometry args={[PLAZA_RADIUS - 0.6, PLAZA_RADIUS + 0.9, 64]} />
        <meshStandardMaterial color={Palette.snow} roughness={0.85} />
      </mesh>
    </group>
  );
}

export function SkyDome() {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(190, 32, 20);
    const colors: number[] = [];
    const zenith = new THREE.Color('#5FA8DC');
    const mid = new THREE.Color(Palette.skyTop);
    const horizon = new THREE.Color('#E4F1FB');
    const pos = g.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const h = Math.max(0, Math.min(1, pos.getY(i) / 190 + 0.08));
      const c = h < 0.35 ? horizon.clone().lerp(mid, h / 0.35) : mid.clone().lerp(zenith, (h - 0.35) / 0.65);
      colors.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return g;
  }, []);
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} toneMapped={false} />
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

/** Warm window grid on a facade panel, matching the lit glass in the reference. */
function WindowWall({
  width,
  rows,
  columns,
  y,
  z,
  rotation = 0,
  x = 0,
}: {
  width: number;
  rows: number;
  columns: number;
  y: number;
  z: number;
  rotation?: number;
  x?: number;
}) {
  const cells = useMemo(() => {
    const rnd = mulberry32(Math.round(width * 31 + rows * 7 + columns));
    const out: Array<{ x: number; y: number; w: number; h: number; warm: number }> = [];
    const cw = (width - 0.6) / columns;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        out.push({
          x: -width / 2 + 0.3 + cw * (c + 0.5),
          y: r * 3.1,
          w: cw * 0.86,
          h: 2.1,
          warm: rand(rnd, 0.45, 1),
        });
      }
    }
    return out;
  }, [width, rows, columns]);

  return (
    <group position={[x, y, z]} rotation={[0, rotation, 0]}>
      {cells.map((c, i) => (
        <group key={i} position={[c.x, c.y, 0]}>
          <mesh>
            <planeGeometry args={[c.w, c.h]} />
            <meshBasicMaterial color="#FFD9A0" toneMapped={false} transparent opacity={0.55 + c.warm * 0.45} />
          </mesh>
          <mesh position={[0, -c.h * 0.2, 0.01]}>
            <planeGeometry args={[c.w * 0.78, c.h * 0.44]} />
            <meshBasicMaterial color="#FFF2D6" toneMapped={false} transparent opacity={0.5 + c.warm * 0.5} />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <planeGeometry args={[c.w + 0.14, c.h + 0.14]} />
            <meshBasicMaterial color="#1B3556" transparent opacity={0.55} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** The arched sign over the entrance: owl roundel plus the glowing wordmark. */
function SignBoard({ width, height, y, z }: { width: number; height: number; y: number; z: number }) {
  return (
    <group position={[0, y, z]}>
      <mesh>
        <boxGeometry args={[width, height, 0.5]} />
        <meshStandardMaterial color="#0B1A30" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, height / 2 - 0.1, 0]}>
        <cylinderGeometry args={[width / 2, width / 2, 0.52, 28, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color="#0B1A30" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, height / 2 + 0.25, 0]}>
        <cylinderGeometry args={[width / 2 + 0.25, width / 2 + 0.25, 0.7, 28, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color={Palette.snow} roughness={0.85} />
      </mesh>
      {/* Owl roundel */}
      <group position={[0, height * 0.18, 0.28]}>
        <mesh>
          <circleGeometry args={[1.5, 32]} />
          <meshBasicMaterial color="#DFF3FF" />
        </mesh>
        <mesh position={[0, 0, 0.01]}>
          <ringGeometry args={[1.28, 1.5, 32]} />
          <meshBasicMaterial color="#8FD4FF" />
        </mesh>
        {[-1, 1].map((sx) => (
          <group key={sx}>
            <mesh position={[sx * 0.52, 0.12, 0.02]}>
              <circleGeometry args={[0.44, 20]} />
              <meshBasicMaterial color="#0B1A30" />
            </mesh>
            <mesh position={[sx * 0.52, 0.12, 0.03]}>
              <circleGeometry args={[0.2, 16]} />
              <meshBasicMaterial color="#DFF3FF" />
            </mesh>
          </group>
        ))}
        <mesh position={[0, -0.28, 0.02]} rotation={[0, 0, Math.PI]}>
          <circleGeometry args={[0.24, 3]} />
          <meshBasicMaterial color="#0B1A30" />
        </mesh>
      </group>
      <pointLight position={[0, height * 0.1, 2]} color={Palette.logoGlow} intensity={16} distance={14} decay={2} />
    </group>
  );
}

export function Castle() {
  const { z, width, height, depth, doorWidth, doorHeight, wingRadius } = CASTLE;
  const wing = (width - doorWidth) / 2;

  return (
    <group position={[0, 0, z]}>
      {/* Main body, split so the entrance stays open */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (doorWidth / 2 + wing / 2), 0, 0]}>
          <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[wing, height, depth]} />
            <meshStandardMaterial color={Palette.facade} roughness={0.65} metalness={0.12} />
          </mesh>
          {/* Two storeys of lit glass facing the courtyard */}
          <WindowWall width={wing - 1.2} rows={2} columns={4} y={4.6} z={depth / 2 + 0.06} />
          {/* Snow on the parapet */}
          <mesh position={[0, height + 0.18, 0]}>
            <boxGeometry args={[wing + 0.5, 0.42, depth + 0.5]} />
            <meshStandardMaterial color={Palette.snow} roughness={0.85} />
          </mesh>
          <Icicles width={wing - 1} count={7} y={height - 0.1} z={depth / 2 + 0.35} seed={side > 0 ? 21 : 22} />
        </group>
      ))}

      {/* Rounded glass tower wings capping each end */}
      {[-1, 1].map((side) => (
        <group key={`tower${side}`} position={[side * (width / 2 - 0.4), 0, depth / 2 - wingRadius * 0.45]}>
          <mesh position={[0, height / 2 - 0.6, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[wingRadius, wingRadius, height - 1.2, 26, 1, false, 0, Math.PI * 1.15]} />
            <meshStandardMaterial
              color={Palette.facade}
              roughness={0.5}
              metalness={0.2}
              side={THREE.DoubleSide}
            />
          </mesh>
          {[3.4, 7.0, 10.4].map((wy, i) => (
            <group key={wy}>
              {Array.from({ length: 5 }, (_, k) => {
                const a = Math.PI * 0.12 + (Math.PI * 0.82 * k) / 4;
                return (
                  <mesh
                    key={k}
                    position={[Math.cos(a) * (wingRadius + 0.04), wy, Math.sin(a) * (wingRadius + 0.04)]}
                    rotation={[0, a + Math.PI / 2, 0]}
                  >
                    <planeGeometry args={[wingRadius * 0.62, 2.2]} />
                    <meshBasicMaterial
                      color="#FFD9A0"
                      toneMapped={false}
                      transparent
                      opacity={0.6 + ((i + k) % 3) * 0.13}
                    />
                  </mesh>
                );
              })}
              <mesh position={[0, wy + 1.4, 0]}>
                <torusGeometry args={[wingRadius + 0.08, 0.1, 6, 30, Math.PI * 1.15]} />
                <meshStandardMaterial color={Palette.facadeLight} roughness={0.6} />
              </mesh>
            </group>
          ))}
          <mesh position={[0, height - 0.5, 0]}>
            <cylinderGeometry args={[wingRadius + 0.35, wingRadius + 0.35, 0.5, 26, 1, false, 0, Math.PI * 1.15]} />
            <meshStandardMaterial color={Palette.snow} roughness={0.85} side={THREE.DoubleSide} />
          </mesh>
          <Icicles width={wingRadius * 1.6} count={6} y={height - 0.8} z={wingRadius * 0.7} seed={side > 0 ? 41 : 42} />
          <pointLight position={[0, 6, wingRadius * 0.4]} color={Palette.interiorGlow} intensity={14} distance={18} decay={2} />
        </group>
      ))}

      {/* Entrance: tall warm glass under the sign */}
      <mesh position={[0, doorHeight / 2, depth / 2 - 0.1]}>
        <planeGeometry args={[doorWidth, doorHeight]} />
        <meshBasicMaterial color="#FFE9C4" toneMapped={false} />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * doorWidth * 0.17, doorHeight * 0.42, depth / 2 - 0.05]}>
          <planeGeometry args={[doorWidth * 0.26, doorHeight * 0.74]} />
          <meshBasicMaterial color="#FFF6E2" transparent opacity={0.85} />
        </mesh>
      ))}
      <mesh position={[0, doorHeight + 0.2, depth / 2 - 0.05]}>
        <planeGeometry args={[doorWidth + 0.5, 0.35]} />
        <meshBasicMaterial color={Palette.facadeLight} />
      </mesh>
      <pointLight position={[0, 3.4, depth / 2 + 2]} color={Palette.interiorGlow} intensity={55} distance={26} decay={2} />

      {/* Columns flanking the entrance */}
      {[-1, 1].map((side) => (
        <group key={`col${side}`} position={[side * (doorWidth / 2 + 0.9), 0, depth / 2 + 0.7]}>
          <mesh position={[0, height * 0.42, 0]} castShadow>
            <cylinderGeometry args={[0.62, 0.7, height * 0.84, 18]} />
            <meshStandardMaterial color={Palette.facadeLight} roughness={0.45} metalness={0.2} />
          </mesh>
          <mesh position={[0, height * 0.85, 0]}>
            <sphereGeometry args={[0.82, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={Palette.snow} roughness={0.8} />
          </mesh>
        </group>
      ))}

      <SignBoard width={doorWidth + 3.4} height={4.4} y={height - 1.6} z={depth / 2 + 0.5} />

      {/* Dome behind the sign */}
      <mesh position={[0, height + 0.2, 0]} castShadow>
        <sphereGeometry args={[7.2, 30, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#13253F" roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[0, height + 0.32, 0]}>
        <sphereGeometry args={[7.26, 30, 14, 0, Math.PI * 2, 0, Math.PI / 3.4]} />
        <meshStandardMaterial color={Palette.snow} roughness={0.82} transparent opacity={0.94} />
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
