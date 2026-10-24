import { useMemo, useRef } from "react";
import { useFrame, useLoader, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { WORK_Y, WORK_Z, WORLD } from "./layout";
import { neonText } from "./textures";
import { PROJECTS } from "@/lib/webix-data";
import { sceneStore } from "@/lib/scene-store";

const W = 2.9;
const H = W / 1.6;

function Lightbox({ index, texture }: { index: number; texture: THREE.Texture }) {
  const project = PROJECTS[index];
  const group = useRef<THREE.Group>(null);
  const screen = useRef<THREE.MeshBasicMaterial>(null);
  const strip = useRef<THREE.MeshBasicMaterial>(null);
  const lamp = useRef<THREE.PointLight>(null);
  const label = useMemo(() => neonText(project.name, project.accent, { latin: true, size: 120 }), [project]);
  const accent = useMemo(() => new THREE.Color(project.accent), [project]);

  useFrame((_, dt) => {
    const s = sceneStore.get();
    const active = s.section === 1 && s.workIndex === index;
    const hovered = s.hoverProject === index;
    const focus = hovered ? 1 : active ? 0.85 : 0.25;
    if (screen.current) screen.current.color.setScalar(THREE.MathUtils.damp(screen.current.color.r, 0.55 + focus * 0.75, 4, dt));
    if (strip.current) {
      const k = THREE.MathUtils.damp(strip.current.userData.k ?? 0.4, 0.4 + focus * 3.2, 4, dt);
      strip.current.userData.k = k;
      strip.current.color.copy(accent).multiplyScalar(k);
    }
    if (lamp.current) lamp.current.intensity = THREE.MathUtils.damp(lamp.current.intensity, focus * 5, 4, dt);
    if (group.current) group.current.position.x = THREE.MathUtils.damp(group.current.position.x, WORLD.wallX + 0.2 + (hovered ? 0.12 : 0), 6, dt);
  });

  const over = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    sceneStore.set({ hoverProject: index });
    document.body.style.cursor = "pointer";
  };
  const out = () => {
    if (sceneStore.get().hoverProject === index) sceneStore.set({ hoverProject: null });
    document.body.style.cursor = "";
  };
  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    sceneStore.set({ openProject: index });
  };

  return (
    <group ref={group} position={[WORLD.wallX + 0.2, WORK_Y, WORK_Z(index)]} rotation={[0, Math.PI / 2, 0]}>
      {/* Brushed aluminium frame. */}
      <mesh position={[0, 0, -0.06]} castShadow>
        <boxGeometry args={[W + 0.18, H + 0.18, 0.14]} />
        <meshStandardMaterial color="#2a3042" metalness={0.9} roughness={0.32} />
      </mesh>
      <mesh onPointerOver={over} onPointerOut={out} onClick={click} position={[0, 0, 0.015]}>
        <planeGeometry args={[W, H]} />
        <meshBasicMaterial ref={screen} map={texture} toneMapped={false} />
      </mesh>
      {/* Glass cover catching the room's reflections. */}
      <mesh position={[0, 0, 0.03]} raycast={() => null}>
        <planeGeometry args={[W, H]} />
        <meshPhysicalMaterial transparent opacity={0.12} roughness={0.05} metalness={0} clearcoat={1} color="#9fb4ff" />
      </mesh>
      {/* Accent light-line and name plate below. */}
      <mesh position={[0, -H / 2 - 0.16, 0.02]}>
        <planeGeometry args={[W, 0.035]} />
        <meshBasicMaterial ref={strip} toneMapped={false} />
      </mesh>
      <mesh position={[-W / 2 + (0.26 * label.aspect) / 2, -H / 2 - 0.36, 0.02]}>
        <planeGeometry args={[0.26 * label.aspect, 0.26]} />
        <meshBasicMaterial map={label.texture} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} color={new THREE.Color(1.3, 1.3, 1.3)} />
      </mesh>
      <pointLight ref={lamp} position={[0, 0, 1.2]} color={project.accent} intensity={0} distance={5} decay={2} />
    </group>
  );
}

export function Lightboxes() {
  const textures = useLoader(
    THREE.TextureLoader,
    PROJECTS.map((p) => p.image),
  );
  textures.forEach((t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
  });
  return (
    <group>
      {PROJECTS.map((p, i) => (
        <Lightbox key={p.slug} index={i} texture={textures[i]} />
      ))}
    </group>
  );
}
