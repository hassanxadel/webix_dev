import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { journey, journeyStore } from "@/lib/journey";

/**
 * The star field: one THREE.Points, one draw call. Stars sit on three far
 * shells (so the camera's sway moves them a little, the terrain a lot) above
 * the horizon. Round soft Gaussian points with a realistic magnitude spread:
 * many tiny dim stars, few bright ones; only the five brightest get a faint
 * glow. Every star twinkles (sin + a second, detuned sin as cheap noise) with
 * its own phase and a 1.5–5 s period; small stars dip almost to nothing,
 * bright ones breathe gently, with a slight white ↔ pale blue / yellow
 * scintillation. Reduced motion slows the twinkle; it never stops.
 */
const vertex = /* glsl */ `
  attribute float aSize;
  attribute float aMag;    // 0 dim … 1 brightest
  attribute vec3 aTw;      // phase, angular speed, glow flag
  uniform float uTime;
  uniform float uAmp;
  uniform vec2 uShift;     // per-layer parallax, view space
  uniform float uDpr;
  varying float vBright;
  varying vec3 vColor;
  varying float vGlow;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float layer = fract(aTw.x * 3.17);
    mv.xy += uShift * (0.4 + layer) * -mv.z;
    gl_Position = projectionMatrix * mv;
    float s1 = sin(uTime * aTw.y + aTw.x);
    float s2 = sin(uTime * aTw.y * 2.31 + aTw.x * 5.0);
    float tw = 0.5 + 0.5 * (0.7 * s1 + 0.3 * s2);
    float depth = mix(0.95, 0.3, aMag) * uAmp; // small stars dip deeper
    vBright = (0.25 + 0.75 * aMag) * (1.0 - depth * (1.0 - tw));
    float hue = sin(uTime * aTw.y * 0.7 + aTw.x * 2.0);
    vColor = mix(vec3(1.0), hue > 0.0 ? vec3(0.78, 0.86, 1.0) : vec3(1.0, 0.94, 0.78), abs(hue) * 0.35 * uAmp);
    vGlow = aTw.z;
    gl_PointSize = aSize * uDpr;
  }
`;
const fragment = /* glsl */ `
  varying float vBright;
  varying vec3 vColor;
  varying float vGlow;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    float a = exp(-r * r * 7.0);
    if (vGlow > 0.5) a = exp(-r * r * 26.0) + exp(-r * 3.2) * 0.22;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vColor * vBright * a, 1.0);
    #include <colorspace_fragment>
  }
`;

function build(count: number) {
  let seed = 1234567;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const mag = new Float32Array(count);
  const tw = new Float32Array(count * 3);
  const radii = [300, 330, 360];
  const mags = Array.from({ length: count }, () => Math.pow(rnd(), 7)); // few bright, many dim
  const brightest = [...mags].sort((a, b) => b - a)[4];
  for (let i = 0; i < count; i++) {
    // Upper hemisphere, slightly below the horizon too (the terrain hides those).
    const y = -0.08 + rnd() * 1.08;
    const th = rnd() * Math.PI * 2;
    const r = Math.sqrt(1 - y * y);
    const R = radii[i % 3];
    pos.set([Math.cos(th) * r * R, y * R, Math.sin(th) * r * R], i * 3);
    const m = mags[i];
    mag[i] = m;
    const glow = m >= brightest ? 1 : 0;
    size[i] = glow ? 18 : 1.6 + m * 7;
    const period = 1.5 + rnd() * 3.5;
    tw.set([rnd() * Math.PI * 2, (Math.PI * 2) / period, glow], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  g.setAttribute("aMag", new THREE.BufferAttribute(mag, 1));
  g.setAttribute("aTw", new THREE.BufferAttribute(tw, 3));
  return g;
}

export function Stars({ low }: { low: boolean }) {
  const geo = useMemo(() => build(low ? 1200 : 3000), [low]);
  // Created once (useMemo with no deps), so uniforms written below are the ones the GPU reads.
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: { uTime: { value: 0 }, uAmp: { value: 1 }, uShift: { value: new THREE.Vector2() }, uDpr: { value: 1 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    [],
  );

  useFrame(({ clock, viewport }) => {
    const reduced = journeyStore.get().reducedMotion;
    const u = mat.uniforms;
    // Reduced motion (incl. Windows "Animation effects: Off"): slower and gentler, not frozen.
    u.uTime.value = clock.elapsedTime * (reduced ? 0.35 : 1);
    u.uAmp.value = reduced ? 0.5 : 1;
    u.uShift.value.set(journey.pointerX * -0.0015, journey.pointerY * 0.001);
    u.uDpr.value = viewport.dpr;
  });

  return <points geometry={geo} material={mat} frustumCulled={false} renderOrder={-10} />;
}
