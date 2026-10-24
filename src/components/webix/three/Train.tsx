import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { COLORS, WORLD } from "./layout";
import { trainWindows } from "./textures";
import { sceneStore } from "@/lib/scene-store";

const BODY_LEN = 96;
const BODY_H = 3.2;
const BODY_W = 3;
const NOSE_Z = 5;
const BODY_Y = WORLD.trackY + 0.55 + BODY_H / 2;
const SIDE_X = -BODY_W / 2 - 0.01;
const ARRIVAL_SECONDS = 4.2;

/**
 * A procedural high-speed train in Webix livery. It pulls into the platform when
 * the page opens, then idles with a faint body hum and breathing cabin lights.
 */
export function Train() {
  const group = useRef<THREE.Group>(null);
  const cabin = useRef<THREE.MeshBasicMaterial>(null);
  const windows = useMemo(() => trainWindows(), []);
  const start = useRef<number | null>(null);

  const paint = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: COLORS.indigo,
        metalness: 0.55,
        roughness: 0.28,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
      }),
    [],
  );

  useFrame(({ clock }) => {
    if (!group.current) return;
    const reduced = sceneStore.get().reducedMotion;
    if (start.current === null) start.current = clock.elapsedTime;
    const t = Math.min(1, (clock.elapsedTime - start.current) / ARRIVAL_SECONDS);
    // Exponential ease-out: arrives fast, brakes gently into position.
    const arrive = reduced ? 1 : 1 - Math.pow(1 - t, 4);
    group.current.position.z = (1 - arrive) * 70;
    group.current.position.y = reduced ? 0 : Math.sin(clock.elapsedTime * 31) * 0.0025 * arrive;
    if (cabin.current && !reduced) {
      const b = 1.15 + Math.sin(clock.elapsedTime * 0.8) * 0.06;
      cabin.current.color.setScalar(b);
    }
  });

  const sideZ = NOSE_Z - BODY_LEN / 2;

  return (
    <group ref={group}>
      <group position={[WORLD.trainX, BODY_Y, 0]}>
        <RoundedBox args={[BODY_W, BODY_H, BODY_LEN]} radius={0.38} smoothness={4} position={[0, 0, sideZ]} material={paint} castShadow />

        {/* Aerodynamic nose: a stretched ellipsoid fused onto the body. */}
        <mesh position={[0, -0.18, NOSE_Z]} scale={[BODY_W / 2, BODY_H / 2 - 0.1, 7]} material={paint}>
          <sphereGeometry args={[1, 48, 32, 0, Math.PI * 2, 0, Math.PI]} />
        </mesh>
        {/* Cockpit glass. */}
        <mesh position={[0, 0.72, NOSE_Z + 3.1]} rotation={[-0.32, 0, 0]} scale={[1.05, 0.42, 2.4]}>
          <sphereGeometry args={[1, 32, 16]} />
          <meshPhysicalMaterial color="#04050a" roughness={0.05} metalness={0.9} clearcoat={1} />
        </mesh>
        {/* Headlights. */}
        {[-0.75, 0.75].map((x) => (
          <mesh key={x} position={[x, -0.55, NOSE_Z + 5.6]} scale={[0.32, 0.12, 0.3]}>
            <sphereGeometry args={[1, 16, 8]} />
            <meshBasicMaterial color={new THREE.Color("#fff3d6").multiplyScalar(6)} toneMapped={false} />
          </mesh>
        ))}

        {/* Platform-side livery: cabin windows, yellow band, red pinstripe. */}
        <group position={[SIDE_X, 0, sideZ]} rotation={[0, -Math.PI / 2, 0]}>
          <mesh position={[0, 0.55, 0]}>
            <planeGeometry args={[BODY_LEN - 2, 0.62]} />
            <meshBasicMaterial ref={cabin} map={windows} toneMapped={false} />
          </mesh>
          <mesh position={[0, -0.32, 0]}>
            <planeGeometry args={[BODY_LEN - 1, 0.22]} />
            <meshStandardMaterial color={COLORS.yellow} emissive={COLORS.yellow} emissiveIntensity={0.35} roughness={0.35} />
          </mesh>
          <mesh position={[0, -0.5, 0]}>
            <planeGeometry args={[BODY_LEN - 1, 0.06]} />
            <meshStandardMaterial color={COLORS.red} emissive={COLORS.red} emissiveIntensity={0.6} roughness={0.35} />
          </mesh>
          {/* Doors every carriage. */}
          {Array.from({ length: 8 }, (_, i) => (
            <mesh key={i} position={[-BODY_LEN / 2 + 8 + i * 11.5, -0.05, 0.002]}>
              <planeGeometry args={[1.1, 2.4]} />
              <meshStandardMaterial color="#0c1222" roughness={0.3} metalness={0.7} />
            </mesh>
          ))}
        </group>

        {/* Underframe shadow gap. */}
        <mesh position={[0, -BODY_H / 2 - 0.25, sideZ]}>
          <boxGeometry args={[BODY_W - 0.5, 0.5, BODY_LEN]} />
          <meshStandardMaterial color="#030306" roughness={1} />
        </mesh>
      </group>
    </group>
  );
}
