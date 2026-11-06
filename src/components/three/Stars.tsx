import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { journey, journeyStore } from "@/lib/journey";
import { starPass } from "@/lib/loupe";
import { useProgressiveTexture } from "./textures";
import { BASE_PITCH, GLARE_DIR } from "./Space";

const deg = THREE.MathUtils.degToRad;
const dir = (az: number, el: number) => new THREE.Vector3(Math.sin(deg(az)) * Math.cos(deg(el)), Math.sin(deg(el)), -Math.cos(deg(az)) * Math.cos(deg(el)));
/** Ambient clock: reduced motion slows it (×0.3), never stops it. */
const speed = () => (journeyStore.get().reducedMotion ? 0.3 : 1);

/** Three faint distant galaxies high in the sky: centre direction, long axis, size (radians). */
const GALAXIES = [
  { c: dir(-12, 27), axis: new THREE.Vector3(1, 0.35, 0), a: 0.016, b: 0.005 },
  { c: dir(38, 17), axis: new THREE.Vector3(0.6, 1, 0), a: 0.011, b: 0.004 },
  { c: dir(-48, 40), axis: new THREE.Vector3(1, -0.5, 0), a: 0.009, b: 0.0045 },
].map((g) => {
  const t1 = g.axis.clone().sub(g.c.clone().multiplyScalar(g.axis.dot(g.c))).normalize();
  return { c: g.c, t1, t2: g.c.clone().cross(t1).normalize(), ab: new THREE.Vector2(g.a, g.b) };
});

/**
 * NASA SVS Deep Star Maps 2020 (public domain) on a huge inverted sphere:
 * the real Milky Way and thousands of real faint stars, darkened onto deep
 * navy (#050B1E–#0A1430), never pure black. Over it, at very low opacity:
 * noise-shaped nebula wisps (a faint pink one high on the right), an orange
 * glow rising from the horizon around the sunrise with a faint orange haze
 * over the lower-left sky, and three small distant galaxies.
 */
export function StarMap({ low }: { low: boolean }) {
  const map = useProgressiveTexture("/space/stars-2k.webp", low ? null : "/space/stars-4k.webp");
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        defines: { OCTAVES: low ? 3 : 5 },
        uniforms: {
          uMap: { value: null },
          uNavyTop: { value: new THREE.Color("#0a1430") },
          uNavyLow: { value: new THREE.Color("#050b1e") },
          uPink: { value: new THREE.Color("#ff007f") },
          uOrange: { value: new THREE.Color("#ff8a1f") },
          uAmber: { value: new THREE.Color("#ffb547") },
          uBlue: { value: new THREE.Color("#4a6cff") },
          uPinkDir: { value: dir(34, 30) },
          uSunDir: { value: GLARE_DIR },
          uGalC: { value: GALAXIES.map((g) => g.c) },
          uGalT1: { value: GALAXIES.map((g) => g.t1) },
          uGalT2: { value: GALAXIES.map((g) => g.t2) },
          uGalAB: { value: GALAXIES.map((g) => g.ab) },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv; varying vec3 vDir;
          void main() {
            vUv = uv;
            vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform sampler2D uMap;
          uniform vec3 uNavyTop, uNavyLow, uPink, uOrange, uAmber, uBlue, uPinkDir, uSunDir;
          uniform vec3 uGalC[3]; uniform vec3 uGalT1[3]; uniform vec3 uGalT2[3]; uniform vec2 uGalAB[3];
          varying vec2 vUv; varying vec3 vDir;
          float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
          float noise(vec3 p) {
            vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
            return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                       mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
          }
          float fbm(vec3 p) { float s = 0.0, a = 0.5; for (int i = 0; i < OCTAVES; i++) { s += a * noise(p); p *= 2.07; a *= 0.5; } return s; }
          void main() {
            vec3 d = normalize(vDir);
            vec3 navy = mix(uNavyLow, uNavyTop, smoothstep(-0.2, 0.6, d.y));
            vec3 sky = texture2D(uMap, vUv).rgb;
            // White stars only: keep brightness, drop the texture's star colours (a faint cool white remains).
            sky = vec3(dot(sky, vec3(0.2126, 0.7152, 0.0722))) * vec3(0.96, 0.975, 1.0);
            vec3 c = navy + max(sky - 0.012, 0.0) * 0.85;
            // Nebula wisps: a faint pink one high on the right (6–10%), cold blue ones elsewhere (~3%).
            float wisp = smoothstep(0.42, 0.85, fbm(d * 3.2 + vec3(4.0, 1.0, 7.0)));
            float pinkZone = smoothstep(0.75, 0.15, distance(d, uPinkDir));
            c += uPink * wisp * pinkZone * 0.09 + uBlue * wisp * (1.0 - pinkZone) * smoothstep(0.0, 0.4, d.y) * 0.03;
            // Sunrise warmth: an orange glow rising from the horizon around the sun and fading upward,
            // amber close to the sun; plus a faint orange haze over the lower-left sky.
            float toSun = max(dot(d, uSunDir), 0.0);
            float nearHorizon = exp(-max(d.y + 0.06, 0.0) * 7.0);
            c += mix(uOrange, uAmber, toSun * toSun) * (pow(toSun, 6.0) * nearHorizon * 0.1 + pow(toSun, 40.0) * 0.06);
            c += uOrange * smoothstep(0.2, -0.8, d.x) * exp(-max(d.y + 0.1, 0.0) * 5.0) * 0.035;
            // Distant galaxies: soft elliptical smudges with a brighter core.
            for (int i = 0; i < 3; i++) {
              vec3 q = d - uGalC[i];
              float e = pow(dot(q, uGalT1[i]) / uGalAB[i].x, 2.0) + pow(dot(q, uGalT2[i]) / uGalAB[i].y, 2.0);
              c += vec3(0.92, 0.88, 1.0) * (exp(-e) * 0.05 + exp(-e * 9.0) * 0.06);
            }
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }`,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [low],
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
 * Twinkling stars over the map: one THREE.Points, one draw call. All white
 * (#FFFFFF → #EEF3FF, no visible colour). Each star is
 * a crisp core in a soft halo; the halo grows and shrinks with brightness.
 * Calm twinkle: every star has its own 2–5 s cycle and phase (never in
 * sync; big stars 4–7 s), swinging from 1.0 to ~0.05. ~2% sparkle now and
 * then (a slow 3 s swell in 9 s slots); the brightest ~3% carry faint
 * diffraction spikes.
 */
const vertex = /* glsl */ `
  attribute float aSize;
  attribute float aMag;    // 0 faint … 1 brightest
  attribute vec4 aTw;      // phase, angular speed, layer 0..1, seed
  attribute vec2 aFlags;   // spikes, sparkle
  attribute vec3 aTint;
  uniform float uTime;
  uniform vec2 uShift;
  uniform float uDpr;
  uniform float uBig;      // 1 = the big-star layer: full swing to almost off, no slow-down for brightness
  uniform float uZoom;     // the magnifier's ×MAG in its pass, 1 otherwise
  uniform float uMaxPoint; // this GPU's gl_PointSize limit
  #ifdef QUAD
  attribute vec3 aPos;     // per instance; position = the quad's corner
  uniform vec2 uRes;       // the pass's size, CSS px
  varying vec2 vCoord;
  #endif
  varying float vBright;
  varying float vScale;
  varying vec3 vColor;
  varying float vSpikes;
  void main() {
    #ifdef QUAD
    vec4 mv = modelViewMatrix * vec4(aPos, 1.0);
    #else
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    #endif
    mv.xy += uShift * (0.3 + aTw.z) * -mv.z;
    gl_Position = projectionMatrix * mv;
    float w = aTw.y;                    // bright stars pulse slower
    float s = 0.65 * sin(uTime * w + aTw.x) + 0.35 * sin(uTime * w * 2.37 + aTw.x * 3.1);
    float tw = clamp(0.5 + 0.5 * s, 0.0, 1.0);
    float b = mix(mix(mix(0.05, 0.45, aMag), 0.02, uBig), 1.0, tw * tw);
    // Sparkle: in random 9 s slots, a chosen star swells for about 3 s.
    float slot = floor(uTime / 9.0 + aTw.w * 7.0);
    float lucky = step(0.6, fract(sin(slot * 12.9898 + aTw.w * 78.233) * 43758.5453)) * aFlags.y;
    float flare = lucky * sin(clamp(fract(uTime / 9.0 + aTw.w * 7.0) * 3.0, 0.0, 1.0) * 3.14159);
    vBright = b * (0.35 + 0.65 * aMag) * 1.7 * (1.0 + 0.9 * flare);
    vScale = (0.55 + 0.45 * b) * (1.0 + 0.5 * flare);          // the halo breathes with brightness
    vColor = aTint;
    vSpikes = aFlags.x;
    #ifdef QUAD
    vCoord = position.xy + 0.5;
    gl_Position.xy += position.xy * aSize * vScale * uZoom * 2.0 / uRes * gl_Position.w;
    #else
    gl_PointSize = min(aSize * vScale * uDpr * uZoom, uMaxPoint);
    #endif
  }
`;
const fragment = /* glsl */ `
  varying float vBright;
  varying float vScale;
  varying vec3 vColor;
  varying float vSpikes;
  #ifdef QUAD
  varying vec2 vCoord;
  #define COORD vCoord
  #else
  #define COORD gl_PointCoord
  #endif
  void main() {
    vec2 d = COORD - 0.5;
    float r = length(d) * 2.0;
    float core = exp(-r * r * 60.0 * vScale * vScale);         // the core keeps its pixel size
    float halo = exp(-r * r * 7.0) * 0.35;
    float a = core + halo;
    if (vSpikes > 0.5) a += (exp(-abs(d.x) * 90.0) + exp(-abs(d.y) * 90.0)) * smoothstep(1.0, 0.0, r) * 0.35;
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
  const flags = new Float32Array(count * 2);
  const tint = new Float32Array(count * 3);
  const white = new THREE.Color("#ffffff");
  const cool = new THREE.Color("#eef3ff");
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
    size[i] = spikes ? 28 + m * 18 : 6 + m * 18;
    const period = 2 + rnd() * 3; // 2–5 s, per star
    tw.set([rnd() * Math.PI * 2, (Math.PI * 2) / period, 1 - layer / 2, rnd()], i * 4);
    flags.set([spikes, rnd() < 0.02 ? 1 : 0], i * 2);
    tint.set(white.clone().lerp(cool, rnd()).toArray(), i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  g.setAttribute("aMag", new THREE.BufferAttribute(mag, 1));
  g.setAttribute("aTw", new THREE.BufferAttribute(tw, 4));
  g.setAttribute("aFlags", new THREE.BufferAttribute(flags, 2));
  g.setAttribute("aTint", new THREE.BufferAttribute(tint, 3));
  return g;
}

/**
 * ~32 big, bright stars in clear sky (rejection-sampled in screen space so none
 * land on the headline, the card, the W / Menu / wordmark corners or the Earth):
 * bright core, halo and 4-ray spikes, each with its own 4–7 s twinkle; white only.
 */
function buildBig(count: number) {
  let seed = 4421;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const halfH = Math.tan(deg(22.5)), halfW = halfH * 1.78;
  const blocked = (x: number, y: number) =>
    (Math.abs(x) < 0.6 && y > 0.4 && y < 0.9) || // headline
    (Math.abs(x) < 0.45 && y > -0.65 && y < 0.3) || // card
    (Math.abs(x) > 0.75 && y > 0.72) || // W, Menu
    (Math.abs(x) > 0.55 && y < -0.7) || // scroll hint, wordmark
    y < -0.25; // the Earth's limb
  const pos: number[] = [], size: number[] = [], mag: number[] = [], tw: number[] = [], flags: number[] = [], tint: number[] = [];
  const white = new THREE.Color("#ffffff"), cool = new THREE.Color("#eef3ff");
  while (size.length < count) {
    const x = rnd() * 2.6 - 1.3, y = rnd() * 1.3 - 0.25;
    if (blocked(x, y)) continue;
    const v = new THREE.Vector3(x * halfW, y * halfH, -1).normalize().applyAxisAngle(new THREE.Vector3(1, 0, 0), BASE_PITCH).multiplyScalar(280);
    pos.push(v.x, v.y, v.z);
    size.push(46 + rnd() * 30);
    mag.push(1);
    const period = 4 + rnd() * 3; // 4–7 s, per star
    tw.push(rnd() * Math.PI * 2, (Math.PI * 2) / period, 1, rnd());
    flags.push(1, 0);
    tint.push(...white.clone().lerp(cool, rnd()).toArray());
  }
  // Instanced camera-facing quads, not points: magnified they can outgrow a GPU's point-size limit.
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  const each = (name: string, data: number[], n: number) => g.setAttribute(name, new THREE.InstancedBufferAttribute(new Float32Array(data), n));
  each("aPos", pos, 3);
  each("aSize", size, 1);
  each("aMag", mag, 1);
  each("aTw", tw, 4);
  each("aFlags", flags, 2);
  each("aTint", tint, 3);
  g.instanceCount = count;
  return g;
}

/** `few` (phones, weak GPUs): ~40% of the stars. */
export function Stars({ few }: { few: boolean }) {
  return (
    <>
      <StarLayer geo={useMemo(() => build(few ? 600 : 1500), [few])} big={0} />
      <StarLayer geo={useMemo(() => buildBig(few ? 14 : 34), [few])} big={1} />
    </>
  );
}

function StarLayer({ geo, big }: { geo: THREE.BufferGeometry; big: number }) {
  const maxPoint = useThree(({ gl }) => {
    const c = gl.getContext();
    return c.getParameter(c.ALIASED_POINT_SIZE_RANGE)[1] as number;
  });
  // Created once, so the uniforms written every frame below are the ones the GPU reads.
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        defines: big ? { QUAD: 1 } : {},
        uniforms: { uTime: { value: 0 }, uShift: { value: new THREE.Vector2() }, uDpr: { value: 1 }, uBig: { value: big }, uMaxPoint: { value: maxPoint }, uZoom: starPass.zoom, uRes: starPass.res },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [big, maxPoint],
  );
  useEffect(() => () => geo.dispose(), [geo]);

  useFrame(({ viewport, size }, dt) => {
    const u = mat.uniforms;
    starPass.res.value[0] = size.width;
    starPass.res.value[1] = size.height;
    u.uTime.value += dt * speed();
    u.uShift.value.set(journey.pointerX * -0.002, journey.pointerY * 0.0014 + journey.progress * 0.01);
    u.uDpr.value = viewport.dpr;
  });

  return big ? <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={-10} /> : <points geometry={geo} material={mat} frustumCulled={false} renderOrder={-10} />;
}

/** A rare, thin shooting star (every ~6–12 s), fast and subtle, behind the Earth and Moon. */
export function ShootingStar() {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uA: { value: new THREE.Vector2() }, uB: { value: new THREE.Vector2() }, uFade: { value: 0 } },
        vertexShader: /* glsl */ `
          uniform vec2 uA; uniform vec2 uB; varying float vT;
          void main() {
            vT = position.x; // 0 tail → 1 head
            vec2 dirv = normalize(uB - uA);
            vec2 n = vec2(-dirv.y, dirv.x) * 0.0016 * vT;
            gl_Position = vec4(mix(uA, uB, vT) + n * position.y, 0.9999, 1.0); // at the far plane: the Earth and Moon hide it
          }`,
        fragmentShader: /* glsl */ `
          uniform float uFade; varying float vT;
          void main() { gl_FragColor = vec4(vec3(0.97, 0.98, 1.0) * vT * vT * uFade, 1.0); }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array([0, -1, 0, 0, 1, 0, 1, -1, 0, 1, 1, 0]), 3));
    g.setIndex([0, 2, 1, 1, 2, 3]);
    return g;
  }, []);
  const st = useRef({ clock: 0, next: 4, t: -1, from: new THREE.Vector2(), step: new THREE.Vector2() });

  useFrame((_, dt) => {
    const m = mesh.current;
    if (!m) return;
    const s = st.current;
    s.clock += dt * speed();
    if (s.t < 0) {
      m.visible = false;
      if (s.clock < s.next) return;
      s.t = 0;
      s.from.set(Math.random() * 1.6 - 0.6, 0.45 + Math.random() * 0.45);
      s.step.set(-(0.9 + Math.random() * 0.4), -(0.25 + Math.random() * 0.2));
    }
    s.t += (dt * speed()) / 0.55; // fast: ~0.55 s across
    const head = Math.min(1, s.t);
    mat.uniforms.uB.value.copy(s.from).addScaledVector(s.step, head);
    mat.uniforms.uA.value.copy(s.from).addScaledVector(s.step, Math.max(0, head - 0.18));
    mat.uniforms.uFade.value = Math.sin(head * Math.PI) * 0.7;
    m.visible = true;
    if (s.t >= 1) {
      s.t = -1;
      s.next = s.clock + 6 + Math.random() * 6;
    }
  });

  return <mesh ref={mesh} geometry={geo} material={mat} frustumCulled={false} renderOrder={-9} />;
}
