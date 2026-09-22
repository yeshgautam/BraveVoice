import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';

import { Palette } from '../game/palette';
import { GATE, ICE_TREE, LANTERNS, STATIONS } from '../game/world';
import { SOUND_SETS } from '../game/words';
import {
  branchGeometry,
  branchSnowGeometry,
  mulberry32,
  radialGlowTexture,
  rand,
  snowflakeTexture,
  woodTexture,
} from './geometry';

/* ------------------------------------------------------------------ */
/* Ice crystal tree                                                    */
/* ------------------------------------------------------------------ */

export function IceCrystalTree() {
  const branches = useMemo(() => branchGeometry(555, ICE_TREE.height, ICE_TREE.crownRadius), []);
  const snow = useMemo(() => branchSnowGeometry(555, ICE_TREE.height, ICE_TREE.crownRadius), []);
  const glowTex = useMemo(() => radialGlowTexture('#7DF9FF', '#003A66'), []);
  const crystals = useMemo(() => {
    const rnd = mulberry32(31);
    return Array.from({ length: 7 }, (_, i) => {
      const a = (Math.PI * 2 * i) / 7 + 0.4;
      const r = rand(rnd, 0.5, 1.5);
      return {
        pos: [Math.cos(a) * r, 0, Math.sin(a) * r] as [number, number, number],
        height: rand(rnd, 0.9, 2.1),
        radius: rand(rnd, 0.22, 0.45),
        tilt: rand(rnd, -0.16, 0.16),
      };
    });
  }, []);

  const glowGroup = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const crystalMat = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    const pulse = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * Math.PI);
    const scale = 1 + pulse * 0.03;
    if (glowGroup.current) glowGroup.current.scale.setScalar(scale);
    if (light.current) light.current.intensity = 18 + pulse * 16;
    if (crystalMat.current) crystalMat.current.emissiveIntensity = 0.6 + pulse * 0.4;
  });

  return (
    <group position={[ICE_TREE.x, 0, ICE_TREE.z]}>
      <mesh geometry={branches} castShadow>
        <meshStandardMaterial color="#D0E0E8" roughness={0.5} metalness={0.05} flatShading />
      </mesh>
      <mesh geometry={snow}>
        <meshStandardMaterial color={Palette.snow} roughness={0.75} flatShading />
      </mesh>

      <group ref={glowGroup}>
        {crystals.map((c, i) => (
          <mesh key={i} position={c.pos} rotation={[c.tilt, i * 0.9, c.tilt * 0.6]} castShadow>
            <cylinderGeometry args={[c.radius * 0.16, c.radius, c.height, 6]} />
            <meshStandardMaterial
              ref={i === 0 ? crystalMat : undefined}
              color={Palette.crystalBlue}
              emissive={Palette.crystalCore}
              emissiveIntensity={0.8}
              transparent
              opacity={0.82}
              roughness={0.1}
              metalness={0.25}
              flatShading
            />
          </mesh>
        ))}
      </group>

      <pointLight ref={light} position={[0, 1.4, 0]} color={Palette.crystalBlue} intensity={24} distance={22} decay={2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[11, 11]} />
        <meshBasicMaterial map={glowTex} transparent opacity={0.4} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Circular garden ring in the marble */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <ringGeometry args={[4.4, 5.8, 48]} />
        <meshStandardMaterial color="#90CAF9" transparent opacity={0.22} roughness={0.4} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.016, 0]}>
        <ringGeometry args={[5.75, 5.9, 48]} />
        <meshBasicMaterial color={Palette.compass} transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Stone lanterns                                                      */
/* ------------------------------------------------------------------ */

export function StoneLanterns() {
  const lights = useRef<Array<THREE.PointLight | null>>([]);
  const flames = useRef<Array<THREE.Mesh | null>>([]);
  const glowTex = useMemo(() => radialGlowTexture('#FFD080', '#6B3500'), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    LANTERNS.forEach((l, i) => {
      const f = 0.75 + 0.25 * (0.5 + 0.5 * Math.sin(t * (7 + i * 1.3) + l.phase * 9));
      const light = lights.current[i];
      const flame = flames.current[i];
      if (light) light.intensity = 5 + f * 6;
      if (flame) (flame.material as THREE.MeshBasicMaterial).opacity = 0.6 + f * 0.4;
    });
  });

  return (
    <group>
      {LANTERNS.map((l, i) => (
        <group key={i} position={[l.x, 0, l.z]}>
          <mesh position={[0, 0.3, 0]} castShadow>
            <boxGeometry args={[0.5, 0.6, 0.5]} />
            <meshStandardMaterial color={Palette.stone} roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.75, 0]} castShadow>
            <cylinderGeometry args={[0.13, 0.15, 0.5, 8]} />
            <meshStandardMaterial color="#6A7580" roughness={0.9} />
          </mesh>
          <mesh position={[0, 1.22, 0]} castShadow>
            <boxGeometry args={[0.42, 0.52, 0.42]} />
            <meshStandardMaterial color="#5C6670" roughness={0.85} />
          </mesh>
          <mesh
            position={[0, 1.22, 0]}
            ref={(m) => {
              flames.current[i] = m;
            }}
          >
            <boxGeometry args={[0.46, 0.34, 0.46]} />
            <meshBasicMaterial color={Palette.lanternGold} transparent opacity={0.85} />
          </mesh>
          <mesh position={[0, 1.58, 0]} castShadow>
            <coneGeometry args={[0.42, 0.34, 4]} />
            <meshStandardMaterial color="#6A7580" roughness={0.85} />
          </mesh>
          <mesh position={[0, 1.76, 0]}>
            <coneGeometry args={[0.34, 0.2, 4]} />
            <meshStandardMaterial color={Palette.snow} roughness={0.8} />
          </mesh>
          <pointLight
            ref={(p) => {
              lights.current[i] = p;
            }}
            position={[0, 1.3, 0]}
            color={Palette.lanternGold}
            intensity={8}
            distance={9}
            decay={2}
          />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
            <planeGeometry args={[4, 4]} />
            <meshBasicMaterial map={glowTex} transparent opacity={0.22} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Gate                                                                */
/* ------------------------------------------------------------------ */

function OwlMedallion({ radius }: { radius: number }) {
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[radius, radius, 0.12, 24]} />
        <meshStandardMaterial color="#14284F" roughness={0.5} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.07, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.86, radius, 24]} />
        <meshBasicMaterial color="#64A0DC" transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.07, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius * 0.6, radius * 0.68, 24]} />
        <meshBasicMaterial color="#64A0DC" transparent opacity={0.55} side={THREE.DoubleSide} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * radius * 0.3, 0.08, -radius * 0.12]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[radius * 0.24, 16]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
          <mesh position={[s * radius * 0.3, 0.09, -radius * 0.12]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[radius * 0.1, 12]} />
            <meshBasicMaterial color="#08111F" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.09, radius * 0.16]} rotation={[Math.PI / 2, 0, Math.PI]}>
        <coneGeometry args={[radius * 0.13, radius * 0.24, 3]} />
        <meshBasicMaterial color="#FFB040" />
      </mesh>
    </group>
  );
}

/** Both gate leaves, hinged open so the player walks in through the middle. */
export function CastleGate() {
  const wood = useMemo(() => {
    const t = woodTexture(256);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }, []);
  const leafRefs = useRef<Array<THREE.Group | null>>([]);

  useFrame((state) => {
    // Gates ease open over the first two seconds of play, then settle.
    const t = Math.min(1, Math.max(0, (state.clock.elapsedTime - 0.4) / 1.8));
    const eased = t * t * (3 - 2 * t);
    const angle = eased * (Math.PI * 0.44);
    if (leafRefs.current[0]) leafRefs.current[0].rotation.y = angle;
    if (leafRefs.current[1]) leafRefs.current[1].rotation.y = -angle;
  });

  return (
    <group position={[0, 0, GATE.z]}>
      {[-1, 1].map((side, idx) => (
        <group
          key={side}
          position={[side * GATE.gap, 0, 0]}
          ref={(g) => {
            leafRefs.current[idx] = g;
          }}
        >
          <group position={[(side * GATE.leafWidth) / 2, GATE.height / 2, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[GATE.leafWidth, GATE.height, 0.45]} />
              <meshStandardMaterial map={wood} color="#FFFFFF" roughness={0.85} />
            </mesh>
            {/* Frame */}
            {[
              { p: [0, GATE.height / 2 - 0.3, 0.02], s: [GATE.leafWidth, 0.6, 0.55] },
              { p: [0, -GATE.height / 2 + 0.3, 0.02], s: [GATE.leafWidth, 0.6, 0.55] },
              { p: [(-side * GATE.leafWidth) / 2 + side * 0.3, 0, 0.02], s: [0.6, GATE.height, 0.55] },
              { p: [(side * GATE.leafWidth) / 2 - side * 0.3, 0, 0.02], s: [0.6, GATE.height, 0.55] },
            ].map((f, i) => (
              <mesh key={i} position={f.p as [number, number, number]} castShadow>
                <boxGeometry args={f.s as [number, number, number]} />
                <meshStandardMaterial color="#1A0E07" roughness={0.9} />
              </mesh>
            ))}
            {/* Owl medallion facing the courtyard */}
            <group position={[0, 0.6, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
              <OwlMedallion radius={1.15} />
            </group>
            {/* Gold hinges on the outer edge */}
            {[-3, 0, 3].map((y) => (
              <mesh key={y} position={[(-side * GATE.leafWidth) / 2 + side * 0.25, y, 0.3]} castShadow>
                <boxGeometry args={[0.5, 1.2, 0.18]} />
                <meshStandardMaterial color={Palette.gold} metalness={0.85} roughness={0.28} />
              </mesh>
            ))}
            {/* Snow on the top rail */}
            <mesh position={[0, GATE.height / 2 + 0.12, 0]}>
              <boxGeometry args={[GATE.leafWidth, 0.22, 0.7]} />
              <meshStandardMaterial color={Palette.snow} roughness={0.85} />
            </mesh>
          </group>
        </group>
      ))}

      {/* Stone gateposts with wall lanterns */}
      {[-1, 1].map((side) => (
        <group key={`post${side}`} position={[side * (GATE.gap + GATE.leafWidth + 0.6), 0, 0]}>
          <mesh position={[0, GATE.height / 2, 0]} castShadow>
            <boxGeometry args={[1.4, GATE.height + 1, 1.4]} />
            <meshStandardMaterial color="#3A2410" roughness={0.9} />
          </mesh>
          <mesh position={[0, GATE.height + 0.6, 0]}>
            <boxGeometry args={[1.7, 0.35, 1.7]} />
            <meshStandardMaterial color={Palette.snow} roughness={0.85} />
          </mesh>
          <mesh position={[-side * 0.85, 6.4, 0]} castShadow>
            <boxGeometry args={[0.5, 0.7, 0.4]} />
            <meshStandardMaterial color="#2A2A2A" roughness={0.7} metalness={0.3} />
          </mesh>
          <mesh position={[-side * 0.85, 6.4, 0]}>
            <boxGeometry args={[0.32, 0.46, 0.26]} />
            <meshBasicMaterial color="#FFB040" />
          </mesh>
          <pointLight position={[-side * 1.1, 6.4, 0]} color="#FFA83C" intensity={9} distance={12} decay={2} />
        </group>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Speech stations                                                     */
/* ------------------------------------------------------------------ */

export function SpeechStations({
  progress,
  highlightId,
}: {
  progress: Record<string, { cleared: number; stars: number }>;
  highlightId: string | null;
}) {
  const crystals = useRef<Array<THREE.Mesh | null>>([]);
  const lights = useRef<Array<THREE.PointLight | null>>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    STATIONS.forEach((s, i) => {
      const done = (progress[s.id]?.cleared ?? 0) >= SOUND_SETS[s.setIndex].words.length;
      const isNear = highlightId === s.id;
      const bob = Math.sin(t * 1.6 + i) * 0.1;
      const mesh = crystals.current[i];
      if (mesh) {
        mesh.position.y = 1.85 + bob;
        mesh.rotation.y = t * 0.6 + i;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = (done ? 1.4 : 0.55) + (isNear ? 0.7 : 0) + Math.sin(t * 3 + i) * 0.12;
      }
      const light = lights.current[i];
      if (light) light.intensity = (done ? 16 : 7) + (isNear ? 12 : 0);
    });
  });

  return (
    <group>
      {STATIONS.map((s, i) => {
        const done = (progress[s.id]?.cleared ?? 0) >= SOUND_SETS[s.setIndex].words.length;
        const colour = done ? '#7DF9FF' : Palette.crystalBlue;
        return (
          <group key={s.id} position={[s.x, 0, s.z]} rotation={[0, s.rotation, 0]}>
            <mesh position={[0, 0.16, 0]} receiveShadow castShadow>
              <cylinderGeometry args={[1.05, 1.2, 0.32, 12]} />
              <meshStandardMaterial color="#8D9AA8" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.34, 0]}>
              <cylinderGeometry args={[1.0, 1.05, 0.12, 12]} />
              <meshStandardMaterial color={Palette.snow} roughness={0.85} />
            </mesh>
            <mesh position={[0, 1.0, 0]} castShadow>
              <cylinderGeometry args={[0.42, 0.55, 1.3, 8]} />
              <meshStandardMaterial color="#6E7C8A" roughness={0.85} />
            </mesh>
            <mesh
              position={[0, 1.85, 0]}
              castShadow
              ref={(m) => {
                crystals.current[i] = m;
              }}
            >
              <octahedronGeometry args={[0.55, 0]} />
              <meshStandardMaterial
                color={colour}
                emissive={colour}
                emissiveIntensity={0.8}
                transparent
                opacity={0.9}
                roughness={0.1}
                metalness={0.3}
                flatShading
              />
            </mesh>
            <pointLight
              ref={(p) => {
                lights.current[i] = p;
              }}
              position={[0, 1.9, 0]}
              color={colour}
              intensity={8}
              distance={11}
              decay={2}
            />
            {/* Progress pips around the base, one per word in the set */}
            {SOUND_SETS[s.setIndex].words.map((_, w) => {
              const a = (Math.PI * 2 * w) / SOUND_SETS[s.setIndex].words.length;
              const lit = (progress[s.id]?.cleared ?? 0) > w;
              return (
                <mesh key={w} position={[Math.cos(a) * 0.82, 0.46, Math.sin(a) * 0.82]}>
                  <sphereGeometry args={[0.11, 8, 6]} />
                  <meshStandardMaterial
                    color={lit ? '#FFD080' : '#4A5A6A'}
                    emissive={lit ? '#FFD080' : '#000000'}
                    emissiveIntensity={lit ? 1.1 : 0}
                  />
                </mesh>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Falling snow                                                        */
/* ------------------------------------------------------------------ */

export function Snowfall({ count = 900 }: { count?: number }) {
  const mesh = useRef<THREE.Points>(null);
  const sprite = useMemo(() => snowflakeTexture(32), []);
  const { geometry, speeds } = useMemo(() => {
    const rnd = mulberry32(808);
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const vel = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = rand(rnd, -45, 45);
      positions[i * 3 + 1] = rand(rnd, 0, 34);
      positions[i * 3 + 2] = rand(rnd, -45, 45);
      sizes[i] = rand(rnd, 0.06, 0.2);
      vel[i * 2] = rand(rnd, 1.1, 3.0);
      vel[i * 2 + 1] = rand(rnd, -0.5, 0.5);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    return { geometry: geo, speeds: vel };
  }, [count]);

  useFrame((_, dt) => {
    const points = mesh.current;
    if (!points) return;
    const attr = points.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const step = Math.min(dt, 0.05);
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] -= speeds[i * 2] * step;
      arr[i * 3] += speeds[i * 2 + 1] * step;
      if (arr[i * 3 + 1] < -0.5) {
        arr[i * 3 + 1] = 34;
        arr[i * 3] = (Math.random() - 0.5) * 90;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 90;
      }
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={mesh} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        map={sprite}
        color="#FFFFFF"
        size={0.2}
        sizeAttenuation
        transparent
        alphaTest={0.02}
        opacity={0.9}
        depthWrite={false}
      />
    </points>
  );
}
