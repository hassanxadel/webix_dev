import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { GATES_Z, GATE_AISLE_X, LINE, READER } from "./world";
import { BRAND, neonVertical, stoneTiles } from "./worldArt";
import { journey } from "@/lib/journey";
import { STATIONS } from "@/config/stations";

const CABINETS = [-5.8, -4.4, -3.0, -1.6, -0.2, 1.2];
const DEPTH = 1.7;
const TAP = STATIONS[0].stamp;
const YELLOW = new THREE.Color(BRAND.yellow);

/** Flap travel 0..1 for the aisle the visitor uses: opens just after the tap. */
const flapOpen = (p: number) => Math.min(1, Math.max(0, (p - TAP - 0.002) / 0.014));
/** Reader flash: a bright pulse at the moment of the tap, then a steady glow. */
const readerFlash = (p: number) => {
  const d = Math.abs(p - TAP);
  return d < 0.006 ? 1 - d / 0.006 : 0;
};

/** Modern fare gates (改札機): brushed stainless, dark glass tops, yellow LED readers, smoked-glass flaps. */
export function TicketGates() {
  const flaps = useRef<THREE.Group[]>([]);
  const reader = useRef<THREE.MeshBasicMaterial>(null);
  const mats = useMemo(
    () => ({
      body: new THREE.MeshPhysicalMaterial({ color: "#b8bcc6", metalness: 0.95, roughness: 0.26, clearcoat: 0.2 }),
      top: new THREE.MeshPhysicalMaterial({ color: "#0b0f18", metalness: 0.2, roughness: 0.1, clearcoat: 1 }),
      led: new THREE.MeshBasicMaterial({ color: new THREE.Color(BRAND.yellow).multiplyScalar(1.8), toneMapped: false }),
      flap: new THREE.MeshPhysicalMaterial({ color: "#2a2f3d", transparent: true, opacity: 0.55, roughness: 0.08, clearcoat: 1, envMapIntensity: 1.6 }),
      flapEdge: new THREE.MeshBasicMaterial({ color: new THREE.Color(BRAND.pink).multiplyScalar(2), toneMapped: false }),
      arrow: new THREE.MeshBasicMaterial({ color: new THREE.Color("#3dff9a").multiplyScalar(1.4), toneMapped: false }),
    }),
    [],
  );

  useFrame(() => {
    const p = journey.progress;
    const open = flapOpen(p);
    flaps.current.forEach((f) => {
      if (!f) return;
      const dir = f.userData.dir as number;
      const active = f.userData.active as boolean;
      // Flaps fold back into their cabinet.
      f.scale.x = active ? Math.max(0.05, 1 - open) : 1;
      f.position.x = f.userData.x0 - dir * (active ? open * 0.16 : 0);
    });
    if (reader.current) reader.current.color.copy(YELLOW).multiplyScalar(1.8 + readerFlash(p) * 6);
  });

  return (
    <group position={[0, 0, GATES_Z]}>
      {CABINETS.map((x, ci) => {
        const isTapped = x === READER.x;
        return (
          <group key={x} position={[x, 0, 0]}>
            <RoundedBox args={[0.34, 1.02, DEPTH]} radius={0.07} smoothness={4} position={[0, 0.51, 0]} material={mats.body} castShadow receiveShadow />
            <RoundedBox args={[0.36, 0.05, DEPTH + 0.02]} radius={0.02} smoothness={2} position={[0, 1.04, 0]} material={mats.top} />
            {/* Card reader at the entry end. */}
            {isTapped ? (
              <mesh position={[0, 1.068, READER.z]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.085, 40]} />
                <meshBasicMaterial ref={reader} toneMapped={false} />
              </mesh>
            ) : (
              <mesh position={[0, 1.068, READER.z]} rotation={[-Math.PI / 2, 0, 0]} material={mats.led}>
                <circleGeometry args={[0.085, 40]} />
              </mesh>
            )}
            <mesh position={[0, 1.068, -0.45]} rotation={[-Math.PI / 2, 0, 0]} material={mats.arrow}>
              <planeGeometry args={[0.08, 0.14]} />
            </mesh>
            {/* Flaps on both sides of the cabinet, reaching into the aisles. */}
            {[-1, 1].map((dir) => {
              if ((ci === 0 && dir < 0) || (ci === CABINETS.length - 1 && dir > 0)) return null;
              const x0 = dir * 0.33;
              const aisleX = x + dir * 0.7;
              const active = Math.abs(aisleX - GATE_AISLE_X) < 0.05;
              return (
                <group key={dir} ref={(g) => void (g && (flaps.current[ci * 2 + (dir > 0 ? 1 : 0)] = Object.assign(g, { userData: { dir, active, x0 } })))} position={[x0, 0.72, -0.1]}>
                  <RoundedBox args={[0.3, 0.36, 0.03]} radius={0.012} smoothness={2} material={mats.flap} />
                  <mesh position={[dir * 0.15, 0, 0]} material={mats.flapEdge}>
                    <boxGeometry args={[0.012, 0.34, 0.035]} />
                  </mesh>
                </group>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

/** The concourse before the gates, with the vertical neon sign "ウェビックス". */
export function Concourse() {
  const neon = useMemo(() => neonVertical("ウェビックス", BRAND.pink), []);
  const floor = useMemo(() => stoneTiles([4, 6]), []);
  const h = 3.6;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(LINE.edgeX + LINE.wallX) / 2, 0.001, 8]}>
        <planeGeometry args={[LINE.edgeX - LINE.wallX, 12]} />
        <meshStandardMaterial map={floor} roughness={0.4} metalness={0.15} />
      </mesh>
      <mesh position={[(LINE.edgeX + LINE.wallX) / 2, -0.6, 8]}>
        <boxGeometry args={[LINE.edgeX - LINE.wallX, 1.2, 12]} />
        <meshStandardMaterial color="#1c212b" roughness={0.85} />
      </mesh>
      {/* Neon sign on a dark mount, right of the gates. */}
      <group position={[2.0, 2.65, -3]} rotation={[0, -0.35, 0]}>
        <mesh position={[0, 0, -0.04]}>
          <boxGeometry args={[h * neon.aspect * 0.9, h * 0.98, 0.06]} />
          <meshStandardMaterial color="#090c13" metalness={0.6} roughness={0.4} />
        </mesh>
        <mesh>
          <planeGeometry args={[h * neon.aspect, h]} />
          <meshBasicMaterial map={neon.texture} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} color={new THREE.Color(2.2, 2.2, 2.2)} />
        </mesh>
        <pointLight position={[0, 0, 0.7]} color={BRAND.pink} intensity={3} distance={6} decay={2} />
      </group>
    </group>
  );
}
