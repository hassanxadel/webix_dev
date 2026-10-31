import { useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { RoundedBox, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { BILLBOARD_Z, BOARD_Z, LINE, MICRO_STOPS_Z, SERVICE_SCREEN_Z, TERMINAL_WALL_Z } from "./world";
import { BRAND, makeDepartureBoard, neonLine, serviceScreen, stopSign } from "./worldArt";
import { PROCESS, PROJECTS, RESULT_STATS, SERVICES } from "@/lib/webix-data";
import { LEGACY_PROCESS_STEPS as PROCESS_STEPS, LEGACY_RESULTS_STAMP, LEGACY_SERVICE_STEPS as SERVICE_STEPS, toLegacy } from "@/config/stations";
import { journey, journeyStore } from "@/lib/journey";

const WALL = LINE.wallX + 0.07;
const damp = (cur: number, target: number, dt: number, rate = 4) => cur + (target - cur) * (1 - Math.exp(-dt * rate));

const frameMat = new THREE.MeshPhysicalMaterial({ color: "#2b303b", metalness: 0.9, roughness: 0.3 });

/* ───────── 03 Services: four platform screens ───────── */

export function ServiceScreens() {
  const mats = useMemo(() => SERVICES.map((s, i) => new THREE.MeshBasicMaterial({ map: serviceScreen(s, i), toneMapped: false, color: new THREE.Color(0.06, 0.06, 0.06) })), []);
  useFrame((_, dt) => {
    const p = toLegacy(journey.progress); // the world runs on its original timeline
    mats.forEach((m, i) => {
      const on = p >= SERVICE_STEPS[i] - 0.004;
      m.color.setScalar(damp(m.color.r, on ? 0.95 : 0.06, dt, 3));
    });
  });
  return (
    <group>
      {SERVICE_SCREEN_Z.map((z, i) => (
        <group key={z} position={[WALL, 2.15, z]} rotation={[0, Math.PI / 2, 0]}>
          <RoundedBox args={[3.16, 2.02, 0.12]} radius={0.04} smoothness={3} position={[0, 0, -0.06]} material={frameMat} />
          <mesh material={mats[i]} position={[0, 0, 0.005]}>
            <planeGeometry args={[3.0, 1.875]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ───────── 04 Work: project billboards ───────── */

function labelTexture(name: string, kind: string) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#0b0f18";
  g.fillRect(0, 0, 1024, 128);
  g.fillStyle = BRAND.yellow;
  g.fillRect(0, 0, 10, 128);
  g.fillStyle = BRAND.text;
  g.font = '600 52px "Poppins", sans-serif';
  g.fillText(name, 40, 76);
  g.fillStyle = "rgba(244,241,234,0.55)";
  g.font = '500 28px "JetBrains Mono", monospace';
  g.textAlign = "right";
  g.fillText(kind.toUpperCase(), 990, 74);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function Billboards() {
  const textures = useTexture(PROJECTS.map((p) => p.image));
  const screens = useRef<THREE.MeshBasicMaterial[]>([]);
  const labels = useMemo(() => PROJECTS.map((p) => labelTexture(p.name, p.platform.includes("Shopify") ? "E-commerce / Shopify" : "Website")), []);
  useMemo(() => {
    textures.forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      // Slight overscan leaves room for hover parallax.
      t.repeat.set(0.94, 0.94);
      t.offset.set(0.03, 0.03);
    });
  }, [textures]);

  useFrame((_, dt) => {
    const { hoverProject, workStep, station } = journeyStore.get();
    screens.current.forEach((m, i) => {
      if (!m) return;
      const focus = hoverProject === i ? 1.15 : station === 3 && workStep === i ? 0.95 : 0.5;
      m.color.setScalar(damp(m.color.r, focus, dt, 5));
      const t = textures[i];
      const hovered = hoverProject === i;
      t.offset.x = damp(t.offset.x, 0.03 + (hovered ? journey.pointerX * 0.025 : 0), dt, 6);
      t.offset.y = damp(t.offset.y, 0.03 - (hovered ? journey.pointerY * 0.025 : 0), dt, 6);
    });
  });

  const over = (i: number) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    journeyStore.set({ hoverProject: i });
    document.body.style.cursor = "pointer";
  };
  const out = (i: number) => () => {
    if (journeyStore.get().hoverProject === i) journeyStore.set({ hoverProject: null });
    document.body.style.cursor = "";
  };

  return (
    <group>
      {BILLBOARD_Z.map((z, i) => (
        <group key={z} position={[WALL, 2.3, z]} rotation={[0, Math.PI / 2, 0]}>
          <RoundedBox args={[3.8, 2.42, 0.14]} radius={0.04} smoothness={3} position={[0, 0, -0.07]} material={frameMat} />
          <mesh
            position={[0, 0, 0.006]}
            onPointerOver={over(i)}
            onPointerOut={out(i)}
            onClick={(e) => {
              e.stopPropagation();
              journeyStore.set({ openProject: i });
            }}
          >
            <planeGeometry args={[3.6, 2.25]} />
            <meshBasicMaterial ref={(m) => void (screens.current[i] = m!)} map={textures[i]} toneMapped={false} color={new THREE.Color(0.5, 0.5, 0.5)} />
          </mesh>
          <mesh position={[0, -1.42, 0.01]}>
            <planeGeometry args={[3.6, 0.45]} />
            <meshBasicMaterial map={labels[i]} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ───────── 05 Process: express micro-stops ───────── */

export function MicroStops() {
  const mats = useMemo(() => PROCESS.map((s, i) => new THREE.MeshBasicMaterial({ map: stopSign(i + 1, s.name, s.jp), toneMapped: false, color: new THREE.Color(0.3, 0.3, 0.3) })), []);
  const slab = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1c212b", roughness: 0.85 }), []);
  const strip = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color("#fff3dc").multiplyScalar(2), toneMapped: false }), []);
  useFrame((_, dt) => {
    const p = toLegacy(journey.progress); // the world runs on its original timeline
    mats.forEach((m, i) => m.color.setScalar(damp(m.color.r, Math.abs(p - PROCESS_STEPS[i]) < 0.016 ? 1 : 0.3, dt, 5)));
  });
  return (
    <group>
      {MICRO_STOPS_Z.map((z, i) => (
        <group key={z} position={[0, 0, z]}>
          <mesh position={[(LINE.edgeX + LINE.wallX + 3) / 2, -0.6, 0]} material={slab}>
            <boxGeometry args={[LINE.edgeX - LINE.wallX - 3, 1.2, 16]} />
          </mesh>
          <mesh position={[LINE.edgeX - 0.6, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.36, 16]} />
            <meshStandardMaterial color="#e8c210" roughness={0.6} />
          </mesh>
          {/* At window height, so it is read from inside the passing train. */}
          <group position={[-0.4, 1.3, 0]} rotation={[0, Math.PI / 2, 0]}>
            <RoundedBox args={[2.5, 0.92, 0.1]} radius={0.03} smoothness={2} position={[0, 0, -0.06]} material={frameMat} />
            <mesh material={mats[i]}>
              <planeGeometry args={[2.4, 0.84]} />
            </mesh>
          </group>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[-0.4, 0.35, s * 1.65]} material={frameMat}>
              <cylinderGeometry args={[0.05, 0.05, 0.7, 12]} />
            </mesh>
          ))}
          <mesh position={[-0.4, 2.2, 0]} material={strip}>
            <boxGeometry args={[0.08, 0.04, 3]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/* ───────── 06 Results: split-flap departure board ───────── */

export function DepartureBoard() {
  const board = useMemo(() => makeDepartureBoard(RESULT_STATS.map((s) => ({ label: s.label, value: String(s.value).padStart(2, "0") }))), []);
  const start = LEGACY_RESULTS_STAMP;
  const frame = useRef(0);
  const last = useRef("idle");
  useFrame(() => {
    const p = toLegacy(journey.progress); // the world runs on its original timeline
    const rows = RESULT_STATS.map((_, r) => Math.min(1, Math.max(0, (p - start - r * 0.004) / 0.012)));
    const state = rows.every((r) => r >= 1) ? "done" : rows.every((r) => r <= 0) ? "idle" : "flipping";
    // Redraw while flipping (throttled), and once whenever the board settles or resets.
    if (state === "flipping") {
      if (frame.current++ % 3 === 0) board.draw(rows);
    } else if (state !== last.current) board.draw(rows);
    last.current = state;
  });
  const w = 5.4;
  return (
    <group position={[-1.8, 3.35, BOARD_Z]}>
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x * w, 1.0, 0]} material={frameMat}>
          <cylinderGeometry args={[0.02, 0.02, 1.4, 8]} />
        </mesh>
      ))}
      <RoundedBox args={[w + 0.16, w / board.aspect + 0.16, 0.18]} radius={0.04} smoothness={2} position={[0, 0, -0.1]} material={frameMat} />
      <mesh>
        <planeGeometry args={[w, w / board.aspect]} />
        <meshBasicMaterial map={board.texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

/* ───────── 07 Terminal: end wall ───────── */

export function TerminalWall() {
  const big = useMemo(() => neonLine("終点", BRAND.pink, "700", 220), []);
  const sub = useMemo(() => neonLine("YOUR STOP", BRAND.yellow, "600", 120), []);
  const lamp = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(BRAND.red).multiplyScalar(3), toneMapped: false }), []);
  return (
    <group>
      <group position={[WALL + 0.02, 2.4, TERMINAL_WALL_Z]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 0.45, 0]}>
          <planeGeometry args={[1.1 * big.aspect, 1.1]} />
          <meshBasicMaterial map={big.texture} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} color={new THREE.Color(2, 2, 2)} />
        </mesh>
        <mesh position={[0, -0.35, 0]}>
          <planeGeometry args={[0.5 * sub.aspect, 0.5]} />
          <meshBasicMaterial map={sub.texture} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} color={new THREE.Color(1.8, 1.8, 1.8)} />
        </mesh>
        <pointLight position={[0, 0.3, 1]} color={BRAND.pink} intensity={4} distance={7} decay={2} />
      </group>
      {/* End-of-line buffer stop with red lamps. */}
      <group position={[LINE.trackX, LINE.trackY, -845]}>
        <mesh position={[0, 0.7, 0]}>
          <boxGeometry args={[3, 1.4, 0.6]} />
          <meshStandardMaterial color="#2a2f3a" metalness={0.6} roughness={0.5} />
        </mesh>
        {[-0.9, 0.9].map((x) => (
          <mesh key={x} position={[x, 1.6, 0.31]} material={lamp}>
            <circleGeometry args={[0.12, 24]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
