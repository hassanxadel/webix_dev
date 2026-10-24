import { useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { ABOUT_POSTER, COLORS, CONTACT_WALL_Z, WORLD } from "./layout";
import { neonText, stationSign } from "./textures";
import { sceneStore, useSceneState } from "@/lib/scene-store";

type NeonProps = {
  text: string;
  color: string;
  height: number;
  position: [number, number, number];
  rotation?: [number, number, number];
  vertical?: boolean;
  latin?: boolean;
  intensity?: number;
  /** 0 = steady, higher = more nervous tube. */
  flicker?: number;
  backing?: boolean;
  light?: boolean;
  /** Optional live brightness multiplier (e.g. driven by scroll state). */
  level?: number;
};

/**
 * A neon tube sign: emissive text pushed above the bloom threshold, a dark
 * mounting board behind it and (optionally) a real coloured light that spills
 * onto the wall and floor.
 */
export function NeonSign({
  text,
  color,
  height,
  position,
  rotation = [0, 0, 0],
  vertical,
  latin,
  intensity = 2.6,
  flicker = 0,
  backing = true,
  light = false,
  level = 1,
}: NeonProps) {
  const { texture, aspect } = useMemo(() => neonText(text, color, { vertical, latin }), [text, color, vertical, latin]);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const lamp = useRef<THREE.PointLight>(null);
  const width = height * aspect;
  const current = useRef(level);
  const seed = useMemo(() => Math.random() * 100, []);

  useFrame(({ clock }, dt) => {
    const reduced = sceneStore.get().reducedMotion;
    current.current = THREE.MathUtils.damp(current.current, level, 4, dt);
    let f = 1;
    if (flicker && !reduced) {
      const t = clock.elapsedTime + seed;
      const n = Math.sin(t * 13.1) * Math.sin(t * 2.7) * Math.sin(t * 0.61);
      f = n > 0.86 - flicker * 0.25 ? 0.35 : 1 - flicker * 0.06 * Math.sin(t * 50);
    }
    const v = intensity * f * current.current;
    if (mat.current) mat.current.color.setScalar(v);
    if (lamp.current) lamp.current.intensity = 5 * f * current.current;
  });

  return (
    <group position={position} rotation={rotation}>
      {backing && (
        <mesh position={[0, 0, -0.04]}>
          <boxGeometry args={[width * 0.86, height * 0.9, 0.05]} />
          <meshStandardMaterial color="#07080e" roughness={0.5} metalness={0.6} />
        </mesh>
      )}
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial ref={mat} map={texture} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      {light && <pointLight ref={lamp} position={[0, 0, 0.6]} color={color} intensity={5} distance={7} decay={1.8} />}
    </group>
  );
}

/** Hanging station name board — the first thing you read on the platform. */
function StationBoard() {
  const tex = useMemo(() => stationSign(), []);
  return (
    <group position={[-2.2, 4.15, -5]}>
      {[-1.6, 1.6].map((x) => (
        <mesh key={x} position={[x, 0.95, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 1.1]} />
          <meshStandardMaterial color="#2a2f40" metalness={1} roughness={0.3} />
        </mesh>
      ))}
      <mesh>
        <boxGeometry args={[4.5, 1.48, 0.16]} />
        <meshStandardMaterial color="#141823" metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0, 0.085]}>
        <planeGeometry args={[4.36, 1.36]} />
        <meshBasicMaterial map={tex} color={new THREE.Color(1.15, 1.15, 1.15)} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Freestanding backlit advertising column carrying the Webix logo. */
function BrandColumn() {
  const [wordmark, badge] = useLoader(THREE.TextureLoader, ["/brand/webix-wordmark.webp", "/brand/webix-badge.webp"]);
  wordmark.colorSpace = badge.colorSpace = THREE.SRGBColorSpace;
  const section = useSceneState((s) => s.section);
  const glow = useRef<THREE.MeshBasicMaterial[]>([]);

  useFrame((_, dt) => {
    const target = section === 3 ? 1.12 : 0.75;
    glow.current.forEach((m) => m && m.color.setScalar(THREE.MathUtils.damp(m.color.r, target, 3, dt)));
  });

  return (
    <group position={[ABOUT_POSTER.x, 0, ABOUT_POSTER.z]} rotation={[0, 0.55, 0]}>
      <mesh position={[0, 1.55, 0]} castShadow>
        <boxGeometry args={[2.3, 3.1, 0.4]} />
        <meshStandardMaterial color="#10131d" metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.75, 0.205]}>
        <planeGeometry args={[2.1, 1.47]} />
        <meshBasicMaterial ref={(m) => void (glow.current[0] = m!)} map={wordmark} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.75, -0.205]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[1.5, 1.5]} />
        <meshBasicMaterial ref={(m) => void (glow.current[1] = m!)} map={badge} toneMapped={false} />
      </mesh>
      {/* Thin yellow light-line framing the poster. */}
      <mesh position={[0, 0.88, 0.21]}>
        <planeGeometry args={[2.1, 0.03]} />
        <meshBasicMaterial color={new THREE.Color(COLORS.yellow).multiplyScalar(3)} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 1.8, 1.2]} color="#fff1d0" intensity={4} distance={5} decay={2} />
    </group>
  );
}

export function Signage({ lowPower }: { lowPower: boolean }) {
  const processIndex = useSceneState((s) => s.processIndex);
  const section = useSceneState((s) => s.section);
  const contactLevel = section === 5 ? 1.15 : 0.7;
  const wall = WORLD.wallX + 0.12;
  return (
    <group>
      <StationBoard />

      {/* Hero wall: tall vertical neon, classic Japanese street signage. */}
      <NeonSign text="ウェビックス" color={COLORS.pink} vertical height={4.3} position={[wall, 2.75, -2]} rotation={[0, Math.PI / 2, 0]} flicker={0.6} light={!lowPower} />
      <NeonSign text="デザイン" color={COLORS.yellow} vertical height={3} position={[wall, 3.2, -7.6]} rotation={[0, Math.PI / 2, 0]} intensity={2.2} />
      <NeonSign text="EXIT 出口" color={COLORS.red} latin height={0.42} position={[-3.6, 4.7, -11]} intensity={2} />

      {/* Section headers on the wall. */}
      <NeonSign text="WORK 作品" color={COLORS.yellow} latin height={0.55} position={[wall, 4.45, -23.5]} rotation={[0, Math.PI / 2, 0]} intensity={2.2} backing={false} />
      <NeonSign text="自動販売機" color={COLORS.pink} height={0.5} position={[wall, 4.1, -44.5]} rotation={[0, Math.PI / 2, 0]} flicker={0.3} />
      <NeonSign text="PROCESS 工程" color={COLORS.blue} latin height={0.5} position={[wall, 4.4, -62]} rotation={[0, Math.PI / 2, 0]} intensity={2} level={processIndex >= 0 ? 1 : 0.5} />

      {/* End wall: the destination of the whole journey. */}
      <NeonSign text="はじめよう" color={COLORS.pink} height={1.35} position={[-2.6, 3.7, CONTACT_WALL_Z + 0.2]} intensity={2.8} light level={contactLevel} />
      <NeonSign text="START A PROJECT" color={COLORS.yellow} latin height={0.55} position={[-2.6, 2.55, CONTACT_WALL_Z + 0.2]} intensity={2.4} backing={false} level={contactLevel} />
      <mesh position={[3.5, 2.8, CONTACT_WALL_Z]}>
        <planeGeometry args={[22, 6]} />
        <meshStandardMaterial color="#0a0c15" roughness={0.6} metalness={0.3} />
      </mesh>

      <BrandColumn />
    </group>
  );
}
