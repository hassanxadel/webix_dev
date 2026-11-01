import { forwardRef, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { journey, journeyStore } from "@/lib/journey";
import { useProgressiveTexture } from "./textures";

const deg = THREE.MathUtils.degToRad;

/** World direction for an azimuth (− left, + right) and elevation (degrees); the camera looks down −z. */
const dir = (az: number, el: number) => new THREE.Vector3(Math.sin(deg(az)) * Math.cos(deg(el)), Math.sin(deg(el)), -Math.cos(deg(az)) * Math.cos(deg(el)));

/** Camera framing: looking 3° up, so the Earth's limb fills the lower ~35–40% of the frame. */
export const BASE_PITCH = deg(3);
/** Earth: radius 100, centre below-left, so its limb runs from mid-left down to the lower right, under the card. */
const EARTH_R = 100;
const EARTH_POS = dir(-22, -64).multiplyScalar(116);
/** The sun is rising just behind the limb near the left edge. */
const GLARE_POS = dir(-30, -4.2).multiplyScalar(400);
/**
 * Sunlight on the Earth comes from that sunrise, from behind: 112 degrees away
 * from the point under the camera, so the visible cap is night (city lights)
 * with only a thin day crescent along the limb on the sunrise side.
 */
const EARTH_SUN = (() => {
  const c = EARTH_POS.clone().negate().normalize();
  const g = GLARE_POS.clone().sub(EARTH_POS).normalize();
  const u = g.sub(c.clone().multiplyScalar(g.dot(c))).normalize();
  return c.multiplyScalar(Math.cos(deg(112))).addScaledVector(u, Math.sin(deg(112))).normalize();
})();
/** Exposure for the Earth only (city lights still reach bloom). */
const EARTH_EXPOSURE = 0.7;
/** Where the sunrise is, seen from the camera (sky tint). */
export const GLARE_DIR = GLARE_POS.clone().normalize();
/**
 * The same sun as a key light for the near objects (Moon, Hubble, card):
 * from the left, slightly toward the viewer, so their faces catch it.
 */
export const SUN_DIR = new THREE.Vector3(-0.9, 0.2, 0.4).normalize();

/* ───────── Earth ───────── */

const earthVertex = /* glsl */ `
  varying vec2 vUv; varying vec3 vN; varying vec3 vW;
  void main() {
    vUv = uv;
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

/**
 * NASA Blue Marble (day) / Black Marble (night) Earth: the sun direction
 * blends day into night across a soft terminator, cities glow warm on the
 * night side, oceans catch a specular highlight, and a blue scattering haze
 * thickens toward the limb, brightest on the sunrise side. Very slow spin;
 * a separate cloud shell turns a little faster and dims at night.
 */
export function Earth({ low }: { low: boolean }) {
  const day = useProgressiveTexture("/space/earth-day-2k.webp", low ? null : "/space/earth-day-4k.webp");
  const night = useProgressiveTexture("/space/earth-night-2k.webp", low ? null : "/space/earth-night-4k.webp");
  const clouds = useProgressiveTexture("/space/earth-clouds-2k.webp", low ? null : "/space/earth-clouds-4k.webp", "data");
  const spec = useProgressiveTexture("/space/earth-spec-2k.webp", null, "data");
  const spin = useRef<THREE.Group>(null);
  const cloudSpin = useRef<THREE.Mesh>(null);

  const mats = useMemo(() => {
    const sun = { value: EARTH_SUN };
    const glare = { value: GLARE_POS.clone().sub(EARTH_POS).normalize() };
    const exposure = { value: EARTH_EXPOSURE };
    const centre = { value: EARTH_POS };
    return {
      surface: new THREE.ShaderMaterial({
        uniforms: { uDay: { value: null }, uNight: { value: null }, uSpec: { value: null }, uSun: sun, uExposure: exposure, uAtmo: { value: new THREE.Color("#3f7dff") } },
        vertexShader: earthVertex,
        fragmentShader: /* glsl */ `
          uniform sampler2D uDay, uNight, uSpec; uniform vec3 uSun, uAtmo; uniform float uExposure;
          varying vec2 vUv; varying vec3 vN; varying vec3 vW;
          void main() {
            vec3 N = normalize(vN);
            vec3 V = normalize(cameraPosition - vW);
            float l = dot(N, uSun);
            float dayMix = smoothstep(-0.06, 0.2, l);
            vec3 day = texture2D(uDay, vUv).rgb;
            vec3 lit = day * (0.02 + 1.05 * max(l, 0.0));
            vec3 nightTex = texture2D(uNight, vUv).rgb;
            float city = smoothstep(0.16, 0.7, dot(nightTex, vec3(0.299, 0.587, 0.114)));
            vec3 lights = vec3(1.0, 0.74, 0.4) * city * 2.4 * (1.0 - dayMix);
            vec3 H = normalize(uSun + V);
            float spec = pow(max(dot(N, H), 0.0), 80.0) * texture2D(uSpec, vUv).r * smoothstep(0.0, 0.35, l) * 1.8;
            // The camera skims the Earth, so most of the cap is seen at a grazing angle:
            // keep the haze to a thin band right at the limb, not the whole surface.
            float fres = pow(1.0 - max(dot(N, V), 0.0), 8.0);
            vec3 c = mix(day * 0.008, lit, dayMix) + vec3(1.0, 0.95, 0.86) * spec;
            c += uAtmo * fres * (0.04 + 0.5 * smoothstep(-0.15, 0.45, l));
            c = c * uExposure + lights;
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
      clouds: new THREE.ShaderMaterial({
        uniforms: { uClouds: { value: null }, uSun: sun, uExposure: exposure },
        vertexShader: earthVertex,
        fragmentShader: /* glsl */ `
          uniform sampler2D uClouds; uniform vec3 uSun; uniform float uExposure; varying vec2 vUv; varying vec3 vN;
          void main() {
            float l = dot(normalize(vN), uSun);
            float a = texture2D(uClouds, vUv).r * mix(0.06, 0.85, smoothstep(-0.1, 0.25, l));
            gl_FragColor = vec4(vec3(0.01 + 0.9 * max(l, 0.0)) * uExposure, a);
            #include <colorspace_fragment>
          }`,
        transparent: true,
        depthWrite: false,
      }),
      // Scattering shell: glows just outside the limb, fades outward; strongest toward the sunrise.
      atmosphere: new THREE.ShaderMaterial({
        uniforms: {
          uSun: sun,
          uGlare: glare,
          uCentre: centre,
          uDeep: { value: new THREE.Color("#2f6bff") },
          uBright: { value: new THREE.Color("#d6e8ff") },
          uGold: { value: new THREE.Color("#ffd27a") },
          uPink: { value: new THREE.Color("#ff007f") },
        },
        vertexShader: /* glsl */ `
          varying vec3 vNv; varying vec3 vW;
          void main() {
            vNv = normalize(normalMatrix * normal);
            vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uSun, uGlare, uCentre, uDeep, uBright, uGold, uPink; varying vec3 vNv; varying vec3 vW;
          void main() {
            vec3 n = normalize(vW - uCentre);
            float edge = smoothstep(0.0, -0.19, vNv.z);            // 1 at the limb → 0 at the shell's edge
            float lit = 0.2 + 0.8 * smoothstep(-0.2, 0.5, dot(n, uSun));
            float sunrise = pow(max(dot(n, uGlare), 0.0), 24.0);
            // Thin and crisp: a tight bright line at the limb over a fast-fading blue glow.
            float line = pow(edge, 10.0);
            vec3 glow = mix(uDeep, uBright, line) * (pow(edge, 3.0) * 0.55 + line * 0.5) * lit;
            // Where it meets the sunrise the rim turns gold, with a faint pink fringe on its outer edge.
            vec3 rise = mix(uBright, uGold, 0.55) * line + uPink * pow(edge, 2.0) * (1.0 - line) * 0.25;
            vec3 c = glow + rise * sunrise * 1.4;
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }`,
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    };
  }, []);

  useEffect(() => {
    mats.surface.uniforms.uDay.value = day;
    mats.surface.uniforms.uNight.value = night;
    mats.surface.uniforms.uSpec.value = spec;
    mats.clouds.uniforms.uClouds.value = clouds;
  }, [day, night, spec, clouds, mats]);

  useFrame((_, dt) => {
    if (journeyStore.get().reducedMotion) return;
    if (spin.current) spin.current.rotation.y += (dt * Math.PI * 2) / 3600;
    if (cloudSpin.current) cloudSpin.current.rotation.y += (dt * Math.PI * 2) / 2400;
  });

  const segs = low ? 128 : 256;
  return (
    <group position={EARTH_POS}>
      {/* Tilted so the Gulf of Mexico (lat 25°, lon −90°) faces the camera, like the reference. */}
      <group rotation={[deg(-65), 0, 0]}>
        <group ref={spin}>
          <mesh material={mats.surface}>
            <sphereGeometry args={[EARTH_R, segs, segs / 2]} />
          </mesh>
          <mesh ref={cloudSpin} material={mats.clouds} scale={1.006}>
            <sphereGeometry args={[EARTH_R, segs, segs / 2]} />
          </mesh>
        </group>
      </group>
      <mesh material={mats.atmosphere} scale={1.018}>
        <sphereGeometry args={[EARTH_R, segs, segs / 2]} />
      </mesh>
    </group>
  );
}

/* ───────── screen anchoring (relative to the base framing, so parallax still shows) ───────── */

/**
 * Places a point at screen coords (nx, ny ∈ −1..1) at distance d, in the base
 * framing (so the camera's own sway still parallaxes it), plus a cursor
 * parallax that is stronger for nearer objects.
 */
function useAnchor(d: number) {
  const { camera, size } = useThree();
  const out = useRef(new THREE.Vector3());
  const par = useRef(new THREE.Vector2());
  return (nx: number, ny: number, dt: number) => {
    const k = 1 - Math.exp(-dt * 1.5);
    par.current.x += (-journey.pointerX - par.current.x) * k;
    par.current.y += (journey.pointerY - par.current.y) * k;
    const depth = 20 / d;
    const halfH = Math.tan(deg((camera as THREE.PerspectiveCamera).fov / 2));
    const halfW = halfH * (size.width / size.height);
    const x = nx + par.current.x * 0.02 * depth;
    const y = ny + par.current.y * 0.015 * depth;
    return out.current.set(x * halfW, y * halfH, -1).normalize().applyAxisAngle(AXIS_X, BASE_PITCH).multiplyScalar(d);
  };
}
const AXIS_X = new THREE.Vector3(1, 0, 0);
/** Ambient motion clock: reduced motion slows it (×0.3), never stops it. */
const motionStep = (dt: number) => dt * (journeyStore.get().reducedMotion ? 0.3 : 1);

/* ───────── Moon ───────── */

/**
 * NASA SVS CGI Moon Kit: LRO colour with a normal map built from its
 * elevation data, so craters show relief along the terminator. Lit by the
 * shared sun key. Drifts on a small ellipse (~50 s), bobs gently and turns
 * slowly, always to the right of the card and below the headline.
 */
export function Moon({ low }: { low: boolean }) {
  const map = useProgressiveTexture("/space/moon-2k.webp", null);
  const normal = useProgressiveTexture("/space/moon-normal-2k.webp", null, "data");
  const mesh = useRef<THREE.Mesh>(null);
  const t = useRef(0);
  const place = useAnchor(60);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, envMapIntensity: 0, normalScale: new THREE.Vector2(1, 1) }), []);
  useEffect(() => {
    mat.map = map;
    mat.normalMap = normal;
    mat.needsUpdate = true;
  }, [map, normal, mat]);
  useFrame((_, dt) => {
    const m = mesh.current;
    if (!m) return;
    const s = motionStep(dt);
    t.current += s;
    const a = (t.current * Math.PI * 2) / 50;
    // Phones: below-right of the card, clear of the headline.
    const [cx, cy] = low ? [0.55, -0.42] : [0.72, -0.1];
    m.position.copy(place(cx + Math.cos(a) * 0.035, cy + Math.sin(a) * 0.028 + Math.sin(t.current * 0.7) * 0.012, dt));
    m.rotation.y += (s * Math.PI * 2) / 240;
  });
  return (
    <mesh ref={mesh} material={mat} rotation={[0.1, 2.4, 0]}>
      <sphereGeometry args={[low ? 4.5 : 6.8, 128, 96]} />
    </mesh>
  );
}

/* ───────── Hubble ───────── */

/** Average colour of a texture's image (8×8), or null when it can't be read. */
function averageColor(tex: THREE.Texture | null) {
  const img = tex?.image as CanvasImageSource | undefined;
  if (!img) return null;
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 8;
    const g = c.getContext("2d")!;
    g.drawImage(img, 0, 0, 8, 8);
    const d = g.getImageData(0, 0, 8, 8).data;
    let r = 0, gr = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) [r, gr, b] = [r + d[i], gr + d[i + 1], b + d[i + 2]];
    return { r, g: gr, b };
  } catch {
    return null;
  }
}

/**
 * NASA 3D Resources Hubble (public domain). Re-materialised as proper PBR:
 * the body is foil-wrapped metal; blue-dominant parts (the solar panels) are
 * dark blue glass with a slight specular, so they catch the sun as it turns.
 * Crosses the upper area on a ~40 s pass, reversing smoothly at each end,
 * tumbling slowly on two axes.
 */
export function Hubble() {
  const { scene } = useGLTF("/space/hubble.glb", false);
  const group = useRef<THREE.Group>(null);
  const t = useRef(0);
  const place = useAnchor(34);
  const model = useMemo(() => {
    const m = scene.clone(true);
    const box = new THREE.Box3().setFromObject(m);
    const s = 2.6 / Math.max(...box.getSize(new THREE.Vector3()).toArray());
    m.position.copy(box.getCenter(new THREE.Vector3()).multiplyScalar(-s));
    m.scale.setScalar(s);
    m.traverse((o) => {
      const mesh = o as THREE.Mesh;
      const src = mesh.material as THREE.MeshStandardMaterial | undefined;
      if (!mesh.isMesh || !src || !("metalness" in src)) return;
      const mat = src.clone();
      const avg = averageColor(mat.map);
      const panel = avg !== null && avg.b > avg.r * 1.15 && avg.b >= avg.g;
      mat.metalness = panel ? 0.35 : 0.85;
      mat.roughness = panel ? 0.28 : 0.38;
      mat.envMapIntensity = panel ? 0.4 : 0.6;
      if (panel) mat.color.set("#2a3f8f");
      mesh.material = mat;
    });
    return m;
  }, [scene]);
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const s = motionStep(dt);
    t.current += s;
    const a = (t.current * Math.PI * 2) / 80; // one way ≈ 40 s
    g.position.copy(place(-0.25 + Math.sin(a) * 0.6, 0.36 + Math.cos(a) * 0.05 + Math.sin(t.current * 0.4) * 0.012, dt));
    g.rotation.x += (s * Math.PI * 2) / 90;
    g.rotation.y += (s * Math.PI * 2) / 60;
  });
  return (
    <group ref={group} rotation={[0.3, 0.8, 0.2]}>
      <primitive object={model} />
    </group>
  );
}

/* ───────── Sun ───────── */

/** Warm-white sun key (same direction as every shader) and blue Earth-shine from below. */
export function SunLights() {
  return (
    <>
      <directionalLight position={SUN_DIR.clone().multiplyScalar(50)} color="#fff3e2" intensity={2.6} />
      <directionalLight position={[0, -10, 2]} color="#3f7dff" intensity={0.9} />
      <hemisphereLight args={["#1b2a52", "#0a1430", 0.25]} />
    </>
  );
}

/** The sun's disc at the sunrise point: the god-rays source (half hidden by the Earth's limb). */
export const SunDisc = forwardRef<THREE.Mesh>(function SunDisc(_, ref) {
  return (
    <mesh ref={ref} position={GLARE_POS}>
      <sphereGeometry args={[7, 32, 16]} />
      <meshBasicMaterial color={new THREE.Color("#fff8ee").multiplyScalar(4)} toneMapped={false} />
    </mesh>
  );
});

/** Sunrise burst: a soft white-blue glow and a thin flare along the limb, always facing the camera. */
export function SunGlare() {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uCore: { value: new THREE.Color("#fff6e4") }, uHalo: { value: new THREE.Color("#9cc1ff") }, uGold: { value: new THREE.Color("#ffda24") } },
        vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uCore, uHalo, uGold; varying vec2 vUv;
          void main() {
            vec2 p = (vUv - 0.5) * 2.0;
            float r = length(p);
            float core = exp(-r * r * 900.0) * 9.0 + exp(-r * r * 90.0) * 1.0;
            float halo = exp(-r * 16.0) * 0.32;
            float warm = exp(-r * 7.0) * 0.07; // faint golden glow (5-8%) around the sunrise
            // Flare along the limb (tilted with it) and a fainter cross streak.
            vec2 q = mat2(0.985, 0.17, -0.17, 0.985) * p;
            float streak = exp(-abs(q.y) * 220.0) * exp(-abs(q.x) * 2.6) * 2.2;
            float cross = exp(-abs(q.x) * 160.0) * exp(-abs(q.y) * 7.0) * 0.35;
            vec3 c = uCore * (core + streak) + uHalo * (halo + cross) + uGold * warm;
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }`,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  useFrame(({ camera }) => mesh.current?.quaternion.copy(camera.quaternion));
  return (
    <mesh ref={mesh} position={GLARE_POS} material={mat} renderOrder={15}>
      <planeGeometry args={[180, 180]} />
    </mesh>
  );
}

useGLTF.preload("/space/hubble.glb", false);
