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
    return Array.from({ length: 9 }, (_, i) => {
      const a = (Math.PI * 2 * i) / 9 + 0.4;
      const r = rand(rnd, 1.1, 2.6);
      return {
        pos: [Math.cos(a) * r, 0, Math.sin(a) * r] as [number, number, number],
        height: rand(rnd, 1.9, 4.2),
        radius: rand(rnd, 0.42, 0.85),
        tilt: rand(rnd, -0.2, 0.2),
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
        <meshStandardMaterial color="#6E5236" roughness={0.9} flatShading />
      </mesh>
      <mesh geometry={snow} castShadow>
        <meshStandardMaterial color="#FFFFFF" roughness={0.68} flatShading />
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

      <pointLight ref={light} position={[0, 2.0, 0]} color={Palette.crystalBlue} intensity={46} distance={30} decay={2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[17, 17]} />
        <meshBasicMaterial map={glowTex} transparent opacity={0.5} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Circular garden ring in the marble */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <ringGeometry args={[5.4, 7.2, 48]} />
        <meshStandardMaterial color="#90CAF9" transparent opacity={0.22} roughness={0.4} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.016, 0]}>
        <ringGeometry args={[7.1, 7.3, 48]} />
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

/** The chrome owl roundel mounted on each gate leaf. */
function OwlMedallion({ radius }: { radius: number }) {
  const R = radius;
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[R, R, 0.16, 40]} />
        <meshStandardMaterial color="#C9D4DC" metalness={0.92} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0.09, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[R * 0.9, R * 0.99, 40]} />
        <meshStandardMaterial color="#8FA6B8" metalness={0.9} roughness={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[R * 0.74, R * 0.8, 40]} />
        <meshStandardMaterial
          color="#6FD0FF"
          emissive="#4FC3F7"
          emissiveIntensity={1.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.095, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[R * 0.72, 40]} />
        <meshStandardMaterial color="#E4EDF3" metalness={0.72} roughness={0.34} />
      </mesh>

      {/* Owl face: ringed eyes, beak and brow, dark against the bright disc */}
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <mesh position={[sx * R * 0.3, 0.105, -R * 0.06]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[R * 0.17, R * 0.25, 28]} />
            <meshStandardMaterial color="#2B3A47" side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[sx * R * 0.3, 0.105, -R * 0.06]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[R * 0.13, 24]} />
            <meshStandardMaterial color="#1C2733" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.105, R * 0.04]} rotation={[Math.PI / 2, 0, Math.PI]}>
        <circleGeometry args={[R * 0.12, 3]} />
        <meshStandardMaterial color="#2B3A47" />
      </mesh>
      <mesh position={[0, 0.105, -R * 0.32]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[R * 0.42, R * 0.48, 28, 1, Math.PI * 0.18, Math.PI * 0.64]} />
        <meshStandardMaterial color="#2B3A47" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/**
 * Both gate leaves. They are hinged on the OUTER edge at the gateposts and swing
 * toward the viewer, so the courtyard is framed by their lit inner faces.
 */
export function CastleGate({ animate = false }: { animate?: boolean }) {
  const wood = useMemo(() => {
    const t = woodTexture(256);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }, []);
  const leafRefs = useRef<Array<THREE.Group | null>>([]);

  useFrame((state) => {
    const t = animate ? Math.min(1, Math.max(0, (state.clock.elapsedTime - 2.3) / 1.8)) : 1;
    const eased = t * t * (3 - 2 * t);
    const angle = eased * (Math.PI * 0.42);
    // Left leaf opens counter-clockwise, right leaf clockwise, both toward +Z.
    if (leafRefs.current[0]) leafRefs.current[0].rotation.y = -angle;
    if (leafRefs.current[1]) leafRefs.current[1].rotation.y = angle;
  });

  const hingeX = GATE.gap + GATE.leafWidth;

  return (
    <group position={[0, 0, GATE.z]}>
      {[-1, 1].map((side, idx) => (
        <group
          key={side}
          position={[side * hingeX, 0, 0]}
          ref={(g) => {
            leafRefs.current[idx] = g;
          }}
        >
          {/* Leaf body reaches from the hinge back toward the centre line. */}
          <group position={[-side * (GATE.leafWidth / 2), GATE.height / 2, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[GATE.leafWidth, GATE.height, 0.5]} />
              <meshStandardMaterial map={wood} color="#C9A57A" roughness={0.78} metalness={0.05} />
            </mesh>

            {/* Heavy frame rails and stiles */}
            {[
              { p: [0, GATE.height / 2 - 0.42, 0.03], s: [GATE.leafWidth, 0.84, 0.58] },
              { p: [0, -GATE.height / 2 + 0.42, 0.03], s: [GATE.leafWidth, 0.84, 0.58] },
              { p: [0, 0, 0.03], s: [GATE.leafWidth, 0.5, 0.56] },
              { p: [GATE.leafWidth / 2 - 0.35, 0, 0.03], s: [0.7, GATE.height, 0.58] },
              { p: [-GATE.leafWidth / 2 + 0.35, 0, 0.03], s: [0.7, GATE.height, 0.58] },
            ].map((f, i) => (
              <mesh key={i} position={f.p as [number, number, number]} castShadow>
                <boxGeometry args={f.s as [number, number, number]} />
                <meshStandardMaterial color="#2A1809" roughness={0.9} />
              </mesh>
            ))}

            {/* Owl medallion on the inner face, turned to the courtyard */}
            <group position={[0, 0.9, -0.34]} rotation={[Math.PI / 2, 0, 0]}>
              <OwlMedallion radius={1.55} />
            </group>

            {/* Gold strap hinges on the outer edge */}
            {[-GATE.height * 0.34, 0, GATE.height * 0.34].map((y) => (
              <group key={y}>
                <mesh position={[side * (GATE.leafWidth / 2 - 0.2), y, 0.3]} castShadow>
                  <boxGeometry args={[GATE.leafWidth * 0.5, 0.75, 0.2]} />
                  <meshStandardMaterial color={Palette.gold} metalness={0.88} roughness={0.3} />
                </mesh>
                <mesh position={[side * (GATE.leafWidth / 2 - 0.05), y, 0.3]} castShadow>
                  <cylinderGeometry args={[0.24, 0.24, 1.1, 10]} />
                  <meshStandardMaterial color="#8B6914" metalness={0.9} roughness={0.35} />
                </mesh>
              </group>
            ))}

            {/* Snow on the top rail */}
            <mesh position={[0, GATE.height / 2 + 0.2, 0]}>
              <boxGeometry args={[GATE.leafWidth, 0.3, 0.8]} />
              <meshStandardMaterial color={Palette.snow} roughness={0.85} />
            </mesh>
          </group>
        </group>
      ))}

      {/* Stone gateposts carrying the hinges and the wall lanterns */}
      {[-1, 1].map((side) => (
        <group key={`post${side}`} position={[side * (hingeX + 0.9), 0, 0]}>
          <mesh position={[0, (GATE.height + 1) / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.8, GATE.height + 1, 1.8]} />
            <meshStandardMaterial color="#4A2E18" roughness={0.9} />
          </mesh>
          <mesh position={[0, GATE.height + 1.2, 0]}>
            <boxGeometry args={[2.2, 0.45, 2.2]} />
            <meshStandardMaterial color={Palette.snow} roughness={0.85} />
          </mesh>
          <mesh position={[-side * 1.05, GATE.height * 0.62, 0.6]} castShadow>
            <boxGeometry args={[0.6, 0.85, 0.5]} />
            <meshStandardMaterial color="#2A2A2A" roughness={0.7} metalness={0.3} />
          </mesh>
          <mesh position={[-side * 1.05, GATE.height * 0.62, 0.6]}>
            <boxGeometry args={[0.4, 0.58, 0.32]} />
            <meshBasicMaterial color="#FFB040" />
          </mesh>
          <pointLight
            position={[-side * 1.4, GATE.height * 0.62, 1.2]}
            color="#FFA83C"
            intensity={30}
            distance={18}
            decay={2}
          />
          {/* Blue star banner hanging beside the gate */}
          <group position={[-side * 1.0, GATE.height * 0.66, 1.05]}>
            <mesh>
              <planeGeometry args={[1.5, 5.2]} />
              <meshStandardMaterial color={Palette.banner} side={THREE.DoubleSide} roughness={0.85} />
            </mesh>
            <mesh position={[0, -3.05, 0]}>
              <coneGeometry args={[1.06, 0.95, 4]} />
              <meshStandardMaterial color="#16336E" side={THREE.DoubleSide} roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.4, 0.02]}>
              <ringGeometry args={[0.44, 0.56, 8]} />
              <meshBasicMaterial color="#EAF6FF" side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
            <mesh position={[0, 0.4, 0.02]} rotation={[0, 0, Math.PI / 8]}>
              <ringGeometry args={[0.14, 0.46, 8]} />
              <meshBasicMaterial color="#EAF6FF" side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
            <mesh position={[0, 2.68, 0]}>
              <boxGeometry args={[1.8, 0.18, 0.18]} />
              <meshStandardMaterial color={Palette.gold} metalness={0.85} roughness={0.3} />
            </mesh>
          </group>
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
