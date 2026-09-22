import * as THREE from 'three';

/** Deterministic PRNG so the world looks identical on every launch. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rand = (rnd: () => number, min: number, max: number) => min + rnd() * (max - min);

/** A six-sided crystal prism that tapers to a point, used for the ice tree. */
export function crystalGeometry(height: number, radius: number): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(radius * 0.18, radius, height, 6, 1);
  geo.translate(0, height / 2, 0);
  return geo;
}

/** Cached shared geometries: creating these once keeps draw setup cheap. */
export const SHARED = {
  pineTier: new THREE.ConeGeometry(1, 1, 8),
  trunk: new THREE.CylinderGeometry(0.1, 0.14, 1, 6),
  sphere: new THREE.SphereGeometry(1, 12, 10),
  box: new THREE.BoxGeometry(1, 1, 1),
  cylinder: new THREE.CylinderGeometry(1, 1, 1, 16),
  lowCylinder: new THREE.CylinderGeometry(1, 1, 1, 8),
  plane: new THREE.PlaneGeometry(1, 1),
  icicle: new THREE.ConeGeometry(1, 1, 5),
};

/** Mountain ridge built as a single ring of jagged peaks far beyond the plaza. */
export function mountainGeometry(seed: number): THREE.BufferGeometry {
  const rnd = mulberry32(seed);
  const segments = 72;
  const radius = 120;
  const positions: number[] = [];
  const colors: number[] = [];
  const snow = new THREE.Color('#EEF4FA');
  const rock = new THREE.Color('#8899AA');
  const heights: number[] = [];
  for (let i = 0; i < segments; i++) {
    const base = 22 + Math.sin(i * 0.7) * 10 + Math.cos(i * 0.31) * 8;
    heights.push(base + rand(rnd, -6, 14));
  }
  for (let i = 0; i < segments; i++) {
    const a0 = (Math.PI * 2 * i) / segments;
    const a1 = (Math.PI * 2 * (i + 1)) / segments;
    const h0 = heights[i];
    const h1 = heights[(i + 1) % segments];
    const x0 = Math.cos(a0) * radius;
    const z0 = Math.sin(a0) * radius;
    const x1 = Math.cos(a1) * radius;
    const z1 = Math.sin(a1) * radius;
    positions.push(x0, 0, z0, x1, 0, z1, x0, h0, z0);
    positions.push(x1, 0, z1, x1, h1, z1, x0, h0, z0);
    const c0 = rock.clone().lerp(snow, Math.min(1, Math.max(0, (h0 - 24) / 14)));
    const c1 = rock.clone().lerp(snow, Math.min(1, Math.max(0, (h1 - 24) / 14)));
    const cb = rock.clone().multiplyScalar(0.8);
    colors.push(cb.r, cb.g, cb.b, cb.r, cb.g, cb.b, c0.r, c0.g, c0.b);
    colors.push(cb.r, cb.g, cb.b, c1.r, c1.g, c1.b, c0.r, c0.g, c0.b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

/** Bare winter branches for the ice tree, as a merged tube-free line mesh. */
export function branchGeometry(seed: number, height: number, spread: number): THREE.BufferGeometry {
  const rnd = mulberry32(seed);
  const parts: THREE.BufferGeometry[] = [];
  const trunkTop = height * 0.52;

  const addLimb = (
    from: THREE.Vector3,
    dir: THREE.Vector3,
    length: number,
    thickness: number,
    depth: number,
  ) => {
    const to = from.clone().addScaledVector(dir, length);
    const geo = new THREE.CylinderGeometry(thickness * 0.55, thickness, length, depth > 1 ? 4 : 6);
    const mid = from.clone().lerp(to, 0.5);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    geo.applyQuaternion(quat);
    geo.translate(mid.x, mid.y, mid.z);
    parts.push(geo);
    if (depth >= 3) return;
    const children = depth === 0 ? 3 : 2;
    for (let i = 0; i < children; i++) {
      const next = dir
        .clone()
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), rand(rnd, -0.9, 0.9))
        .applyAxisAngle(new THREE.Vector3(1, 0, 0), rand(rnd, -0.6, 0.7))
        .normalize();
      next.y = Math.max(0.15, next.y);
      addLimb(to, next.normalize(), length * rand(rnd, 0.5, 0.72), thickness * 0.62, depth + 1);
    }
  };

  const trunk = new THREE.CylinderGeometry(0.3, 0.55, trunkTop, 9);
  trunk.translate(0, trunkTop / 2, 0);
  parts.push(trunk);
  const flare = new THREE.CylinderGeometry(0.55, 1.05, trunkTop * 0.22, 9);
  flare.translate(0, trunkTop * 0.11, 0);
  parts.push(flare);

  const majorAngles = [30, 45, 60, 120, 135, 150];
  majorAngles.forEach((deg, i) => {
    const around = (Math.PI * 2 * i) / majorAngles.length + rand(rnd, -0.2, 0.2);
    const elev = (deg * Math.PI) / 180;
    const dir = new THREE.Vector3(Math.cos(around) * Math.cos(elev), Math.sin(elev), Math.sin(around) * Math.cos(elev)).normalize();
    addLimb(new THREE.Vector3(0, trunkTop, 0), dir, spread * rand(rnd, 0.5, 0.72), 0.26, 0);
  });

  return mergeGeometries(parts);
}

/**
 * The frosted crown. Built as a ring of overlapping lobes rather than one dome,
 * so the canopy has the wide, sculpted silhouette of the reference tree instead
 * of reading as a single cloud.
 */
export function branchSnowGeometry(seed: number, height: number, spread: number): THREE.BufferGeometry {
  const rnd = mulberry32(seed + 17);
  const parts: THREE.BufferGeometry[] = [];
  const crownY = height * 0.62;

  // Six major lobes around the crown, each a flattened cluster.
  const lobes = 6;
  for (let l = 0; l < lobes; l++) {
    const a = (Math.PI * 2 * l) / lobes + rand(rnd, -0.18, 0.18);
    const lobeR = spread * rand(rnd, 0.62, 0.86);
    const lobeY = crownY + rand(rnd, -0.5, 1.5);
    const lobeSize = spread * rand(rnd, 0.34, 0.46);
    const cx = Math.cos(a) * lobeR;
    const cz = Math.sin(a) * lobeR;
    for (let i = 0; i < 16; i++) {
      const ia = rand(rnd, 0, Math.PI * 2);
      const ir = rand(rnd, 0, lobeSize);
      const blob = new THREE.SphereGeometry(rand(rnd, 0.5, 0.95), 8, 6);
      blob.scale(1.2, 0.72, 1.2);
      blob.translate(
        cx + Math.cos(ia) * ir,
        lobeY + rand(rnd, -0.5, 0.55) - ir * 0.25,
        cz + Math.sin(ia) * ir,
      );
      parts.push(blob);
    }
  }

  // Raised centre mass so the crown peaks above the lobes.
  for (let i = 0; i < 26; i++) {
    const a = rand(rnd, 0, Math.PI * 2);
    const r = rand(rnd, 0, spread * 0.42);
    const blob = new THREE.SphereGeometry(rand(rnd, 0.55, 1.0), 8, 6);
    blob.scale(1.15, 0.78, 1.15);
    blob.translate(Math.cos(a) * r, crownY + rand(rnd, 0.7, 2.1) - r * 0.2, Math.sin(a) * r);
    parts.push(blob);
  }

  // Snow resting along the lower limbs, tying the crown to the branches.
  for (let i = 0; i < 34; i++) {
    const a = rand(rnd, 0, Math.PI * 2);
    const r = rand(rnd, spread * 0.3, spread * 0.92);
    const blob = new THREE.SphereGeometry(rand(rnd, 0.3, 0.6), 7, 5);
    blob.scale(1.5, 0.5, 1.5);
    blob.translate(Math.cos(a) * r, crownY - rand(rnd, 0.8, 2.4), Math.sin(a) * r);
    parts.push(blob);
  }

  return mergeGeometries(parts);
}

/** Minimal geometry merge: avoids pulling in the three/examples addon. */
export function mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  // De-index first: toNonIndexed() expands the vertex count, so the buffers must
  // be sized from the expanded geometry rather than the original.
  const flattened = geometries.map((source) => {
    const geo = source.index ? source.toNonIndexed() : source;
    if (!geo.getAttribute('normal')) geo.computeVertexNormals();
    return { geo, source };
  });

  let vertexCount = 0;
  for (const { geo } of flattened) vertexCount += geo.getAttribute('position').count;

  const position = new Float32Array(vertexCount * 3);
  const normal = new Float32Array(vertexCount * 3);
  const index = new Uint32Array(vertexCount);
  let vOffset = 0;

  for (const { geo, source } of flattened) {
    const p = geo.getAttribute('position');
    const n = geo.getAttribute('normal');
    position.set(p.array as Float32Array, vOffset * 3);
    normal.set(n.array as Float32Array, vOffset * 3);
    for (let i = 0; i < p.count; i++) index[vOffset + i] = vOffset + i;
    vOffset += p.count;
    if (geo !== source) geo.dispose();
    source.dispose();
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(position, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  merged.setIndex(new THREE.BufferAttribute(index, 1));
  return merged;
}

/** Radial gradient texture used for glows, lantern halos and the ground pool. */
export function radialGlowTexture(inner: string, outer: string, size = 128): THREE.Texture {
  const data = new Uint8Array(size * size * 4);
  const ci = new THREE.Color(inner);
  const co = new THREE.Color(outer);
  const half = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.min(1, Math.hypot(x - half, y - half) / half);
      const t = d * d;
      const c = ci.clone().lerp(co, t);
      const i = (y * size + x) * 4;
      data[i] = Math.round(c.r * 255);
      data[i + 1] = Math.round(c.g * 255);
      data[i + 2] = Math.round(c.b * 255);
      data[i + 3] = Math.round(255 * (1 - t));
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

/** Marble floor texture with faint veins and the compass rose baked in. */
export function courtyardTexture(size = 512): THREE.Texture {
  const data = new Uint8Array(size * size * 4);
  const rnd = mulberry32(2024);
  const base = new THREE.Color('#B8C8D8');
  const tint = new THREE.Color('#A0B8CC');
  const vein = new THREE.Color('#8CA5BE');
  const compass = new THREE.Color('#4A7AB5');
  const half = size / 2;

  const veins = Array.from({ length: 26 }, () => ({
    x: rand(rnd, 0, size),
    y: rand(rnd, 0, size),
    a: rand(rnd, 0, Math.PI),
    len: rand(rnd, size * 0.1, size * 0.45),
    w: rand(rnd, 0.8, 2.2),
  }));

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const dx = x - half;
      const dy = y - half;
      const dist = Math.hypot(dx, dy) / half;
      const c = base.clone().lerp(tint, Math.min(1, dist * 0.9));

      for (const v of veins) {
        const rx = (x - v.x) * Math.cos(-v.a) - (y - v.y) * Math.sin(-v.a);
        const ry = (x - v.x) * Math.sin(-v.a) + (y - v.y) * Math.cos(-v.a);
        if (Math.abs(ry) < v.w && Math.abs(rx) < v.len) c.lerp(vein, 0.35);
      }

      // Compass rose: two rings, eight points, cardinal lines.
      const ang = Math.atan2(dy, dx);
      const r = dist;
      const ringA = Math.abs(r - 0.34) < 0.004;
      const ringB = Math.abs(r - 0.21) < 0.003;
      const spoke = Math.abs(((ang + Math.PI * 2) % (Math.PI / 2)) - 0) < 0.012 && r < 0.34;
      const petal = (() => {
        const k = Math.round(ang / (Math.PI / 4));
        const da = ang - k * (Math.PI / 4);
        const long = ((k % 2) + 2) % 2 === 0;
        const reach = long ? 0.31 : 0.2;
        return r < reach && Math.abs(da) < (1 - r / reach) * 0.19;
      })();
      const centre = r < 0.04;
      if (ringA || ringB || spoke || petal || centre) c.lerp(compass, petal || centre ? 0.6 : 0.45);

      const grain = rand(rnd, -0.02, 0.02);
      data[i] = Math.round(Math.min(255, Math.max(0, (c.r + grain) * 255)));
      data[i + 1] = Math.round(Math.min(255, Math.max(0, (c.g + grain) * 255)));
      data[i + 2] = Math.round(Math.min(255, Math.max(0, (c.b + grain) * 255)));
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.needsUpdate = true;
  tex.anisotropy = 4;
  return tex;
}

/** Vertical wood-grain texture for the gate leaves. */
export function woodTexture(size = 256): THREE.Texture {
  const data = new Uint8Array(size * size * 4);
  const rnd = mulberry32(77);
  const dark = new THREE.Color('#2C1A0A');
  const mid = new THREE.Color('#4A2E10');
  const light = new THREE.Color('#6B4220');
  const planks = 8;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const plank = Math.floor((x / size) * planks);
      const inPlank = ((x / size) * planks) % 1;
      const wobble = Math.sin(y * 0.09 + plank * 2.3) * 0.06 + Math.sin(y * 0.021 + plank) * 0.09;
      const grain = Math.sin((inPlank + wobble) * Math.PI * 14 + plank * 5) * 0.5 + 0.5;
      const c = dark.clone().lerp(mid, grain * 0.75).lerp(light, grain * grain * 0.28);
      if (inPlank < 0.035 || inPlank > 0.965) c.lerp(dark, 0.85);
      const n = rand(rnd, -0.015, 0.015);
      data[i] = Math.round(Math.min(255, Math.max(0, (c.r + n) * 255)));
      data[i + 1] = Math.round(Math.min(255, Math.max(0, (c.g + n) * 255)));
      data[i + 2] = Math.round(Math.min(255, Math.max(0, (c.b + n) * 255)));
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}

/** Soft round sprite so snow particles are flakes rather than squares. */
export function snowflakeTexture(size = 32): THREE.Texture {
  const data = new Uint8Array(size * size * 4);
  const half = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.min(1, Math.hypot(x - half + 0.5, y - half + 0.5) / half);
      const alpha = Math.max(0, 1 - d * d * d);
      const i = (y * size + x) * 4;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = Math.round(alpha * 255);
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return tex;
}
