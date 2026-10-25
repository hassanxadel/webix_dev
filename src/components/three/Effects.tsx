import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ChromaticAberrationEffect, Effect } from "postprocessing";
import * as THREE from "three";
import { cameraMotion } from "./CameraRig";

/**
 * Zeroes any NaN / infinite pixel before bloom. A single bad value from a
 * physically based shader at a grazing angle would otherwise be blurred by the
 * bloom chain into a black hole with a coloured fringe.
 */
class NaNGuardEffect extends Effect {
  constructor() {
    super(
      "NaNGuard",
      /* glsl */ `
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec4 c = inputColor;
        bool bad = any(notEqual(c, c)) || any(greaterThan(abs(c.rgb), vec3(6.0e4)));
        outputColor = bad ? vec4(0.0, 0.0, 0.0, 1.0) : c;
      }`,
    );
  }
}

/**
 * Post-processing: selective low-intensity bloom (only emissive neon passes
 * the threshold), fine film grain, vignette, and a touch of chromatic
 * aberration that appears only while the camera is moving fast.
 */
export function Effects() {
  const guard = useMemo(() => new NaNGuardEffect(), []);
  // Built by hand rather than via <ChromaticAberration ref>: the wrapper serialises its
  // props, and in React 19 `ref` is a prop — a live effect object can't be serialised.
  const aberration = useMemo(() => new ChromaticAberrationEffect({ offset: new THREE.Vector2(0, 0), radialModulation: true, modulationOffset: 0.35 }), []);

  useFrame(() => {
    const k = Math.min(1, cameraMotion.speed / 60) * 0.0016;
    aberration.offset.set(k, k * 0.6);
  });

  return (
    <EffectComposer multisampling={4}>
      <primitive object={guard} />
      <Bloom mipmapBlur luminanceThreshold={0.9} luminanceSmoothing={0.15} intensity={0.55} radius={0.7} />
      <primitive object={aberration} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.12} />
      <Vignette offset={0.28} darkness={0.72} />
    </EffectComposer>
  );
}
