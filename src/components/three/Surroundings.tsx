import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { LINE, OPEN_LINE, PLATFORMS, TUNNELS } from "./world";
import { BRAND, cityWindows } from "./worldArt";

/** Dusk sky: navy overhead fading to a faint magenta glow at the horizon. Follows the camera. */
export function SkyDome() {
  const mesh = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { uTop: { value: new THREE.Color("#060a14") }, uMid: { value: new THREE.Color("#141a33") }, uGlow: { value: new THREE.Color("#5a1a46") } },
        vertexShader: /* glsl */ `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uGlow; varying vec3 vDir;
          void main(){
            float h = vDir.y;
            vec3 c = mix(uMid, uTop, smoothstep(0.05, 0.55, h));
            c += uGlow * exp(-pow(max(h, 0.0) * 9.0, 1.6)) * 0.9 * smoothstep(-0.04, 0.0, h);
            // Below the horizon: the dark city floor, not glowing sky.
            c = mix(vec3(0.012, 0.016, 0.03), c, smoothstep(-0.06, 0.0, h));
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    [],
  );
  useFrame(() => mesh.current?.position.copy(camera.position));
  return (
    <mesh ref={mesh} material={mat} renderOrder={-1}>
      <sphereGeometry args={[380, 32, 16]} />
    </mesh>
  );
}

/** Layered city silhouettes with lit windows on both sides of the line. */
export function Skyline({ lowPower }: { lowPower: boolean }) {
  const layers = useMemo(() => {
    const rng = (a: number, b: number) => a + Math.random() * (b - a);
    const make = (count: number, xMin: number, xMax: number, hMin: number, hMax: number) =>
      Array.from({ length: count }, () => {
        const side = Math.random() < 0.72 ? 1 : -1; // the open side is mostly to the right of travel
        return { x: LINE.trackX + side * rng(xMin, xMax), z: rng(-880, 120), w: rng(7, 20), d: rng(7, 18), h: rng(hMin, hMax) };
      });
    return [make(lowPower ? 50 : 110, 42, 95, 8, 36), make(lowPower ? 60 : 130, 95, 170, 20, 90), make(lowPower ? 40 : 90, 170, 280, 30, 140)];
  }, [lowPower]);
  const windows = useMemo(() => cityWindows(), []);
  const refs = useRef<THREE.InstancedMesh[]>([]);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    layers.forEach((layer, li) => {
      layer.forEach((b, i) => {
        m.compose(new THREE.Vector3(b.x, LINE.trackY - 6 + b.h / 2, b.z), q, new THREE.Vector3(b.w, b.h, b.d));
        refs.current[li]!.setMatrixAt(i, m);
      });
      refs.current[li]!.instanceMatrix.needsUpdate = true;
    });
  }, [layers]);

  return (
    <group>
      {/* The city floor the towers stand on. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, LINE.trackY - 6, -380]}>
        <planeGeometry args={[900, 1400]} />
        <meshStandardMaterial color="#05070c" roughness={1} />
      </mesh>
      {layers.map((layer, li) => (
        <instancedMesh key={li} ref={(m) => void (refs.current[li] = m!)} args={[undefined, undefined, layer.length]}>
          <boxGeometry args={[1, 1, 1]} />
          {li < 2 ? (
            <meshStandardMaterial color="#05070c" roughness={0.9} emissive="#ffffff" emissiveMap={windows} emissiveIntensity={li === 0 ? 0.9 : 0.6} />
          ) : (
            <meshBasicMaterial color="#0a0f1d" />
          )}
        </instancedMesh>
      ))}
    </group>
  );
}

/** Tunnels: concrete tube, ring lights and long light streaks that rush past at speed. */
export function Tunnels() {
  const mats = useMemo(
    () => ({
      wall: new THREE.MeshStandardMaterial({ color: "#15181f", roughness: 0.9, side: THREE.BackSide }),
      ring: new THREE.MeshBasicMaterial({ color: new THREE.Color("#fff1d6").multiplyScalar(1.6), toneMapped: false }),
      streakPink: new THREE.MeshBasicMaterial({ color: new THREE.Color(BRAND.pink).multiplyScalar(2.2), toneMapped: false }),
      streakYellow: new THREE.MeshBasicMaterial({ color: new THREE.Color(BRAND.yellow).multiplyScalar(1.6), toneMapped: false }),
      portal: new THREE.MeshStandardMaterial({ color: "#20252f", roughness: 0.8 }),
    }),
    [],
  );
  return (
    <group>
      {TUNNELS.map((t) => {
        const len = t.z0 - t.z1;
        const cz = (t.z0 + t.z1) / 2;
        const rings = Math.floor(len / 6);
        return (
          <group key={t.z0}>
            <mesh position={[LINE.trackX - 1.2, LINE.trackY, cz]} rotation={[Math.PI / 2, 0, 0]} material={mats.wall}>
              <cylinderGeometry args={[6.4, 6.4, len, 48, 1, true]} />
            </mesh>
            {Array.from({ length: rings }, (_, i) => (
              <mesh key={i} position={[LINE.trackX - 1.2, LINE.trackY, t.z0 - 3 - i * 6]} material={mats.ring}>
                <torusGeometry args={[6.2, 0.035, 6, 64]} />
              </mesh>
            ))}
            <mesh position={[LINE.trackX - 6.1, LINE.trackY + 2.4, cz]} material={mats.streakPink}>
              <boxGeometry args={[0.04, 0.04, len]} />
            </mesh>
            <mesh position={[LINE.trackX + 3.6, LINE.trackY + 3.4, cz]} material={mats.streakYellow}>
              <boxGeometry args={[0.03, 0.03, len]} />
            </mesh>
            {/* Portal lintels above the openings. */}
            {[t.z0, t.z1].map((z) => (
              <mesh key={z} position={[LINE.trackX - 1.2, LINE.trackY + 6.9, z]} material={mats.portal}>
                <boxGeometry args={[15, 1.4, 0.8]} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

/** Low concrete parapets along the open, elevated stretches. */
export function Viaduct() {
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1d222c", roughness: 0.85 }), []);
  return (
    <group>
      {OPEN_LINE.map((z) => {
        const len = z.z0 - z.z1;
        return [LINE.edgeX - 0.3, LINE.trackX + 2.4].map((x) => (
          <mesh key={`${z.z0}-${x}`} position={[x, LINE.trackY + 0.5, (z.z0 + z.z1) / 2]} material={mat}>
            <boxGeometry args={[0.3, 1, len]} />
          </mesh>
        ));
      })}
    </group>
  );
}

/** Soft cones under canopy lights — volumetric-looking haze without volumetrics. */
export function LightShafts() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const spots = useMemo(() => Object.values(PLATFORMS).flatMap((p) => Array.from({ length: Math.floor((p.z0 - p.z1) / 8) }, (_, i) => p.z0 - 4 - i * 8)), []);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: { uColor: { value: new THREE.Color("#ffe1b3") } },
        vertexShader: /* glsl */ `
          varying float vY; varying vec3 vN; varying vec3 vV;
          void main(){
            vY = uv.y;
            vec4 mv = modelViewMatrix * instanceMatrix * vec4(position,1.0);
            vN = normalize(normalMatrix * mat3(instanceMatrix) * normal);
            vV = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor; varying float vY; varying vec3 vN; varying vec3 vV;
          void main(){
            float rim = pow(abs(dot(vN, vV)), 2.0);
            gl_FragColor = vec4(uColor * 0.045 * rim * smoothstep(0.0, 1.0, vY), 1.0);
          }`,
      }),
    [],
  );
  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    spots.forEach((z, i) => {
      m.setPosition(-1.4, LINE.canopyY / 2, z);
      ref.current!.setMatrixAt(i, m);
    });
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [spots]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, spots.length]} material={mat}>
      <cylinderGeometry args={[0.25, 2.2, LINE.canopyY, 24, 1, true]} />
    </instancedMesh>
  );
}
