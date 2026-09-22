import { useFrame, useThree } from '@react-three/fiber/native';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

import { consumeInteract, consumeLook, input } from '../game/input';
import {
  ACCEL,
  FRICTION,
  PLAYER_HEIGHT,
  RUN_SPEED,
  SPAWN,
  TURN_SPEED,
  WALK_SPEED,
  nearestStation,
  resolveCollisions,
} from '../game/world';

export type PlayerSnapshot = {
  x: number;
  z: number;
  yaw: number;
  nearStationId: string | null;
  speed: number;
};

type Props = {
  /** Called at most every other frame with the current player state. */
  onUpdate: (snap: PlayerSnapshot) => void;
  onInteract: (stationId: string) => void;
  /** When false the camera holds still, e.g. while a challenge is open. */
  active: boolean;
  invertLook: boolean;
};

/** First-person controller: WASD to move, arrows or drag to look, F to interact. */
export function Player({ onUpdate, onInteract, active, invertLook }: Props) {
  const { camera } = useThree();
  const pos = useRef(new THREE.Vector3(SPAWN.x, PLAYER_HEIGHT, SPAWN.z));
  const vel = useRef(new THREE.Vector2(0, 0));
  const yaw = useRef(SPAWN.yaw);
  const pitch = useRef(-0.04);
  const bob = useRef(0);
  const frame = useRef(0);
  const nearRef = useRef<string | null>(null);
  const lastSent = useRef<PlayerSnapshot>({ x: SPAWN.x, z: SPAWN.z, yaw: SPAWN.yaw, nearStationId: null, speed: 0 });

  useEffect(() => {
    camera.position.copy(pos.current);
    camera.rotation.order = 'YXZ';
  }, [camera]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);

    if (active) {
      // Look: arrow/Q/E keys turn at a fixed rate, drag adds directly.
      const drag = consumeLook();
      yaw.current -= input.turn * TURN_SPEED * dt;
      yaw.current -= drag.yaw;
      pitch.current += input.pitch * 1.4 * dt + drag.pitch * (invertLook ? -1 : 1);
      pitch.current = Math.max(-0.85, Math.min(0.85, pitch.current));

      // Move relative to facing.
      const speed = input.run ? RUN_SPEED : WALK_SPEED;
      const sin = Math.sin(yaw.current);
      const cos = Math.cos(yaw.current);
      const wishX = (-sin * input.forward + cos * input.strafe) * speed;
      const wishZ = (-cos * input.forward - sin * input.strafe) * speed;

      const rate = wishX === 0 && wishZ === 0 ? FRICTION : ACCEL;
      vel.current.x += (wishX - vel.current.x) * Math.min(1, rate * dt);
      vel.current.y += (wishZ - vel.current.y) * Math.min(1, rate * dt);

      const next = resolveCollisions(pos.current.x + vel.current.x * dt, pos.current.z + vel.current.y * dt);
      pos.current.x = next.x;
      pos.current.z = next.z;

      // Head bob scaled to actual ground speed, so it stops when blocked.
      const moving = Math.hypot(vel.current.x, vel.current.y);
      bob.current += dt * moving * 2.3;
      camera.position.set(pos.current.x, PLAYER_HEIGHT + Math.sin(bob.current) * 0.035 * Math.min(1, moving / 3), pos.current.z);
      camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ');

      const near = nearestStation(pos.current.x, pos.current.z);
      nearRef.current = near?.station.id ?? null;

      if (consumeInteract() && nearRef.current) onInteract(nearRef.current);

      // Push to React only when the HUD would visibly change, so walking does
      // not re-render the minimap sixty times a second.
      frame.current += 1;
      const last = lastSent.current;
      const stationChanged = last.nearStationId !== nearRef.current;
      const movedEnough = Math.hypot(pos.current.x - last.x, pos.current.z - last.z) > 0.2;
      const turnedEnough = Math.abs(yaw.current - last.yaw) > 0.045;
      if (stationChanged || ((movedEnough || turnedEnough) && frame.current % 4 === 0)) {
        const snap = {
          x: pos.current.x,
          z: pos.current.z,
          yaw: yaw.current,
          nearStationId: nearRef.current,
          speed: moving,
        };
        lastSent.current = snap;
        onUpdate(snap);
      }
    } else {
      vel.current.set(0, 0);
      consumeLook();
      consumeInteract();
    }
  });

  return null;
}
