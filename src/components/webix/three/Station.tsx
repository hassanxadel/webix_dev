import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";
import { COLORS, PILLAR_ZS, WORLD } from "./layout";
import { floorRoughness, tactilePaving, wallTiles } from "./textures";
import { sceneStore } from "@/lib/scene-store";

const LENGTH = WORLD.startZ - WORLD.endZ;
const MID_Z = (WORLD.startZ + WORLD.endZ) / 2;
const PLATFORM_W = WORLD.edgeX - WORLD.wallX;

/** Ceiling fixtures: rows of fluorescent tubes every few metres. */
function CeilingLights({ count }: { count: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const flickerIndex = 7;

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    let n = 0;
    for (let i = 0; i < count; i++) {
      for (const x of [-4.4, -0.6]) {
        m.setPosition(x, WORLD.ceilingY - 0.12, WORLD.startZ - 4 - i * 4.2);
        ref.current!.setMatrixAt(n++, m);
      }
    }
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [count]);

  // One tired tube flickers, like every real station has.
  useFrame(({ clock }) => {
    if (!ref.current || sceneStore.get().reducedMotion) return;
    const t = clock.elapsedTime;
    const on = Math.sin(t * 23) + Math.sin(t * 7.3) > -1.2 || Math.sin(t * 0.5) > 0;
    const m = new THREE.Matrix4();
    m.makeScale(1, 1, on ? 1 : 0.0001);
    m.setPosition(-4.4, WORLD.ceilingY - 0.12, WORLD.startZ - 4 - flickerIndex * 4.2);
    ref.current.setMatrixAt(flickerIndex * 2, m);
    ref.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count * 2]}>
      <boxGeometry args={[0.16, 0.06, 2.6]} />
      <meshBasicMaterial color={new THREE.Color("#ffe2b8").multiplyScalar(2.4)} toneMapped={false} />
    </instancedMesh>
  );
}

function Pillars() {
  return (
    <group>
      {PILLAR_ZS.map((z) => (
        <group key={z} position={[2.1, 0, z]}>
          <mesh position={[0, WORLD.ceilingY / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.55, WORLD.ceilingY, 0.55]} />
            <meshStandardMaterial color="#1b2032" roughness={0.42} metalness={0.55} />
          </mesh>
          {/* Yellow/black safety band at the base. */}
          <mesh position={[0, 0.35, 0]}>
            <boxGeometry args={[0.57, 0.5, 0.57]} />
            <meshStandardMaterial color={COLORS.yellow} roughness={0.5} metalness={0.2} />
          </mesh>
          {/* Small backlit platform-number plate. */}
          <mesh position={[-0.29, 2.6, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[0.42, 0.42]} />
            <meshBasicMaterial color={new THREE.Color(COLORS.yellow).multiplyScalar(1.4)} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Track() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[WORLD.trainX + 1, WORLD.trackY, MID_Z]} receiveShadow>
        <planeGeometry args={[10, LENGTH]} />
        <meshStandardMaterial color="#07080d" roughness={0.95} />
      </mesh>
      {[WORLD.trainX - 0.75, WORLD.trainX + 0.75].map((x) => (
        <mesh key={x} position={[x, WORLD.trackY + 0.08, MID_Z]}>
          <boxGeometry args={[0.08, 0.16, LENGTH]} />
          <meshStandardMaterial color="#8a93a8" roughness={0.25} metalness={1} />
        </mesh>
      ))}
      {/* Platform edge face. */}
      <mesh position={[WORLD.edgeX, (WORLD.trackY + WORLD.floorY) / 2, MID_Z]}>
        <boxGeometry args={[0.1, Math.abs(WORLD.trackY), LENGTH]} />
        <meshStandardMaterial color="#14182a" roughness={0.7} />
      </mesh>
    </group>
  );
}

export function Station({ lowPower }: { lowPower: boolean }) {
  const tiles = useMemo(() => wallTiles(), []);
  const rough = useMemo(() => floorRoughness(), []);
  const tactile = useMemo(() => tactilePaving(), []);

  return (
    <group>
      {/* Polished stone floor — reflections are what sell the neon. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(WORLD.wallX + WORLD.edgeX) / 2, WORLD.floorY, MID_Z]} receiveShadow>
        <planeGeometry args={[PLATFORM_W, LENGTH]} />
        {lowPower ? (
          <meshStandardMaterial color="#0d0f1a" roughness={0.32} metalness={0.6} roughnessMap={rough} />
        ) : (
          <MeshReflectorMaterial
            color="#0b0d17"
            roughness={0.75}
            metalness={0.55}
            roughnessMap={rough}
            blur={[260, 80]}
            resolution={768}
            mixBlur={1.1}
            mixStrength={3.2}
            mixContrast={1.15}
            depthScale={1.1}
            minDepthThreshold={0.35}
            maxDepthThreshold={1.3}
            mirror={0.6}
          />
        )}
      </mesh>

      {/* Tactile paving strip near the platform edge. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[WORLD.edgeX - 0.6, 0.005, MID_Z]}>
        <planeGeometry args={[0.45, LENGTH]} />
        <meshStandardMaterial map={tactile} roughness={0.55} metalness={0.1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[WORLD.edgeX - 0.08, 0.006, MID_Z]}>
        <planeGeometry args={[0.16, LENGTH]} />
        <meshStandardMaterial color="#e9e3d0" roughness={0.6} />
      </mesh>

      {/* Tiled left wall. */}
      <mesh position={[WORLD.wallX, WORLD.ceilingY / 2, MID_Z]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[LENGTH, WORLD.ceilingY]} />
        <meshStandardMaterial map={tiles} roughness={0.28} metalness={0.25} />
      </mesh>
      {/* Wall skirting line in brand red. */}
      <mesh position={[WORLD.wallX + 0.02, 0.5, MID_Z]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[LENGTH, 0.06]} />
        <meshBasicMaterial color={new THREE.Color(COLORS.red).multiplyScalar(1.6)} toneMapped={false} />
      </mesh>

      {/* Ceiling with structural beams. */}
      <mesh position={[3.5, WORLD.ceilingY, MID_Z]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[22, LENGTH]} />
        <meshStandardMaterial color="#06070c" roughness={0.9} />
      </mesh>
      {Array.from({ length: 20 }, (_, i) => (
        <mesh key={i} position={[3.5, WORLD.ceilingY - 0.2, WORLD.startZ - i * 6]}>
          <boxGeometry args={[22, 0.4, 0.3]} />
          <meshStandardMaterial color="#10131f" roughness={0.6} metalness={0.5} />
        </mesh>
      ))}

      {/* Far wall behind the track, with a distant row of warm windows. */}
      <mesh position={[14, 2.4, MID_Z]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[LENGTH, 8]} />
        <meshStandardMaterial color="#080a12" roughness={0.9} />
      </mesh>

      <Track />
      <Pillars />
      <CeilingLights count={28} />
    </group>
  );
}

/** Real light sources. Neon is emissive + bloom; only a few lights do the shading work. */
export function StationLights({ lowPower }: { lowPower: boolean }) {
  const amberZs = lowPower ? [4, -30, -60, -88] : [6, -8, -22, -38, -54, -70, -86];
  const spotTarget = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(-1, 0, -6);
    return o;
  }, []);
  return (
    <group>
      <hemisphereLight args={["#2b3768", "#140816", 0.55]} />
      <ambientLight color="#1c2547" intensity={0.35} />
      {amberZs.map((z) => (
        <pointLight key={z} position={[-2.4, WORLD.ceilingY - 0.5, z]} color={COLORS.amber} intensity={lowPower ? 26 : 20} distance={16} decay={1.6} />
      ))}
      {/* Key light for the hero: a hard spot that throws real shadows across the platform. */}
      <primitive object={spotTarget} />
      <spotLight
        position={[-1, WORLD.ceilingY - 0.3, 2]}
        target={spotTarget}
        angle={0.7}
        penumbra={0.6}
        intensity={34}
        distance={22}
        decay={1.5}
        color="#ffd9a0"
        castShadow={!lowPower}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
      />
      {/* Cool blue fill from the track side — the warm/cool contrast of the grade. */}
      <directionalLight position={[12, 6, -40]} color="#3a5bd0" intensity={0.55} />
    </group>
  );
}
