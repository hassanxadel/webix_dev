import { useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS, PROCESS_Z, SERVICE_Z, WORLD } from "./layout";
import { vendingFront } from "./textures";
import { NeonSign } from "./Signage";
import { PROCESS, SERVICES } from "@/lib/webix-data";
import { sceneStore, useSceneState } from "@/lib/scene-store";
import { scrollToStage } from "@/lib/scroll-stage";

const pointer = {
  over: (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = "pointer";
  },
  out: () => {
    document.body.style.cursor = "";
  },
};

/* ───────────────────────── Services: vending machines ───────────────────────── */

function VendingMachine({ index }: { index: number }) {
  const service = SERVICES[index];
  const front = useMemo(() => vendingFront(service.short, service.jp, service.color), [service]);
  const panel = useRef<THREE.MeshBasicMaterial>(null);
  const side = useRef<THREE.MeshBasicMaterial>(null);
  const body = useRef<THREE.Group>(null);
  const color = useMemo(() => new THREE.Color(service.color), [service]);

  useFrame((_, dt) => {
    const s = sceneStore.get();
    const focus = s.hoverService === index ? 1 : s.section === 2 && s.serviceIndex === index ? 0.9 : 0.3;
    if (panel.current) panel.current.color.setScalar(THREE.MathUtils.damp(panel.current.color.r, 0.45 + focus * 0.85, 4, dt));
    if (side.current) {
      const k = THREE.MathUtils.damp(side.current.userData.k ?? 0.5, 0.5 + focus * 3, 4, dt);
      side.current.userData.k = k;
      side.current.color.copy(color).multiplyScalar(k);
    }
    if (body.current) body.current.position.x = THREE.MathUtils.damp(body.current.position.x, WORLD.wallX + 0.55 + focus * 0.1, 5, dt);
  });

  return (
    <group
      ref={body}
      position={[WORLD.wallX + 0.55, 0, SERVICE_Z(index)]}
      rotation={[0, Math.PI / 2, 0]}
      onPointerOver={(e) => {
        pointer.over(e);
        sceneStore.set({ hoverService: index });
      }}
      onPointerOut={() => {
        pointer.out();
        if (sceneStore.get().hoverService === index) sceneStore.set({ hoverService: null });
      }}
      onClick={(e) => {
        e.stopPropagation();
        scrollToStage("services", index);
      }}
    >
      <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.3, 2.1, 0.85]} />
        <meshStandardMaterial color="#151a29" metalness={0.65} roughness={0.35} />
      </mesh>
      <mesh position={[0, 1.08, 0.43]}>
        <planeGeometry args={[1.16, 1.98]} />
        <meshBasicMaterial ref={panel} map={front} toneMapped={false} />
      </mesh>
      {/* Coloured light bars on both edges of the cabinet. */}
      {[-0.66, 0.66].map((x) => (
        <mesh key={x} position={[x, 1.05, 0.43]}>
          <boxGeometry args={[0.03, 2.05, 0.03]} />
          <meshBasicMaterial ref={x < 0 ? side : undefined} color={color} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function ServiceSpot() {
  // A single real light that glides to the selected machine instead of four lights.
  const light = useRef<THREE.PointLight>(null);
  const color = useRef(new THREE.Color());
  useFrame((_, dt) => {
    if (!light.current) return;
    const s = sceneStore.get();
    const i = s.hoverService ?? s.serviceIndex;
    light.current.position.z = THREE.MathUtils.damp(light.current.position.z, SERVICE_Z(i), 4, dt);
    color.current.set(SERVICES[i].color);
    light.current.color.lerp(color.current, 1 - Math.exp(-dt * 4));
    light.current.intensity = THREE.MathUtils.damp(light.current.intensity, s.section === 2 ? 9 : 2, 3, dt);
  });
  return <pointLight ref={light} position={[WORLD.wallX + 2.2, 1.6, SERVICE_Z(0)]} distance={6} decay={1.7} intensity={2} />;
}

export function VendingMachines() {
  return (
    <group>
      {SERVICES.map((s, i) => (
        <VendingMachine key={s.name} index={i} />
      ))}
      <ServiceSpot />
    </group>
  );
}

/* ───────────────────────── Process: light gates ───────────────────────── */

const GATE_COLORS = [COLORS.yellow, COLORS.pink, COLORS.red, COLORS.blue];

function Gate({ index }: { index: number }) {
  const step = PROCESS[index];
  const processIndex = useSceneState((s) => s.processIndex);
  const section = useSceneState((s) => s.section);
  const lit = section > 4 || (section === 4 && processIndex >= index);
  const tube = useRef<THREE.MeshBasicMaterial>(null);
  const color = useMemo(() => new THREE.Color(GATE_COLORS[index]), [index]);
  const z = PROCESS_Z(index);
  const left = WORLD.wallX + 0.5;
  const right = WORLD.edgeX - 0.5;
  const top = 4.5;
  const width = right - left;

  useFrame((_, dt) => {
    if (!tube.current) return;
    const k = THREE.MathUtils.damp(tube.current.userData.k ?? 0.08, lit ? 3.4 : 0.08, 3.5, dt);
    tube.current.userData.k = k;
    tube.current.color.copy(color).multiplyScalar(k);
  });

  const frame = (
    <meshStandardMaterial color="#141826" metalness={0.8} roughness={0.35} />
  );

  return (
    <group
      position={[0, 0, z]}
      onPointerOver={pointer.over}
      onPointerOut={pointer.out}
      onClick={(e) => {
        e.stopPropagation();
        scrollToStage("process", index);
      }}
    >
      {/* Steel portal. */}
      <mesh position={[left, top / 2, 0]}>
        <boxGeometry args={[0.22, top, 0.22]} />
        {frame}
      </mesh>
      <mesh position={[right, top / 2, 0]}>
        <boxGeometry args={[0.22, top, 0.22]} />
        {frame}
      </mesh>
      <mesh position={[(left + right) / 2, top, 0]}>
        <boxGeometry args={[width + 0.22, 0.26, 0.26]} />
        {frame}
      </mesh>
      {/* Inner neon tube tracing the portal. */}
      <group position={[0, 0, 0.14]}>
        <mesh position={[left + 0.14, top / 2, 0]}>
          <boxGeometry args={[0.035, top - 0.2, 0.035]} />
          <meshBasicMaterial ref={tube} toneMapped={false} />
        </mesh>
        <mesh position={[(left + right) / 2, top - 0.14, 0]}>
          <boxGeometry args={[width - 0.28, 0.035, 0.035]} />
          <GateTubeMaterial source={tube} />
        </mesh>
      </group>
      <NeonSign
        text={`${index + 1}  ${step.jp}`}
        color={GATE_COLORS[index]}
        height={0.5}
        position={[(left + right) / 2, top - 0.5, 0.2]}
        latin={false}
        intensity={2.4}
        level={lit ? 1 : 0.15}
      />
      <GateTubeMirror source={tube} left={right - 0.14} top={top} />
    </group>
  );
}

type TubeSource = { source: React.RefObject<THREE.MeshBasicMaterial | null> };

/** Material that copies the animated tube colour from the gate's first upright each frame. */
function GateTubeMaterial({ source }: TubeSource) {
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(() => {
    if (mat.current && source.current) mat.current.color.copy(source.current.color);
  });
  return <meshBasicMaterial ref={mat} toneMapped={false} />;
}

function GateTubeMirror({ source, left, top }: TubeSource & { left: number; top: number }) {
  return (
    <mesh position={[left, top / 2, 0.14]}>
      <boxGeometry args={[0.035, top - 0.2, 0.035]} />
      <GateTubeMaterial source={source} />
    </mesh>
  );
}

export function ProcessGates() {
  return (
    <group>
      {PROCESS.map((p, i) => (
        <Gate key={p.name} index={i} />
      ))}
    </group>
  );
}

/* ───────────────────────── Contact: ticket gates ───────────────────────── */

export function TicketGates() {
  const xs = [-6.2, -4.9, -3.6, -2.3, -1.0, 0.3];
  return (
    <group position={[0, 0, -91]}>
      {xs.map((x, i) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.52, 0]} castShadow>
            <boxGeometry args={[0.3, 1.04, 1.7]} />
            <meshStandardMaterial color="#d9dde6" metalness={0.35} roughness={0.25} />
          </mesh>
          <mesh position={[0, 1.045, -0.25]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.24, 0.5]} />
            <meshBasicMaterial color={new THREE.Color(i % 2 ? COLORS.blue : COLORS.yellow).multiplyScalar(2)} toneMapped={false} />
          </mesh>
          {/* Little pink flap doors. */}
          <mesh position={[0.32, 0.7, 0.2]}>
            <boxGeometry args={[0.36, 0.3, 0.04]} />
            <meshStandardMaterial color={COLORS.pink} emissive={COLORS.pink} emissiveIntensity={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
