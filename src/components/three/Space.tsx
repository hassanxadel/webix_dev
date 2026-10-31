import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { journeyStore } from "@/lib/journey";

/** Low, grazing sun from the right / back (world position of the light; it points at SUN_TARGET). */
export const SUN_POS = new THREE.Vector3(70, 10, -110);
export const SUN_TARGET = new THREE.Vector3(0, -3, -30);
const SUN_DIR = SUN_POS.clone().sub(SUN_TARGET).normalize();
/** Sky colour at the horizon; the fog uses it too, so the terrain fades into the sky. */
export const HORIZON = "#122042";
const GROUND_Y = -3;

/* ───────── noise (value noise + fBm), used once at build time ───────── */

function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise(x: number, y: number) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x: number, y: number, oct = 5) {
  let f = 0, amp = 0.5, fr = 1;
  for (let i = 0; i < oct; i++) {
    f += amp * noise(x * fr, y * fr);
    fr *= 2.03;
    amp *= 0.5;
  }
  return f;
}

/* ───────── sky ───────── */

/**
 * Dark blue sky dome (never black): #0A1430 overhead to #122042 at the
 * horizon, a faint atmospheric glow band just above it, and a very faint
 * blue-magenta nebula high in one corner.
 */
export function SkyDome() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTop: { value: new THREE.Color("#0a1430") },
          uHorizon: { value: new THREE.Color(HORIZON) },
          uBand: { value: new THREE.Color("#2b3f7a") },
          uNebula: { value: new THREE.Color("#5a3d9a") },
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uTop, uHorizon, uBand, uNebula; varying vec3 vDir;
          void main() {
            float y = vDir.y;
            vec3 c = mix(uHorizon, uTop, smoothstep(0.0, 0.55, y));
            c += uBand * exp(-abs(y - 0.015) * 38.0) * 0.45;
            float neb = smoothstep(0.55, 0.0, distance(vDir, normalize(vec3(-0.55, 0.62, -0.55))));
            c += uNebula * neb * neb * 0.07;
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }`,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    [],
  );
  return (
    <mesh material={mat} renderOrder={-20} frustumCulled={false}>
      <sphereGeometry args={[480, 48, 24]} />
    </mesh>
  );
}

/* ───────── lunar surface ───────── */

/** Tileable fine-detail normal map for the regolith, painted once on a canvas. */
function regolithNormalMap(size = 256) {
  const h = (x: number, y: number) => fbm((x / size) * 16, (y / size) * 16, 4) + noise(x * 0.9, y * 0.9) * 0.12;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * 6;
      const dy = (h(x, y + 1) - h(x, y - 1)) * 6;
      const n = new THREE.Vector3(-dx, -dy, 1).normalize();
      const i = (y * size + x) * 4;
      img.data.set([(n.x * 0.5 + 0.5) * 255, (n.y * 0.5 + 0.5) * 255, (n.z * 0.5 + 0.5) * 255, 255], i);
    }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(40, 40);
  return t;
}

/**
 * 200×200 moon surface: fBm hills and soft craters (bowl + raised rim),
 * displaced once at build time so shadows and normals come for free. Grey
 * regolith (#5E636D–#8A8F99), rough, not shiny; the grazing sun throws long
 * shadows across it and the exponential fog fades it into the horizon.
 */
export function Terrain({ low }: { low: boolean }) {
  const geo = useMemo(() => {
    const seg = low ? 140 : 256;
    const g = new THREE.PlaneGeometry(200, 200, seg, seg);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, -90);
    let seed = 42;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const craters = Array.from({ length: 18 }, () => ({ x: (rnd() - 0.5) * 120, z: -8 - rnd() * 150, r: 2.5 + rnd() * rnd() * 14, d: 0.4 + rnd() * 0.5 }));
    const pos = g.attributes.position as THREE.BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    const dark = new THREE.Color("#5e636d"), light = new THREE.Color("#8a8f99"), tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      // Calm right under the card, rolling further out.
      const reach = THREE.MathUtils.smoothstep(Math.hypot(x, z + 6), 4, 30);
      let y = (fbm(x * 0.025, z * 0.025) - 0.5) * 5 * (0.35 + 0.65 * reach) + (fbm(x * 0.12, z * 0.12, 3) - 0.5) * 0.6;
      for (const c of craters) {
        const d = Math.hypot(x - c.x, z - c.z) / c.r;
        if (d < 1) y -= c.r * 0.22 * c.d * (1 - d * d);
        y += c.r * 0.07 * c.d * Math.exp(-((d - 1) * (d - 1)) / 0.06);
      }
      pos.setY(i, GROUND_Y + y);
      tmp.copy(dark).lerp(light, THREE.MathUtils.clamp(fbm(x * 0.06 + 9, z * 0.06, 3) * 1.3 - 0.15, 0, 1));
      col.set([tmp.r, tmp.g, tmp.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }, [low]);

  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.95,
        metalness: 0,
        normalMap: regolithNormalMap(),
        normalScale: new THREE.Vector2(0.7, 0.7),
        // The city HDRI is there for the card; keep it off the moon.
        envMapIntensity: 0.08,
      }),
    [],
  );
  useEffect(() => () => mat.normalMap?.dispose(), [mat]);

  return <mesh geometry={geo} material={mat} receiveShadow castShadow />;
}

/** Warm grazing sun (casts the long crater shadows) and a cool blue fill from the left. Both also light the card. */
export function SunLights({ low }: { low: boolean }) {
  const sun = useRef<THREE.DirectionalLight>(null);
  useEffect(() => {
    const l = sun.current;
    if (!l) return;
    l.target.position.copy(SUN_TARGET);
    l.target.updateMatrixWorld();
    const cam = l.shadow.camera;
    cam.left = -45;
    cam.right = 45;
    cam.top = 45;
    cam.bottom = -45;
    cam.near = 1;
    cam.far = 260;
    cam.updateProjectionMatrix();
  }, []);
  return (
    <>
      <directionalLight
        ref={sun}
        position={SUN_POS}
        color="#ffe6c4"
        intensity={2.6}
        castShadow
        shadow-mapSize={[low ? 1024 : 2048, low ? 1024 : 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.06}
        shadow-radius={4}
      />
      <directionalLight position={[-40, 14, 22]} color="#7f9cff" intensity={0.45} />
    </>
  );
}

/* ───────── planet on the horizon ───────── */

/**
 * Neptune (Solar System Scope, CC BY 4.0), tinted toward brand blue, lit
 * from the sun direction with a clear day/night terminator, behind a thin
 * Fresnel atmosphere (blue core, faint pink edge). Very slow rotation.
 */
export function Planet({ low }: { low: boolean }) {
  const map = useLoader(THREE.TextureLoader, low ? "/space/neptune-1k.webp" : "/space/neptune-2k.webp");
  map.colorSpace = THREE.SRGBColorSpace;
  const body = useRef<THREE.Mesh>(null);
  const mats = useMemo(() => {
    const sun = { value: SUN_DIR };
    return {
      surface: new THREE.ShaderMaterial({
        uniforms: { uMap: { value: map }, uSun: sun, uTint: { value: new THREE.Color("#7f9cff") }, uHaze: { value: new THREE.Color(HORIZON) } },
        vertexShader: /* glsl */ `
          varying vec2 vUv; varying vec3 vN; varying float vY;
          void main() {
            vUv = uv; vN = normalize(mat3(modelMatrix) * normal);
            vec4 w = modelMatrix * vec4(position, 1.0); vY = w.y;
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: /* glsl */ `
          uniform sampler2D uMap; uniform vec3 uSun, uTint, uHaze; varying vec2 vUv; varying vec3 vN; varying float vY;
          void main() {
            vec3 tex = texture2D(uMap, vUv).rgb * mix(vec3(1.0), uTint, 0.35);
            float l = dot(normalize(vN), uSun);
            float day = smoothstep(-0.08, 0.35, l);
            vec3 c = tex * (0.015 + 1.15 * day);
            // Low on the horizon the planet sits in the moon's haze.
            c = mix(c, uHaze, smoothstep(30.0, -20.0, vY) * 0.55);
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }`,
        fog: false,
      }),
      atmosphere: new THREE.ShaderMaterial({
        uniforms: { uSun: sun, uCore: { value: new THREE.Color("#5f86ff") }, uEdge: { value: new THREE.Color("#ff007f") } },
        vertexShader: /* glsl */ `
          varying vec3 vN; varying vec3 vV;
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0);
            vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz);
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uSun, uCore, uEdge; varying vec3 vN; varying vec3 vV;
          void main() {
            float f = 1.0 - max(dot(normalize(vN), vV), 0.0);
            float rim = pow(f, 3.0);
            float lit = 0.15 + 0.85 * smoothstep(-0.35, 0.45, dot(normalize(vN), uSun));
            vec3 c = mix(uCore, uEdge, smoothstep(0.75, 1.0, f) * 0.35) * rim * lit * 1.4;
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    };
  }, [map]);

  useFrame((_, dt) => {
    if (body.current && !journeyStore.get().reducedMotion) body.current.rotation.y += (dt * Math.PI * 2) / 900;
  });

  return (
    <group position={[-150, -24, -330]} rotation={[0.12, 0, 0.18]}>
      <mesh ref={body} material={mats.surface}>
        <sphereGeometry args={[70, 96, 64]} />
      </mesh>
      <mesh material={mats.atmosphere} scale={1.045}>
        <sphereGeometry args={[70, 96, 64]} />
      </mesh>
    </group>
  );
}

/* ───────── floating dust ───────── */

/** ~150 soft motes near the camera, drifting slowly; the nearest are large and out of focus (bokeh). */
export function Dust({ low }: { low: boolean }) {
  const count = low ? 70 : 150;
  const geo = useMemo(() => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const p = new Float32Array(count * 3);
    const s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      p.set([(rnd() - 0.5) * 12, (rnd() - 0.5) * 5, -1 - rnd() * 13], i * 3);
      s[i] = rnd();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(s, 1));
    return g;
  }, [count]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uDpr: { value: 1 } },
        vertexShader: /* glsl */ `
          attribute float aSeed; uniform float uTime; uniform float uDpr; varying float vNear; varying float vSeed;
          void main() {
            vec3 p = position;
            p.x = mod(p.x + uTime * (0.04 + aSeed * 0.05) + 6.0, 12.0) - 6.0;
            p.y = mod(p.y + uTime * (0.015 + aSeed * 0.02) + 2.5, 5.0) - 2.5;
            vec4 mv = viewMatrix * vec4(p, 1.0);
            vNear = smoothstep(-3.5, -1.0, mv.z); vSeed = aSeed;
            gl_Position = projectionMatrix * mv;
            gl_PointSize = (2.0 + aSeed * 3.0 + vNear * 40.0) * uDpr * (4.0 / max(1.0, -mv.z));
          }`,
        fragmentShader: /* glsl */ `
          varying float vNear; varying float vSeed;
          void main() {
            float r = length(gl_PointCoord - 0.5) * 2.0;
            float sharp = exp(-r * r * 6.0);
            float bokeh = smoothstep(1.0, 0.8, r) * (0.55 + 0.45 * smoothstep(0.4, 0.95, r));
            float a = mix(sharp, bokeh * 0.22, vNear) * (0.35 + 0.4 * vSeed);
            if (a < 0.003) discard;
            gl_FragColor = vec4(vec3(0.8, 0.86, 1.0) * a, 1.0);
          }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    [],
  );
  useFrame(({ clock, viewport }) => {
    // Reduced motion: the motes hold still.
    if (!journeyStore.get().reducedMotion) mat.uniforms.uTime.value = clock.elapsedTime;
    mat.uniforms.uDpr.value = viewport.dpr;
  });
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}
