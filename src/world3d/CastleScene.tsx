import React from 'react';
import * as THREE from 'three';

import { Palette } from '../game/palette';
import { Banners, Castle, Clouds, Ground, Mountains, PineForest, SkyDome } from './Scenery';
import { CastleGate, IceCrystalTree, Snowfall, SpeechStations, StoneLanterns } from './Props';
import { ReflectiveFloor } from './ReflectiveFloor';
import type { StationProgress } from '../game/store';

export function Lighting() {
  return (
    <>
      <hemisphereLight args={['#FFFFFF', '#D8E6F2', 3.4]} />
      <directionalLight
        position={[22, 46, -16]}
        intensity={3.6}
        color="#FFFBF2"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-38}
        shadow-camera-right={38}
        shadow-camera-top={38}
        shadow-camera-bottom={-38}
        shadow-camera-far={110}
      />
      <ambientLight intensity={1.5} color="#EAF4FF" />
      {/* Fill from the courtyard so the gate faces are never silhouettes. */}
      <pointLight position={[0, 7, 16]} color="#EAF6FF" intensity={95} distance={40} decay={2} />
    </>
  );
}

export type CastleSceneProps = {
  /** Station crystals are only meaningful in-game; the splash hides them. */
  progress?: Record<string, StationProgress>;
  highlightId?: string | null;
  showStations?: boolean;
  /** True on the splash, where the gates swing open on a timer. */
  animateGate?: boolean;
  snowCount?: number;
  reflectivity?: number;
};

/**
 * Everything inside the courtyard, shared by the splash camera shot and the
 * playable screen so both always show the same world.
 */
export function CastleScene({
  progress,
  highlightId = null,
  showStations = true,
  animateGate = false,
  snowCount = 700,
  reflectivity = 0.42,
}: CastleSceneProps) {
  return (
    <>
      <Lighting />
      <SkyDome />
      <Mountains />
      <Clouds />
      <Ground />
      <ReflectiveFloor reflectivity={reflectivity} />
      <Castle />
      <Banners />
      <CastleGate animate={animateGate} />
      <PineForest />
      <IceCrystalTree />
      <StoneLanterns />
      {showStations && progress && <SpeechStations progress={progress} highlightId={highlightId} />}
      <Snowfall count={snowCount} />
    </>
  );
}

export function applySceneDefaults(gl: THREE.WebGLRenderer, scene: THREE.Scene) {
  gl.setClearColor(new THREE.Color(Palette.skyHorizon));
  gl.shadowMap.type = THREE.PCFShadowMap;
  gl.toneMapping = THREE.NoToneMapping;
  gl.toneMappingExposure = 1.05;
  scene.fog = new THREE.Fog('#DCEDF9', 75, 190);
}
