import { useMemo } from "react";
import { Bloom, DepthOfField, EffectComposer, Noise, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, Effect, ToneMappingMode } from "postprocessing";
import { cardState } from "./WebixPass";

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
 * Cinematic finish: low, selective bloom (card edge, bright stars, planet rim),
 * a subtle depth of field focused on the card, ACES tone mapping, vignette and
 * light grain. Weak GPUs (tier "low") render without it.
 */
export function Effects() {
  const guard = useMemo(() => new NaNGuardEffect(), []);
  return (
    <EffectComposer multisampling={4}>
      <primitive object={guard} />
      {/* `target` is the card's live position, so focus follows it everywhere. */}
      <DepthOfField target={cardState.position} worldFocusRange={2.5} bokehScale={1.4} />
      <Bloom mipmapBlur luminanceThreshold={0.85} luminanceSmoothing={0.2} intensity={0.45} radius={0.65} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.3} darkness={0.6} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.08} />
    </EffectComposer>
  );
}
