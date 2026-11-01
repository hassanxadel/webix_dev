import { useMemo } from "react";
import { Bloom, EffectComposer, GodRays, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ChromaticAberrationEffect, Effect, KernelSize, ToneMappingMode } from "postprocessing";
import * as THREE from "three";

/** Zeroes any NaN / infinite pixel before bloom, so one bad physical-shader value can't bloom into a black hole. */
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
 * Cinematic finish: god rays from the sunrise (the sun disc half hidden by
 * the limb), bloom on what is truly bright (sun, atmosphere rim, city lights,
 * bright stars, card edge), ACES, vignette, light grain and a touch of
 * chromatic aberration at the frame edges only. `lite` (weak GPU / phones)
 * drops god rays and aberration and uses a cheaper bloom.
 */
export function Effects({ sun, lite }: { sun: THREE.Mesh | null; lite: boolean }) {
  const guard = useMemo(() => new NaNGuardEffect(), []);
  // Built by hand: in React 19 `ref` is a prop and the wrapper would try to serialise a live effect.
  const aberration = useMemo(() => new ChromaticAberrationEffect({ offset: new THREE.Vector2(0.0011, 0.0011), radialModulation: true, modulationOffset: 0.55 }), []);
  return (
    <EffectComposer multisampling={lite ? 0 : 4}>
      <primitive object={guard} />
      {!lite && sun ? <GodRays sun={sun} samples={60} density={0.96} decay={0.93} weight={0.35} exposure={0.45} clampMax={1} kernelSize={KernelSize.SMALL} blur /> : <></>}
      <Bloom mipmapBlur={!lite} luminanceThreshold={0.78} luminanceSmoothing={0.2} intensity={lite ? 0.45 : 0.7} radius={0.7} />
      {!lite ? <primitive object={aberration} /> : <></>}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.3} darkness={0.65} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.06} />
    </EffectComposer>
  );
}
