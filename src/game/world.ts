import { SOUND_SETS } from './words';

/** World units are metres. The player is 1.5 m tall and the plaza is ~40 m wide. */
export const PLAYER_HEIGHT = 1.5;
export const PLAYER_RADIUS = 0.45;
export const WALK_SPEED = 3.2;
export const RUN_SPEED = 5.6;
export const TURN_SPEED = 2.2;
export const ACCEL = 12;
export const FRICTION = 10;

/** The plaza is a disc; walking off it is blocked by the low garden wall. */
export const PLAZA_RADIUS = 21;

export type Collider =
  | { kind: 'circle'; x: number; z: number; r: number }
  | { kind: 'box'; x: number; z: number; hw: number; hd: number };

export type Station = {
  id: string;
  /** Index into SOUND_SETS. */
  setIndex: number;
  x: number;
  z: number;
  /** Facing, radians, so the sign faces the plaza centre. */
  rotation: number;
};

export type LanternSpot = { x: number; z: number; phase: number };
export type TreeSpot = { x: number; z: number; scale: number; seed: number };

const ring = (count: number, radius: number, offset = 0) =>
  Array.from({ length: count }, (_, i) => {
    const a = (Math.PI * 2 * i) / count + offset;
    return { x: Math.cos(a) * radius, z: Math.sin(a) * radius, angle: a };
  });

/** Six stone lanterns around the crystal tree, matching the splash art. */
export const LANTERNS: LanternSpot[] = ring(6, 6.2, Math.PI / 6).map((p, i) => ({
  x: p.x,
  z: p.z,
  phase: i * 0.37,
}));

/** Five speech stations sit further out, one per target sound. */
export const STATIONS: Station[] = ring(5, 13.5, -Math.PI / 2 + 0.55).map((p, i) => ({
  id: SOUND_SETS[i].id,
  setIndex: i,
  x: p.x,
  z: p.z,
  rotation: Math.atan2(-p.x, -p.z),
}));

/** Pines ring the plaza; two inner clusters frame the gate approach. */
export const TREES: TreeSpot[] = [
  ...ring(18, 24.5, 0.2).map((p, i) => ({ x: p.x, z: p.z, scale: 0.85 + ((i * 7) % 5) * 0.12, seed: 100 + i })),
  ...ring(11, 29, 0.55).map((p, i) => ({ x: p.x, z: p.z, scale: 1.1 + ((i * 3) % 4) * 0.15, seed: 200 + i })),
  { x: -7.5, z: 15.5, scale: 1.25, seed: 301 },
  { x: -10.5, z: 17.5, scale: 0.95, seed: 302 },
  { x: 7.5, z: 15.5, scale: 1.25, seed: 303 },
  { x: 10.5, z: 17.5, scale: 0.95, seed: 304 },
];

export const CASTLE = {
  /** Facade centre; the building wall runs along the north edge. */
  z: -22,
  width: 30,
  height: 13,
  depth: 8,
  doorWidth: 4.2,
  doorHeight: 5,
};

export const GATE = {
  z: 20,
  /** Each leaf's width. The opening between the two leaves is 2 * gap. */
  leafWidth: 6.5,
  height: 10,
  gap: 2.6,
};

export const ICE_TREE = { x: 0, z: 0, height: 6.4, crownRadius: 3.4 };

/** Static colliders. Stations and lanterns are added at runtime from the lists above. */
export const COLLIDERS: Collider[] = [
  { kind: 'circle', x: ICE_TREE.x, z: ICE_TREE.z, r: 2.4 },
  // Castle facade, split so the doorway stays walkable.
  { kind: 'box', x: -(CASTLE.doorWidth / 2 + CASTLE.width / 4), z: CASTLE.z, hw: CASTLE.width / 4, hd: CASTLE.depth / 2 },
  { kind: 'box', x: CASTLE.doorWidth / 2 + CASTLE.width / 4, z: CASTLE.z, hw: CASTLE.width / 4, hd: CASTLE.depth / 2 },
  ...LANTERNS.map((l) => ({ kind: 'circle' as const, x: l.x, z: l.z, r: 0.55 })),
  ...STATIONS.map((s) => ({ kind: 'circle' as const, x: s.x, z: s.z, r: 1.15 })),
  ...TREES.filter((t) => Math.hypot(t.x, t.z) < PLAZA_RADIUS + 3).map((t) => ({
    kind: 'circle' as const,
    x: t.x,
    z: t.z,
    r: 0.9 * t.scale,
  })),
];

/**
 * Where the player spawns: just inside the gate looking north at the castle.
 * Forward is (-sin yaw, -cos yaw), so yaw 0 faces -Z, where the castle stands.
 */
export const SPAWN = { x: 0, z: 17.5, yaw: 0 };

/** Distance at which a station offers its "press to speak" prompt. */
export const INTERACT_RANGE = 2.9;

/**
 * Slide-along-surface collision resolution. Takes a desired position and pushes
 * it out of every collider it overlaps, so the player never sticks on corners.
 */
export function resolveCollisions(x: number, z: number): { x: number; z: number } {
  let px = x;
  let pz = z;

  for (let pass = 0; pass < 3; pass++) {
    let moved = false;
    for (const c of COLLIDERS) {
      if (c.kind === 'circle') {
        const dx = px - c.x;
        const dz = pz - c.z;
        const dist = Math.hypot(dx, dz);
        const min = c.r + PLAYER_RADIUS;
        if (dist < min) {
          if (dist < 1e-4) {
            px = c.x + min;
          } else {
            px = c.x + (dx / dist) * min;
            pz = c.z + (dz / dist) * min;
          }
          moved = true;
        }
      } else {
        const dx = px - c.x;
        const dz = pz - c.z;
        const ox = c.hw + PLAYER_RADIUS - Math.abs(dx);
        const oz = c.hd + PLAYER_RADIUS - Math.abs(dz);
        if (ox > 0 && oz > 0) {
          if (ox < oz) px = c.x + Math.sign(dx || 1) * (c.hw + PLAYER_RADIUS);
          else pz = c.z + Math.sign(dz || 1) * (c.hd + PLAYER_RADIUS);
          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  // Keep the player inside the plaza, but let them walk out through the gate mouth.
  const dist = Math.hypot(px, pz);
  const inGateMouth = pz > 0 && Math.abs(px) < GATE.gap + 0.4;
  const limit = inGateMouth ? GATE.z - 0.8 : PLAZA_RADIUS - PLAYER_RADIUS;
  if (dist > limit) {
    px = (px / dist) * limit;
    pz = (pz / dist) * limit;
  }
  return { x: px, z: pz };
}

/** Nearest station within interact range, or null. */
export function nearestStation(x: number, z: number): { station: Station; distance: number } | null {
  let best: { station: Station; distance: number } | null = null;
  for (const station of STATIONS) {
    const d = Math.hypot(station.x - x, station.z - z);
    if (d <= INTERACT_RANGE && (!best || d < best.distance)) best = { station, distance: d };
  }
  return best;
}
