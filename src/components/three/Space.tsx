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
 * Light on the Earth, as angles from the point under the camera toward the
 * sunrise. Sun: 115°, from behind, so the visible cap is night with only a thin
 * day crescent at the limb on the sunrise side. Moonlight: 55° the other way,
 * a cool grazing light from the right that shows the relief.
 */
const [EARTH_SUN, EARTH_MOONLIGHT] = (() => {
  const c = EARTH_POS.clone().negate().normalize();
  const g = GLARE_POS.clone().sub(EARTH_POS).normalize();
  const u = g.sub(c.clone().multiplyScalar(g.dot(c))).normalize();
  const at = (a: number) => c.clone().multiplyScalar(Math.cos(deg(a))).addScaledVector(u, Math.sin(deg(a))).normalize();
  return [at(115), at(-55)];
})();
/** Exposure for the Earth's surface only (city lights and the rim are added after it, so they still bloom). */
const EARTH_EXPOSURE = 0.6;
/** Moonlit night side, as a fraction of daylight per channel: cool blue, dim, continents still readable. */
const NIGHT_TINT = new THREE.Color().setRGB(0.22, 0.34, 0.62);
/** Where the sunrise is, seen from the camera (sky tint). */
export const GLARE_DIR = GLARE_POS.clone().normalize();
/**
 * The same sun as a key light for the near objects (Moon, Hubble, card):
 * from the left, slightly toward the viewer, so their faces catch it.
 */
export const SUN_DIR = new THREE.Vector3(-0.9, 0.2, 0.4).normalize();

/* ───────── Earth ───────── */

const earthVertex = /* glsl */ `
  varying vec2 vUv; varying vec3 vN; varying vec3 vT; varying vec3 vW;
  void main() {
    vUv = uv;
    vN = normalize(mat3(modelMatrix) * normal);
    // East (SphereGeometry's +u direction) for the normal map's tangent frame.
    vT = mat3(modelMatrix) * vec3(normal.z, 0.0, -normal.x);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

/**
 * Earth at night, like the ISS photographs. NASA Blue Marble terrain lit only
 * by a dim cool moonlight (oceans darker and faintly glossy, land matte, relief
 * from a NASA GEBCO normal map), Black Marble city lights as warm emissive
 * (dense clusters glow wider), and a thin sunlit crescent at the limb near the
 * sunrise. Outside it a thin crisp blue rim with a faint green airglow band
 * above, gold only near the sun. Very slow spin; a faint grey-blue cloud shell
 * turns a little faster and partly veils the lights.
 */
export function Earth({ low }: { low: boolean }) {
  const day = useProgressiveTexture("/space/earth-day-2k.webp", low ? null : "/space/earth-day-4k.webp");
  const night = useProgressiveTexture("/space/earth-night-2k.webp", low ? null : "/space/earth-night-4k.webp");
  const clouds = useProgressiveTexture("/space/earth-clouds-2k.webp", low ? null : "/space/earth-clouds-4k.webp", "data");
  const normal = useProgressiveTexture("/space/earth-normal-2k.webp", low ? null : "/space/earth-normal-4k.webp", "data");
  const land = useProgressiveTexture("/space/earth-land-2k.webp", null, "data");
  const spin = useRef<THREE.Group>(null);
  const cloudSpin = useRef<THREE.Mesh>(null);

  const mats = useMemo(() => {
    const sun = { value: EARTH_SUN };
    const moon = { value: EARTH_MOONLIGHT };
    const tint = { value: NIGHT_TINT };
    const exposure = { value: EARTH_EXPOSURE };
    return {
      surface: new THREE.ShaderMaterial({
        uniforms: {
          uDay: { value: null },
          uNight: { value: null },
          uNormal: { value: null },
          uLand: { value: null },
          uSun: sun,
          uMoon: moon,
          uTint: tint,
          uExposure: exposure,
          uCityLo: { value: new THREE.Color("#ffb547") },
          uCityHi: { value: new THREE.Color("#ffd27a") },
          uAtmo: { value: new THREE.Color("#3f7dff") },
          uGold: { value: new THREE.Color("#ffd27a") },
        },
        vertexShader: earthVertex,
        fragmentShader: /* glsl */ `
          uniform sampler2D uDay, uNight, uNormal, uLand;
          uniform vec3 uSun, uMoon, uTint, uCityLo, uCityHi, uAtmo, uGold; uniform float uExposure;
          varying vec2 vUv; varying vec3 vN; varying vec3 vT; varying vec3 vW;
          float lum(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
          void main() {
            vec3 N0 = normalize(vN);
            vec3 T = normalize(vT - N0 * dot(vT, N0) + 1e-5 * N0.yzx); // epsilon: the poles have no east
            vec3 tn = texture2D(uNormal, vUv).xyz * 2.0 - 1.0;
            vec3 N = normalize(T * tn.x + cross(N0, T) * tn.y + N0 * tn.z);
            vec3 V = normalize(cameraPosition - vW);
            float land = texture2D(uLand, vUv).r;
            vec3 day = texture2D(uDay, vUv).rgb;

            // Both lights graze the visible cap, so relief is shading relative to the smooth sphere.
            float l = dot(N0, uSun);
            float dayMix = smoothstep(-0.03, 0.1, l);
            float sunRelief = clamp(1.0 + (dot(N, uSun) - l) * 5.0, 0.4, 1.6);
            float m = dot(N0, uMoon);
            float moonRelief = clamp(1.0 + (dot(N, uMoon) - m) * 4.0, 0.5, 1.6);

            vec3 moonlit = mix(vec3(lum(day)), day, 0.35) * uTint * (0.3 + 0.7 * max(m, 0.0)) * moonRelief * mix(0.45, 1.0, land);
            vec3 sunlit = day * sunRelief * 1.15;
            // Oceans only: a sun glint near the sunrise limb, a faint cool moon sheen.
            float glint = pow(max(dot(N0, normalize(uSun + V)), 0.0), 120.0) * dayMix * 1.5;
            float sheen = pow(max(dot(N0, normalize(uMoon + V)), 0.0), 30.0) * 0.06;
            vec3 spec = (1.0 - land) * (vec3(1.0, 0.9, 0.75) * glint + uTint * sheen);

            vec3 c = mix(moonlit, sunlit, dayMix) + spec;
            // Only a thin blue edge at the very limb (no haze over the surface), warm on the sunlit crescent.
            float fres = pow(1.0 - max(dot(N0, V), 0.0), 10.0);
            c += uAtmo * fres * mix(0.12, 0.5, smoothstep(-0.3, 0.1, l)) + uGold * fres * dayMix * 0.3;

            // City lights (Black Marble), added after exposure so the cores bloom; a blurred mip widens dense clusters.
            float city = smoothstep(0.03, 0.6, lum(texture2D(uNight, vUv).rgb));
            float spread = smoothstep(0.02, 0.3, lum(texture2D(uNight, vUv, 3.0).rgb));
            vec3 lights = (mix(uCityLo, uCityHi, city * city) * pow(city, 1.3) * 3.0 + uCityLo * spread * 0.25) * (1.0 - dayMix);

            gl_FragColor = vec4(c * uExposure + lights, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
      clouds: new THREE.ShaderMaterial({
        uniforms: { uClouds: { value: null }, uSun: sun, uMoon: moon, uTint: tint, uExposure: exposure },
        vertexShader: earthVertex,
        fragmentShader: /* glsl */ `
          uniform sampler2D uClouds; uniform vec3 uSun, uMoon, uTint; uniform float uExposure; varying vec2 vUv; varying vec3 vN;
          void main() {
            vec3 n = normalize(vN);
            float dayMix = smoothstep(-0.03, 0.1, dot(n, uSun));
            vec3 night = uTint * 0.55 * (0.35 + 0.65 * max(dot(n, uMoon), 0.0)); // grey-blue, moonlit
            float a = texture2D(uClouds, vUv).r * mix(0.38, 0.85, dayMix);
            gl_FragColor = vec4(mix(night, vec3(1.1), dayMix) * uExposure, a);
            #include <colorspace_fragment>
          }`,
        transparent: true,
        depthWrite: false,
      }),
      // Limb, from each view ray's tangent altitude above the surface: a thin crisp blue line (bright on the
      // sunrise side, dim on the night side), a faint green airglow band ~100 km up, gold only toward the sun.
      atmosphere: new THREE.ShaderMaterial({
        uniforms: {
          uSun: sun,
          uCentre: { value: EARTH_POS },
          uR: { value: EARTH_R },
          uGlareDir: { value: GLARE_DIR },
          uBlue: { value: new THREE.Color("#5b9bff") },
          uGreen: { value: new THREE.Color("#6dff9e") },
          uGold: { value: new THREE.Color("#ffd27a") },
        },
        vertexShader: /* glsl */ `
          varying vec3 vW;
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uSun, uCentre, uGlareDir, uBlue, uGreen, uGold; uniform float uR; varying vec3 vW;
          void main() {
            vec3 rd = normalize(vW - cameraPosition);
            vec3 p = cameraPosition + rd * dot(uCentre - cameraPosition, rd); // closest approach to the centre
            float h = length(p - uCentre) / uR - 1.0;                         // tangent altitude, Earth radii
            if (h < 0.0) discard;                                             // ray hits the Earth
            float sunSide = smoothstep(-0.35, 0.15, dot(normalize(p - uCentre), uSun));
            float line = exp(-h / 0.0022);
            float soft = exp(-h / 0.008) * 0.18;
            vec3 blue = uBlue * (line + soft) * mix(0.22, 1.4, sunSide);
            float air = exp(-pow((h - 0.016) / 0.0022, 2.0)) * 0.1 * (1.0 - 0.7 * sunSide);
            float toSun = pow(max(dot(rd, uGlareDir), 0.0), 60.0);
            gl_FragColor = vec4(blue + uGreen * air + uGold * (line + soft * 2.0) * toSun * 2.2, 1.0);
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
    mats.surface.uniforms.uNormal.value = normal;
    mats.surface.uniforms.uLand.value = land;
    mats.clouds.uniforms.uClouds.value = clouds;
  }, [day, night, normal, land, clouds, mats]);

  useFrame((_, dt) => {
    const s = motionStep(dt);
    if (spin.current) spin.current.rotation.y += (s * Math.PI * 2) / 3600;
    if (cloudSpin.current) cloudSpin.current.rotation.y += (s * Math.PI * 2) / 2400;
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
          <mesh ref={cloudSpin} material={mats.clouds} scale={1.004}>
            <sphereGeometry args={[EARTH_R, segs, segs / 2]} />
          </mesh>
        </group>
      </group>
      {/* Tall enough for the airglow band (h ≈ 0.016 R). */}
      <mesh material={mats.atmosphere} scale={1.026}>
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

/** The Moon's orbit: a circle around the camera's base position, centred 8° up, tilted 13° so it climbs as it crosses right → left. */
const MOON_ORBIT = new THREE.Quaternion().setFromEuler(new THREE.Euler(deg(8), 0, deg(-13)));
const MOON_DIST = 60;
const MOON_PERIOD = 70; // seconds per loop
/** Kepler-like easing: slow in front, fast behind the camera, so ~38% of each loop is on screen (16:9). */
const MOON_EASE = 0.5;

/**
 * NASA SVS CGI Moon Kit: LRO colour with a normal map built from its
 * elevation data, so craters show relief along the terminator. Orbits the
 * camera: crosses the view right → left, climbing a little, exits left, goes
 * round behind us and re-enters from the right. Lit by the fixed sun key, so
 * its phase changes along the way. Behind the card (which always draws on top)
 * and the HTML headline.
 */
export function Moon({ low }: { low: boolean }) {
  const map = useProgressiveTexture("/space/moon-2k.webp", null);
  const normal = useProgressiveTexture("/space/moon-normal-2k.webp", null, "data");
  const narrow = useThree((s) => s.size.width < s.size.height);
  const mesh = useRef<THREE.Mesh>(null);
  const t = useRef(MOON_PERIOD * 0.93); // first frame: just right of centre, heading left
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
    const a = ((t.current / MOON_PERIOD) % 1) * Math.PI * 2;
    const yaw = -(a - MOON_EASE * Math.sin(a)); // + is right of centre
    m.position.set(Math.sin(yaw), 0, -Math.cos(yaw)).applyQuaternion(MOON_ORBIT).multiplyScalar(MOON_DIST);
    m.rotation.y += (s * Math.PI * 2) / 240;
  });
  return (
    <mesh ref={mesh} material={mat} rotation={[0.1, 2.4, 0]} scale={narrow ? 0.7 : 1}>
      <sphereGeometry args={[6.8, low ? 64 : 128, low ? 48 : 96]} />
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
            // Tight: a hot core and a small halo, no wide wash over the Earth.
            float core = exp(-r * r * 900.0) * 9.0 + exp(-r * r * 160.0) * 0.6;
            float halo = exp(-r * 20.0) * 0.16;
            float warm = exp(-r * 9.0) * 0.05; // faint golden glow around the sunrise
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
