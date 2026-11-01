import { forwardRef, useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { journeyStore } from "@/lib/journey";
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
/** Sunlight on the Earth comes from that sunrise: a day crescent along the left limb, night (city lights) toward us. */
const EARTH_SUN = GLARE_POS.clone().sub(EARTH_POS).normalize();
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
    const glare = { value: EARTH_SUN };
    const centre = { value: EARTH_POS };
    return {
      surface: new THREE.ShaderMaterial({
        uniforms: { uDay: { value: null }, uNight: { value: null }, uSpec: { value: null }, uSun: sun, uAtmo: { value: new THREE.Color("#3f7dff") } },
        vertexShader: earthVertex,
        fragmentShader: /* glsl */ `
          uniform sampler2D uDay, uNight, uSpec; uniform vec3 uSun, uAtmo;
          varying vec2 vUv; varying vec3 vN; varying vec3 vW;
          void main() {
            vec3 N = normalize(vN);
            vec3 V = normalize(cameraPosition - vW);
            float l = dot(N, uSun);
            float dayMix = smoothstep(-0.16, 0.22, l);
            vec3 day = texture2D(uDay, vUv).rgb;
            vec3 lit = day * (0.02 + 1.05 * max(l, 0.0));
            vec3 nightTex = texture2D(uNight, vUv).rgb;
            float city = smoothstep(0.16, 0.7, dot(nightTex, vec3(0.299, 0.587, 0.114)));
            vec3 lights = vec3(1.0, 0.74, 0.4) * city * 2.4 * (1.0 - dayMix);
            vec3 H = normalize(uSun + V);
            float spec = pow(max(dot(N, H), 0.0), 80.0) * texture2D(uSpec, vUv).r * smoothstep(0.0, 0.35, l) * 1.8;
            float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
            vec3 c = mix(day * 0.012, lit, dayMix) + lights + vec3(1.0, 0.95, 0.86) * spec;
            c += uAtmo * fres * (0.1 + 1.1 * smoothstep(-0.25, 0.45, l));
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }`,
      }),
      clouds: new THREE.ShaderMaterial({
        uniforms: { uClouds: { value: null }, uSun: sun },
        vertexShader: earthVertex,
        fragmentShader: /* glsl */ `
          uniform sampler2D uClouds; uniform vec3 uSun; varying vec2 vUv; varying vec3 vN;
          void main() {
            float l = dot(normalize(vN), uSun);
            float a = texture2D(uClouds, vUv).r * mix(0.12, 0.9, smoothstep(-0.2, 0.25, l));
            gl_FragColor = vec4(vec3(0.02 + 0.95 * max(l, 0.0)), a);
            #include <colorspace_fragment>
          }`,
        transparent: true,
        depthWrite: false,
      }),
      // Scattering shell: glows just outside the limb, fades outward; strongest toward the sunrise.
      atmosphere: new THREE.ShaderMaterial({
        uniforms: { uSun: sun, uGlare: glare, uCentre: centre, uDeep: { value: new THREE.Color("#2f6bff") }, uBright: { value: new THREE.Color("#d6e8ff") } },
        vertexShader: /* glsl */ `
          varying vec3 vNv; varying vec3 vW;
          void main() {
            vNv = normalize(normalMatrix * normal);
            vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uSun, uGlare, uCentre, uDeep, uBright; varying vec3 vNv; varying vec3 vW;
          void main() {
            vec3 n = normalize(vW - uCentre);
            float edge = smoothstep(0.0, -0.19, vNv.z);            // 1 at the limb → 0 at the shell's edge
            float lit = 0.25 + 0.75 * smoothstep(-0.4, 0.5, dot(n, uSun));
            float sunrise = pow(max(dot(n, uGlare), 0.0), 24.0);
            vec3 c = mix(uDeep, uBright, pow(edge, 6.0)) * pow(edge, 2.2) * lit * 1.6 + uBright * sunrise * pow(edge, 3.0) * 3.0;
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

function useAnchor(nx: number, ny: number, d: number) {
  const { camera, size } = useThree();
  const out = useRef(new THREE.Vector3());
  return () => {
    const halfH = Math.tan(deg((camera as THREE.PerspectiveCamera).fov / 2));
    const halfW = halfH * (size.width / size.height);
    // Direction in the base camera frame, then pitched up by BASE_PITCH.
    return out.current.set(nx * halfW, ny * halfH, -1).normalize().applyAxisAngle(new THREE.Vector3(1, 0, 0), BASE_PITCH).multiplyScalar(d);
  };
}

/* ───────── Moon ───────── */

/** NASA SVS CGI Moon Kit (LRO colour + elevation as bump), right side, lit by the shared sun. */
export function Moon({ low }: { low: boolean }) {
  const map = useProgressiveTexture("/space/moon-2k.webp", null);
  const bump = useProgressiveTexture("/space/moon-bump-1k.webp", null, "data");
  const mesh = useRef<THREE.Mesh>(null);
  const place = useAnchor(low ? 0.55 : 0.72, low ? 0.42 : -0.12, 60);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, bumpScale: 2.2, envMapIntensity: 0 }), []);
  useEffect(() => {
    mat.map = map;
    mat.bumpMap = bump;
    mat.needsUpdate = true;
  }, [map, bump, mat]);
  useFrame((_, dt) => {
    const m = mesh.current;
    if (!m) return;
    m.position.copy(place());
    if (!journeyStore.get().reducedMotion) m.rotation.y += (dt * Math.PI * 2) / 1200;
  });
  return (
    <mesh ref={mesh} material={mat} rotation={[0.1, 2.4, 0]}>
      <sphereGeometry args={[low ? 4.5 : 6.8, 96, 64]} />
    </mesh>
  );
}

/* ───────── Hubble ───────── */

/** NASA 3D Resources Hubble (public domain), small and distant, drifting and turning very slowly. */
export function Hubble() {
  const { scene } = useGLTF("/space/hubble.glb", false);
  const group = useRef<THREE.Group>(null);
  const place = useAnchor(-0.52, 0.6, 34);
  const model = useMemo(() => {
    const m = scene.clone(true);
    const box = new THREE.Box3().setFromObject(m);
    const s = 2.6 / Math.max(...box.getSize(new THREE.Vector3()).toArray());
    m.position.copy(box.getCenter(new THREE.Vector3()).multiplyScalar(-s));
    m.scale.setScalar(s);
    m.traverse((o) => {
      const mat = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (mat && "envMapIntensity" in mat) mat.envMapIntensity = 0.5;
    });
    return m;
  }, [scene]);
  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g) return;
    const reduced = journeyStore.get().reducedMotion;
    const t = reduced ? 0 : clock.elapsedTime;
    g.position.copy(place()).add(new THREE.Vector3(Math.sin(t * 0.02) * 1.2, Math.sin(t * 0.015) * 0.5, 0));
    if (!reduced) {
      g.rotation.y += (dt * Math.PI * 2) / 160;
      g.rotation.z = Math.sin(t * 0.05) * 0.15;
    }
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
        uniforms: { uCore: { value: new THREE.Color("#ffffff") }, uHalo: { value: new THREE.Color("#7fb4ff") } },
        vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uCore, uHalo; varying vec2 vUv;
          void main() {
            vec2 p = (vUv - 0.5) * 2.0;
            float r = length(p);
            float core = exp(-r * r * 900.0) * 9.0 + exp(-r * r * 90.0) * 1.2;
            float halo = exp(-r * 9.0) * 0.55;
            // Flare along the limb (tilted with it) and a fainter cross streak.
            vec2 q = mat2(0.985, 0.17, -0.17, 0.985) * p;
            float streak = exp(-abs(q.y) * 220.0) * exp(-abs(q.x) * 2.6) * 2.2;
            float cross = exp(-abs(q.x) * 160.0) * exp(-abs(q.y) * 7.0) * 0.35;
            vec3 c = uCore * (core + streak) + uHalo * (halo + cross);
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
      <planeGeometry args={[260, 260]} />
    </mesh>
  );
}

useGLTF.preload("/space/hubble.glb", false);
