import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { sceneStore } from "@/lib/scene-store";

/**
 * Cinematic grade applied after tone mapping: cool indigo shadows, warm amber
 * highlights, a touch of contrast, vignette and fine film grain.
 */
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uGrain: { value: 0.035 },
    uRes: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uGrain;
    uniform vec2 uRes;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      vec3 shadows = vec3(0.16, 0.2, 0.42);
      vec3 highs = vec3(1.0, 0.86, 0.66);
      c.rgb = mix(c.rgb, c.rgb + shadows * 0.09, 1.0 - smoothstep(0.0, 0.4, l));
      c.rgb = mix(c.rgb, c.rgb * highs * 1.08, smoothstep(0.5, 1.0, l) * 0.35);
      c.rgb = (c.rgb - 0.5) * 1.07 + 0.5;
      vec2 d = vUv - 0.5;
      float vig = smoothstep(0.9, 0.28, length(d * vec2(1.15, 1.0)));
      c.rgb *= mix(0.42, 1.0, vig);
      float n = fract(sin(dot(vUv * uRes + fract(uTime) * 97.0, vec2(12.9898, 78.233))) * 43758.5453);
      c.rgb += (n - 0.5) * uGrain;
      gl_FragColor = vec4(c.rgb, 1.0);
    }`,
};

export function PostFX({ lowPower }: { lowPower: boolean }) {
  const { gl, scene, camera, size } = useThree();

  const { composer, grade } = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(size.width, size.height, {
      type: THREE.HalfFloatType,
      samples: lowPower ? 0 : 4,
    });
    const composer = new EffectComposer(gl, target);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(size.width, size.height), 0.62, 0.55, 0.9);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    const grade = new ShaderPass(GradeShader);
    composer.addPass(grade);
    return { composer, grade };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera, lowPower]);

  useEffect(() => {
    const ratio = gl.getPixelRatio();
    composer.setPixelRatio(ratio);
    composer.setSize(size.width, size.height);
    grade.uniforms.uRes.value.set(size.width * ratio, size.height * ratio);
  }, [composer, grade, gl, size]);

  useEffect(() => () => composer.dispose(), [composer]);

  useFrame(({ clock }, dt) => {
    grade.uniforms.uTime.value = clock.elapsedTime;
    grade.uniforms.uGrain.value = sceneStore.get().reducedMotion ? 0.02 : 0.035;
    composer.render(dt);
  }, 1);

  return null;
}
