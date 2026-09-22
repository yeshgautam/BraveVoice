import React, { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber/native';
import * as THREE from 'three';

import { PLAZA_RADIUS } from '../game/world';
import { courtyardTexture } from './geometry';

/**
 * Planar mirror floor. The scene is re-rendered each frame from a camera
 * reflected through the ground plane into a half-resolution target, then the
 * marble samples that target in screen space. This is what gives the courtyard
 * the wet, mirrored look of the reference art.
 */
export function ReflectiveFloor({ reflectivity = 0.55 }: { reflectivity?: number }) {
  const { gl, scene, camera, size } = useThree();
  const mesh = useRef<THREE.Mesh>(null);

  const marble = useMemo(() => {
    const t = courtyardTexture(512);
    t.anisotropy = 4;
    return t;
  }, []);

  const target = useMemo(() => {
    const t = new THREE.WebGLRenderTarget(512, 512, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });
    t.texture.generateMipmaps = false;
    return t;
  }, []);

  const mirrorCamera = useMemo(() => new THREE.PerspectiveCamera(), []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          marbleMap: { value: marble },
          reflectionMap: { value: target.texture },
          reflectivity: { value: reflectivity },
          fogColor: { value: new THREE.Color('#B8D9F0') },
          fogNear: { value: 44 },
          fogFar: { value: 135 },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          varying vec4 vScreen;
          varying float vDepth;
          void main() {
            vUv = uv;
            vec4 world = modelMatrix * vec4(position, 1.0);
            vec4 clip = projectionMatrix * viewMatrix * world;
            vScreen = clip;
            vDepth = -(viewMatrix * world).z;
            gl_Position = clip;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform sampler2D marbleMap;
          uniform sampler2D reflectionMap;
          uniform float reflectivity;
          uniform vec3 fogColor;
          uniform float fogNear;
          uniform float fogFar;
          varying vec2 vUv;
          varying vec4 vScreen;
          varying float vDepth;

          void main() {
            vec3 marble = texture2D(marbleMap, vUv).rgb;
            vec2 screenUv = (vScreen.xy / vScreen.w) * 0.5 + 0.5;
            vec3 reflected = texture2D(reflectionMap, screenUv).rgb;

            // Reflections fade with distance so the far plaza stays readable.
            float fade = 1.0 - smoothstep(6.0, 46.0, vDepth);
            float amount = reflectivity * (0.35 + 0.65 * fade);

            vec3 colour = mix(marble, reflected * 0.92 + marble * 0.18, amount);
            float fog = smoothstep(fogNear, fogFar, vDepth);
            gl_FragColor = vec4(mix(colour, fogColor, fog), 1.0);
          }
        `,
      }),
    [marble, target.texture, reflectivity],
  );

  useFrame(() => {
    const plane = mesh.current;
    if (!plane) return;

    const cam = camera as THREE.PerspectiveCamera;
    // Reflect the camera through y = 0.
    mirrorCamera.copy(cam);
    mirrorCamera.position.set(cam.position.x, -cam.position.y, cam.position.z);
    const forward = new THREE.Vector3();
    cam.getWorldDirection(forward);
    const lookAt = new THREE.Vector3(
      mirrorCamera.position.x + forward.x,
      mirrorCamera.position.y - forward.y,
      mirrorCamera.position.z + forward.z,
    );
    mirrorCamera.up.set(0, -1, 0);
    mirrorCamera.lookAt(lookAt);
    mirrorCamera.updateProjectionMatrix();

    plane.visible = false;
    const previousTarget = gl.getRenderTarget();
    gl.setRenderTarget(target);
    gl.clear();
    gl.render(scene, mirrorCamera);
    gl.setRenderTarget(previousTarget);
    plane.visible = true;
  });

  // Keep the target proportional to the viewport without reallocating per frame.
  const sized = useRef({ w: 0, h: 0 });
  if (sized.current.w !== size.width || sized.current.h !== size.height) {
    sized.current = { w: size.width, h: size.height };
    const w = Math.max(256, Math.min(1024, Math.round(size.width / 2)));
    const h = Math.max(256, Math.min(1024, Math.round(size.height / 2)));
    target.setSize(w, h);
  }

  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} material={material}>
      <circleGeometry args={[PLAZA_RADIUS, 64]} />
    </mesh>
  );
}
