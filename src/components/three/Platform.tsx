import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";
import { LINE, PLATFORMS, type Zone } from "./world";
import { BRAND, nameBoard, stoneTiles, tactile, wetRoughness } from "./worldArt";

const PLATFORM_W = LINE.edgeX - LINE.wallX;
const PLATFORM_CX = (LINE.edgeX + LINE.wallX) / 2;

/** Mounts its children once the camera comes within `ahead` units of the zone — and keeps them. */
export function Near({ zone, ahead = 160, children }: { zone: Zone; ahead?: number; children: ReactNode }) {
  const [on, setOn] = useState(false);
  const { camera } = useThree();
  useFrame(() => {
    if (!on && camera.position.z < zone.z0 + ahead && camera.position.z > zone.z1 - 60) setOn(true);
  });
  return on ? <>{children}</> : null;
}

/** Rails, sleepers and ballast for the whole line, plus catenary poles: one draw call each. */
export function TrackBed() {
  const sleepers = useRef<THREE.InstancedMesh>(null);
  const poles = useRef<THREE.InstancedMesh>(null);
  const arms = useRef<THREE.InstancedMesh>(null);
  const z0 = 140;
  const z1 = -860;
  const len = z0 - z1;
  const sleeperCount = Math.floor(len / 0.9);
  const poleZs = useMemo(() => Array.from({ length: Math.floor(len / 26) }, (_, i) => z0 - 8 - i * 26), [len]);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    for (let i = 0; i < sleeperCount; i++) {
      m.setPosition(LINE.trackX, LINE.trackY + 0.06, z0 - i * 0.9);
      sleepers.current!.setMatrixAt(i, m);
    }
    sleepers.current!.instanceMatrix.needsUpdate = true;
    poleZs.forEach((z, i) => {
      m.setPosition(LINE.trackX + 2.1, LINE.trackY + 3.4, z);
      poles.current!.setMatrixAt(i, m);
      m.setPosition(LINE.trackX + 0.9, LINE.trackY + 6.2, z);
      arms.current!.setMatrixAt(i, m);
    });
    poles.current!.instanceMatrix.needsUpdate = true;
    arms.current!.instanceMatrix.needsUpdate = true;
  }, [sleeperCount, poleZs]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[LINE.trackX, LINE.trackY, (z0 + z1) / 2]} receiveShadow>
        <planeGeometry args={[5.4, len]} />
        <meshStandardMaterial color="#0b0d12" roughness={0.95} />
      </mesh>
      {[-0.72, 0.72].map((dx) => (
        <mesh key={dx} position={[LINE.trackX + dx, LINE.trackY + 0.16, (z0 + z1) / 2]}>
          <boxGeometry args={[0.07, 0.15, len]} />
          <meshStandardMaterial color="#9aa1ad" metalness={1} roughness={0.22} />
        </mesh>
      ))}
      <instancedMesh ref={sleepers} args={[undefined, undefined, sleeperCount]} receiveShadow>
        <boxGeometry args={[2.3, 0.12, 0.24]} />
        <meshStandardMaterial color="#2a2c33" roughness={0.9} />
      </instancedMesh>
      {/* Catenary: poles, arms and the contact wire. */}
      <instancedMesh ref={poles} args={[undefined, undefined, poleZs.length]}>
        <boxGeometry args={[0.18, 6.8, 0.18]} />
        <meshStandardMaterial color="#3a3f4c" metalness={0.7} roughness={0.45} />
      </instancedMesh>
      <instancedMesh ref={arms} args={[undefined, undefined, poleZs.length]}>
        <boxGeometry args={[2.6, 0.08, 0.08]} />
        <meshStandardMaterial color="#3a3f4c" metalness={0.7} roughness={0.45} />
      </instancedMesh>
      <mesh position={[LINE.trackX, LINE.trackY + 6.05, (z0 + z1) / 2]}>
        <boxGeometry args={[0.02, 0.02, len]} />
        <meshStandardMaterial color="#6d7280" metalness={1} roughness={0.3} />
      </mesh>
    </group>
  );
}

type PlatformProps = {
  zone: Zone;
  num: string;
  en: string;
  jp: string;
  prev?: string;
  next?: string;
  /** Wall behind the platform (closed stations) or open to the city. */
  wall?: boolean;
  children?: ReactNode;
};

/** A station platform: stone floor, tactile line, lit edge, canopy with light strips, pillars and name boards. */
export function Platform({ zone, num, en, jp, prev, next, wall = true, children }: PlatformProps) {
  const len = zone.z0 - zone.z1;
  const cz = (zone.z0 + zone.z1) / 2;
  const mats = useMemo(() => {
    const strip = new THREE.MeshBasicMaterial({ color: new THREE.Color("#fff3dc").multiplyScalar(2.2), toneMapped: false });
    return {
      floor: new THREE.MeshStandardMaterial({ map: stoneTiles([PLATFORM_W / 2.4, len / 2.4]), roughness: 0.45, metalness: 0.15 }),
      tactile: new THREE.MeshStandardMaterial({ map: tactile([1, len / 0.6]), roughness: 0.6 }),
      edgeLight: new THREE.MeshBasicMaterial({ color: new THREE.Color(BRAND.pink).multiplyScalar(1.8), toneMapped: false }),
      concrete: new THREE.MeshStandardMaterial({ color: "#1c212b", roughness: 0.85 }),
      steel: new THREE.MeshPhysicalMaterial({ color: "#2b303b", metalness: 0.85, roughness: 0.32 }),
      roof: new THREE.MeshStandardMaterial({ color: "#0c0f16", roughness: 0.8, metalness: 0.4 }),
      wall: new THREE.MeshStandardMaterial({ color: "#121722", roughness: 0.55, metalness: 0.2 }),
      strip,
      board: new THREE.MeshBasicMaterial({ map: nameBoard(num, en, jp, prev, next), toneMapped: false, color: new THREE.Color(1.05, 1.05, 1.05) }),
    };
  }, [len, num, en, jp, prev, next]);

  const pillars = Math.floor(len / 12);
  const strips = Math.floor(len / 4);
  const boardZs = [zone.z0 - len * 0.28, zone.z0 - len * 0.72];

  return (
    <group>
      {/* Platform slab. */}
      <mesh position={[PLATFORM_CX, -0.6, cz]} material={mats.concrete} receiveShadow>
        <boxGeometry args={[PLATFORM_W, 1.2, len]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[PLATFORM_CX, 0.001, cz]} material={mats.floor} receiveShadow>
        <planeGeometry args={[PLATFORM_W, len]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[LINE.edgeX - 0.7, 0.004, cz]} material={mats.tactile}>
        <planeGeometry args={[0.36, len]} />
      </mesh>
      {/* Platform-edge light line. */}
      <mesh position={[LINE.edgeX + 0.005, -0.06, cz]} rotation={[0, Math.PI / 2, 0]} material={mats.edgeLight}>
        <planeGeometry args={[len, 0.03]} />
      </mesh>

      {/* Canopy: roof plate, steel beams, linear light strips. */}
      <mesh position={[PLATFORM_CX + 0.6, LINE.canopyY + 0.12, cz]} material={mats.roof}>
        <boxGeometry args={[PLATFORM_W + 1.6, 0.18, len]} />
      </mesh>
      {Array.from({ length: strips }, (_, i) => (
        <mesh key={i} position={[-1.4, LINE.canopyY - 0.02, zone.z0 - 2 - i * 4]} material={mats.strip}>
          <boxGeometry args={[0.1, 0.04, 2.8]} />
        </mesh>
      ))}
      {Array.from({ length: pillars }, (_, i) => (
        <mesh key={i} position={[-3.8, LINE.canopyY / 2, zone.z0 - 6 - i * 12]} material={mats.steel} castShadow>
          <cylinderGeometry args={[0.16, 0.18, LINE.canopyY, 20]} />
        </mesh>
      ))}

      {wall && (
        <mesh position={[LINE.wallX, 2.6, cz]} rotation={[0, Math.PI / 2, 0]} material={mats.wall} receiveShadow>
          <planeGeometry args={[len, 5.4]} />
        </mesh>
      )}

      {/* Hanging name boards, facing both directions of travel. */}
      {boardZs.map((z) => (
        <group key={z} position={[-1.4, 3.9, z]}>
          {[-0.45, 0.45].map((x) => (
            <mesh key={x} position={[x * 2.4, 0.75, 0]} material={mats.steel}>
              <cylinderGeometry args={[0.015, 0.015, 1.1, 8]} />
            </mesh>
          ))}
          <mesh material={mats.roof}>
            <boxGeometry args={[2.86, 0.88, 0.08]} />
          </mesh>
          <mesh position={[0, 0, 0.042]} material={mats.board}>
            <planeGeometry args={[2.8, 0.84]} />
          </mesh>
          <mesh position={[0, 0, -0.042]} rotation={[0, Math.PI, 0]} material={mats.board}>
            <planeGeometry args={[2.8, 0.84]} />
          </mesh>
        </group>
      ))}
      {children}
    </group>
  );
}

/**
 * Wet, mirror-like floor. One reflector plane follows the camera along the
 * platforms (reflections cost a second render, so there is only ever one);
 * its puddle texture is world-locked so the floor never appears to slide.
 */
export function ReflectiveFloor() {
  const mesh = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const L = 70;
  const repeat: [number, number] = [PLATFORM_W / 3, L / 3];
  const rough = useMemo(() => wetRoughness(repeat), []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => {
    if (!mesh.current) return;
    const z = camera.position.z - L * 0.42;
    const zones = Object.values(PLATFORMS);
    const onPlatform = zones.some((zn) => camera.position.z < zn.z0 + 12 && camera.position.z > zn.z1 - 6);
    mesh.current.visible = onPlatform;
    // Stay within the current platform so the mirror never hangs over the track or a tunnel.
    const zone = zones.find((zn) => camera.position.z < zn.z0 + 40 && camera.position.z > zn.z1 - 40);
    const clamped = zone ? Math.min(zone.z0 - L / 2, Math.max(zone.z1 + L / 2, z)) : z;
    mesh.current.position.z = clamped;
    rough.offset.y = (-clamped * repeat[1]) / L;
  });

  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[PLATFORM_CX - 0.2, 0.006, 0]}>
      <planeGeometry args={[PLATFORM_W - 0.9, L]} />
      <MeshReflectorMaterial
        color="#0c0f16"
        roughness={0.7}
        roughnessMap={rough}
        metalness={0.4}
        blur={[240, 70]}
        resolution={512}
        mixBlur={1}
        mixStrength={2.2}
        mixContrast={1}
        depthScale={1}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.3}
        mirror={0.55}
        transparent
        opacity={0.82}
      />
    </mesh>
  );
}

/**
 * Four real lights that travel with the camera, snapping to the canopy grid
 * ahead of it. Real shading where it matters, and a fixed light count so
 * shaders never recompile mid-journey.
 */
export function CanopyLights() {
  const { camera } = useThree();
  const lights = useRef<THREE.PointLight[]>([]);
  useFrame(() => {
    const zones = Object.values(PLATFORMS);
    const near = zones.some((zn) => camera.position.z < zn.z0 + 20 && camera.position.z > zn.z1 - 20);
    const base = Math.round((camera.position.z - 6) / 12) * 12;
    lights.current.forEach((l, k) => {
      if (!l) return;
      l.position.set(-1.4, LINE.canopyY - 0.4, base + 12 - k * 12);
      l.intensity = near ? 9 : 0;
    });
  });
  return (
    <>
      {[0, 1, 2, 3].map((k) => (
        <pointLight key={k} ref={(l) => void (lights.current[k] = l!)} color="#ffe9c9" intensity={0} distance={16} decay={1.6} />
      ))}
    </>
  );
}
