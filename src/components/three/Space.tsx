import { useMemo, useRef, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { journey, journeyStore } from "@/lib/journey";

const lin = (hex: string) => new THREE.Color(hex); // hex is sRGB; THREE.Color stores it linear

/**
 * The sky: one full-screen quad behind everything. Dark blue (never black):
 * #0B1638 at the top to brand indigo #1A253A at the bottom, a lighter area
 * behind the hero card and a very faint pink / yellow haze in two corners.
 */
export function Sky() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTop: { value: lin("#0b1638") },
          uBottom: { value: lin("#1a253a") },
          uGlow: { value: lin("#15244d") },
          uPink: { value: lin("#ff007f") },
          uYellow: { value: lin("#ffda24") },
          uAspect: { value: 1 },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() { vUv = uv; gl_Position = vec4(position.xy, 1.0, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uTop, uBottom, uGlow, uPink, uYellow; uniform float uAspect; varying vec2 vUv;
          void main() {
            vec3 c = mix(uBottom, uTop, smoothstep(0.0, 1.0, vUv.y));
            vec2 q = (vUv - vec2(0.5, 0.48)) * vec2(uAspect, 1.0);
            c = mix(c, uGlow, smoothstep(0.55, 0.0, length(q)) * 0.85);
            c += uPink * 0.05 * smoothstep(0.75, 0.0, length((vUv - vec2(1.0, 0.0)) * vec2(uAspect, 1.0)));
            c += uYellow * 0.035 * smoothstep(0.6, 0.0, length((vUv - vec2(0.0, 1.0)) * vec2(uAspect, 1.0)));
            gl_FragColor = vec4(c, 1.0);
            #include <colorspace_fragment>
          }`,
        depthTest: false,
        depthWrite: false,
      }),
    [],
  );
  const { size } = useThree();
  mat.uniforms.uAspect.value = size.width / size.height;
  return (
    <mesh material={mat} frustumCulled={false} renderOrder={-20}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

/**
 * Soft matte "clay" shading that ignores the scene's lights and env map, so
 * the objects never change how the card is lit. Lambert from a fixed key,
 * a coloured rim, and a dim factor for distance.
 */
function clay(color: string, rim = "#ffda24", rimAmount = 0.35, dim = 1, flat = false) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: lin(color) }, uRim: { value: lin(rim) }, uRimAmount: { value: rimAmount }, uDim: { value: dim } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vP = mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor, uRim; uniform float uRimAmount, uDim; varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main() {
        vec3 n = ${flat ? "normalize(cross(dFdx(vP), dFdy(vP)))" : "normalize(vN)"};
        float key = max(dot(n, normalize(vec3(0.55, 0.6, 0.6))), 0.0);
        float rim = pow(1.0 - max(dot(n, vV), 0.0), 3.0);
        vec3 c = uColor * (0.28 + 0.72 * key) + uRim * rim * uRimAmount;
        gl_FragColor = vec4(c * uDim, 1.0);
        #include <colorspace_fragment>
      }`,
  });
}

/**
 * Places its children at a screen anchor (nx, ny ∈ −1..1) at distance d in
 * front of the fixed camera, with slow drift and a little cursor / scroll
 * parallax (further = less). Recomputed every frame, so it follows resizes.
 */
function Anchored({ nx, ny, d, spin = 90, children }: { nx: number; ny: number; d: number; spin?: number; children: ReactNode }) {
  const g = useRef<THREE.Group>(null);
  const { camera, size } = useThree();
  const par = useRef(new THREE.Vector2());
  useFrame(({ clock }, dt) => {
    const o = g.current;
    if (!o) return;
    const reduced = journeyStore.get().reducedMotion;
    const halfH = Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov / 2)) * d;
    const halfW = halfH * (size.width / size.height);
    const k = 1 - Math.exp(-dt * 2);
    par.current.x += ((reduced ? 0 : -journey.pointerX) - par.current.x) * k;
    par.current.y += ((reduced ? 0 : journey.pointerY) - par.current.y) * k;
    const near = 12 / d; // closer objects shift more
    const t = reduced ? 0 : clock.elapsedTime;
    o.position.set(
      nx * halfW + par.current.x * near * 0.25 + Math.sin(t * 0.05 + nx * 3) * 0.02 * d,
      ny * halfH + par.current.y * near * 0.18 + (reduced ? 0 : journey.progress * 0.12 * halfH) + Math.cos(t * 0.04 + ny * 3) * 0.015 * d,
      -d,
    );
    if (!reduced) o.rotation.y += (dt * Math.PI * 2) / spin;
  });
  return <group ref={g}>{children}</group>;
}

function Planet() {
  const m = useMemo(() => clay("#24345e", "#ffda24", 0.9), []);
  return (
    <Anchored nx={-1.02} ny={0.92} d={30} spin={120}>
      <mesh material={m}>
        <sphereGeometry args={[7, 64, 48]} />
      </mesh>
    </Anchored>
  );
}

function RingedPlanet() {
  const body = useMemo(() => clay("#ffda24", "#ffffff", 0.25, 0.85), []);
  const ring = useMemo(() => clay("#ff007f", "#ffffff", 0.1, 0.85), []);
  return (
    <Anchored nx={0.86} ny={-0.76} d={40} spin={80}>
      <group rotation={[0.45, 0, 0.35]}>
        <mesh material={body}>
          <sphereGeometry args={[1.25, 48, 32]} />
        </mesh>
        <mesh material={ring} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 0.22]}>
          <torusGeometry args={[2.15, 0.12, 12, 96]} />
        </mesh>
      </group>
    </Anchored>
  );
}

function Moon() {
  const m = useMemo(() => clay("#aab4c8", "#dfe6f5", 0.3, 0.8), []);
  return (
    <Anchored nx={-0.36} ny={0.8} d={34} spin={100}>
      <mesh material={m}>
        <sphereGeometry args={[0.9, 40, 28]} />
      </mesh>
    </Anchored>
  );
}

function Asteroid() {
  const m = useMemo(() => clay("#4a4f5c", "#9aa3b8", 0.2, 0.75, true), []);
  return (
    <Anchored nx={0.1} ny={-0.84} d={22} spin={60}>
      <mesh material={m} rotation={[0.4, 0.2, 0.7]}>
        <icosahedronGeometry args={[0.32, 0]} />
      </mesh>
    </Anchored>
  );
}

/** A simple rocket from primitives, crossing the far sky on a long loop (45 s flight, 15 s rest). */
function Rocket() {
  const g = useRef<THREE.Group>(null);
  const flame = useRef<THREE.Mesh>(null);
  const { camera, size } = useThree();
  const mats = useMemo(
    () => ({
      body: clay("#f4f1ea", "#ffda24", 0.3),
      nose: clay("#ffda24", "#ffffff", 0.2),
      fin: clay("#ff007f", "#ffffff", 0.2),
      window: clay("#1a253a", "#ffda24", 0.6),
      flame: new THREE.MeshBasicMaterial({ color: lin("#ffb347"), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }),
    }),
    [],
  );
  useFrame(({ clock }) => {
    const o = g.current;
    if (!o) return;
    if (journeyStore.get().reducedMotion) {
      o.visible = false;
      return;
    }
    const d = 48;
    const cycle = (clock.elapsedTime + 20) % 60;
    const u = cycle / 45;
    o.visible = u < 1;
    if (!o.visible) return;
    const halfH = Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov / 2)) * d;
    const halfW = halfH * (size.width / size.height);
    const ax = -1.25, ay = 0.38, bx = 1.25, by = 0.95;
    o.position.set(THREE.MathUtils.lerp(ax, bx, u) * halfW, THREE.MathUtils.lerp(ay, by, u) * halfH, -d);
    // Nose along the path.
    o.rotation.z = Math.atan2((by - ay) * halfH, (bx - ax) * halfW) - Math.PI / 2;
    o.rotation.y = clock.elapsedTime * 0.4;
    if (flame.current) flame.current.scale.setScalar(0.85 + Math.sin(clock.elapsedTime * 22) * 0.12);
  });
  return (
    <group ref={g} scale={0.7}>
      <mesh material={mats.body}>
        <cylinderGeometry args={[0.32, 0.32, 1.4, 32]} />
      </mesh>
      <mesh material={mats.nose} position={[0, 1.0, 0]}>
        <coneGeometry args={[0.32, 0.6, 32]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <group key={i} rotation={[0, (i * Math.PI * 2) / 3, 0]}>
          <mesh material={mats.fin} position={[0, -0.55, 0.42]}>
            <boxGeometry args={[0.04, 0.45, 0.3]} />
          </mesh>
        </group>
      ))}
      <mesh material={mats.window} position={[0, 0.25, 0.3]}>
        <circleGeometry args={[0.13, 24]} />
      </mesh>
      <mesh ref={flame} material={mats.flame} position={[0, -0.95, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.16, 0.5, 16]} />
      </mesh>
    </group>
  );
}

/** Max five calm objects; phones get three. */
export function SpaceObjects({ low }: { low: boolean }) {
  return (
    <>
      <Planet />
      <RingedPlanet />
      <Moon />
      {!low && <Asteroid />}
      {!low && <Rocket />}
    </>
  );
}
