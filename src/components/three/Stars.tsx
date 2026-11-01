import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { journey, journeyStore } from "@/lib/journey";
import { useProgressiveTexture } from "./textures";

/**
 * NASA SVS Deep Star Maps 2020 (public domain) on a huge inverted sphere:
 * the real Milky Way and thousands of real faint stars, darkened and lifted
 * onto deep navy (#050B1E–#0A1430) so the sky is never pure black.
 */
export function StarMap({ low }: { low: boolean }) {
  const map = useProgressiveTexture("/space/stars-2k.webp", low ? null : "/space/stars-4k.webp");
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uMap: { value: null }, uNavyTop: { value: new THREE.Color("#0a1430") }, uNavyLow: { value: new THREE.Color("#050b1e") } },
        vertexShader: /* glsl */ `
          varying vec2 vUv; varying float vY;
          void main() { vUv = uv; vY = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform sampler2D uMap; uniform vec3 uNavyTop, uNavyLow; varying vec2 vUv; varying float vY;
          void main() {
            vec3 sky = texture2D(uMap, vUv).rgb;
            vec3 navy = mix(uNavyLow, uNavyTop, smoothstep(-0.2, 0.6, vY));
            // Darken the map's grey floor, keep its stars and Milky Way.
            vec3 c = navy + max(sky - 0.012, 0.0) * 0.85;
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }`,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [],
  );
  useEffect(() => {
    mat.uniforms.uMap.value = map;
  }, [map, mat]);

  // A slight, slow parallax for the farthest layer.
  useFrame(() => {
    mesh.current?.rotation.set(journey.pointerY * 0.004, 2.1 - journey.pointerX * 0.006 + journey.progress * 0.05, 0.35);
  });

  return (
    <mesh ref={mesh} material={mat} renderOrder={-20} frustumCulled={false}>
      <sphereGeometry args={[480, 64, 32]} />
    </mesh>
  );
}

/**
 * Twinkling stars on top of the map: one THREE.Points, one draw call. Each
 * star is a bright core with a soft Gaussian halo; the brightest ~3% add
 * faint 4-ray diffraction spikes. Small and medium stars swing from full
 * brightness to almost nothing (0.05 → 1) on their own 1–4 s rhythm; bright
 * ones pulse slower and gentler, with a slight white ↔ pale blue ↔ warm
 * scintillation. Three shells give three parallax rates. Reduced motion only
 * slows the twinkle; it never stops.
 */
const vertex = /* glsl */ `
  attribute float aSize;
  attribute float aMag;   // 0 faint … 1 brightest
  attribute vec4 aTw;     // phase, angular speed, spikes flag, layer 0..1
  uniform float uTime;
  uniform float uSlow;
  uniform vec2 uShift;
  uniform float uDpr;
  varying float vBright;
  varying vec3 vColor;
  varying float vSpikes;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    mv.xy += uShift * (0.3 + aTw.w) * -mv.z;
    gl_Position = projectionMatrix * mv;
    float speed = aTw.y * mix(1.0, 0.45, aMag) * uSlow;
    float s = 0.62 * sin(uTime * speed + aTw.x) + 0.38 * sin(uTime * speed * 2.37 + aTw.x * 3.1);
    float tw = clamp(0.5 + 0.5 * s, 0.0, 1.0);
    float floorB = mix(0.05, 0.55, aMag);           // small stars nearly vanish, bright ones only breathe
    vBright = mix(floorB, 1.0, tw * tw) * (0.35 + 0.65 * aMag) * 1.6;
    float hue = sin(uTime * speed * 0.6 + aTw.x * 2.0);
    vColor = mix(vec3(1.0), hue > 0.0 ? vec3(0.72, 0.84, 1.0) : vec3(1.0, 0.9, 0.72), abs(hue) * 0.45);
    vSpikes = aTw.z;
    gl_PointSize = aSize * uDpr;
  }
`;
const fragment = /* glsl */ `
  varying float vBright;
  varying vec3 vColor;
  varying float vSpikes;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r = length(d) * 2.0;
    float core = exp(-r * r * 60.0);
    float halo = exp(-r * r * 7.0) * 0.35;
    float a = core + halo;
    if (vSpikes > 0.5) {
      float spikes = (exp(-abs(d.x) * 90.0) + exp(-abs(d.y) * 90.0)) * smoothstep(1.0, 0.0, r);
      a += spikes * 0.35;
    }
    if (a < 0.003) discard;
    gl_FragColor = vec4(vColor * vBright * a, 1.0);
    #include <colorspace_fragment>
  }
`;

function build(count: number) {
  let seed = 9871;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const mag = new Float32Array(count);
  const tw = new Float32Array(count * 4);
  const mags = Array.from({ length: count }, () => Math.pow(rnd(), 5));
  const spikeCut = [...mags].sort((a, b) => b - a)[Math.floor(count * 0.03)];
  const radii = [300, 340, 380];
  for (let i = 0; i < count; i++) {
    const y = rnd() * 2 - 1;
    const th = rnd() * Math.PI * 2;
    const r = Math.sqrt(1 - y * y);
    const layer = i % 3;
    pos.set([Math.cos(th) * r * radii[layer], y * radii[layer], Math.sin(th) * r * radii[layer]], i * 3);
    const m = mags[i];
    mag[i] = m;
    const spikes = m > spikeCut ? 1 : 0;
    size[i] = spikes ? 26 + m * 18 : 5 + m * 16;
    const period = 1 + rnd() * 3; // 1–4 s
    tw.set([rnd() * Math.PI * 2, (Math.PI * 2) / period, spikes, 1 - layer / 2], i * 4);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  g.setAttribute("aMag", new THREE.BufferAttribute(mag, 1));
  g.setAttribute("aTw", new THREE.BufferAttribute(tw, 4));
  return g;
}

export function Stars({ low }: { low: boolean }) {
  const geo = useMemo(() => build(low ? 600 : 1500), [low]);
  // Created once, so the uniforms written every frame below are the ones the GPU reads.
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: { uTime: { value: 0 }, uSlow: { value: 1 }, uShift: { value: new THREE.Vector2() }, uDpr: { value: 1 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  useEffect(() => () => geo.dispose(), [geo]);

  useFrame(({ clock, viewport }) => {
    const u = mat.uniforms;
    u.uTime.value = clock.elapsedTime;
    // Reduced motion (incl. Windows "Animation effects: Off"): slower, never frozen.
    u.uSlow.value = journeyStore.get().reducedMotion ? 0.4 : 1;
    u.uShift.value.set(journey.pointerX * -0.002, journey.pointerY * 0.0014 + journey.progress * 0.01);
    u.uDpr.value = viewport.dpr;
  });

  return <points geometry={geo} material={mat} frustumCulled={false} renderOrder={-10} />;
}
