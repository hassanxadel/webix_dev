import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BACK_SLOTS, CARD, FRONT_SLOTS, backPrint, frontPrint, frontRoughness, normaliseUVs, roundedRect, wMarkShapes } from "./cardArt";
import { journey, journeyStore } from "@/lib/journey";
import { beep } from "@/lib/sound";

/**
 * Where the card is and how it behaves this frame. The card rig writes it;
 * the card reads it. Keeping it outside React means no re-renders per frame.
 */
export const cardState = {
  position: new THREE.Vector3(0, 1.5, 0),
  rotation: new THREE.Euler(0, 0, 0),
  scale: 1,
  /** 0..1 — how strongly the card follows the pointer / device tilt. */
  tilt: 1,
  /** 0..1 — idle float and yaw drift. */
  idle: 1,
  /** 0 = front, 1 = back. */
  flip: 0,
  /** Screen-anchored: draw over the world (the visitor is holding it), not behind seats or walls. */
  overlay: false,
};

const MAX_TILT = THREE.MathUtils.degToRad(15);
export const CARD_LAYER = 1;
const { width: W, height: H, thickness: T, radius: R } = CARD;

/** Device tilt on phones (Android fires without a permission prompt). */
const deviceTilt = { x: 0, y: 0, active: false };

export function WebixPass() {
  const root = useRef<THREE.Group>(null);
  const tiltGroup = useRef<THREE.Group>(null);
  const flipGroup = useRef<THREE.Group>(null);
  const frontSide = useRef<THREE.Group>(null);
  const backSide = useRef<THREE.Group>(null);
  const frontStamps = useRef<THREE.Mesh[]>([]);
  const backStamps = useRef<THREE.Mesh[]>([]);
  const flash = useRef(0);
  const lastStamps = useRef(0);

  const geo = useMemo(() => {
    const bevel = 0.0025;
    const body = new THREE.ExtrudeGeometry(roundedRect(W - bevel * 2, H - bevel * 2, R - bevel), {
      depth: T - bevel * 2,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 4,
      curveSegments: 18,
    });
    body.translate(0, 0, -(T - bevel * 2) / 2);
    const face = normaliseUVs(new THREE.ShapeGeometry(roundedRect(W - 0.004, H - 0.004, R - 0.002), 18), W, H);

    // W inlay: extruded from the traced mark, sized to sit centre-left on the front.
    const mark = new THREE.ExtrudeGeometry(wMarkShapes(), { depth: 0.0012, bevelEnabled: true, bevelThickness: 0.0005, bevelSize: 0.07, bevelSegments: 2, curveSegments: 4 });
    const s = 0.029;
    mark.scale(s, s, 1);
    mark.translate(-0.5, -0.115, 0);
    return { body, face, mark, stamp: new THREE.CircleGeometry(0.021, 40), backStamp: new THREE.CircleGeometry(0.042, 48) };
  }, []);

  const mats = useMemo(() => {
    const front = new THREE.MeshPhysicalMaterial({
      map: frontPrint(),
      roughnessMap: frontRoughness(),
      metalness: 1,
      roughness: 0.55,
      // Brushed metal comes from the streaked roughness map. (Anisotropy would be truer, but it
      // produces NaNs in the wet floor's mirrored render, which bloom then spreads across the frame.)
      clearcoat: 0.25,
      clearcoatRoughness: 0.35,
      envMapIntensity: 1.25,
    });
    const back = new THREE.MeshPhysicalMaterial({ map: backPrint(), metalness: 0.35, roughness: 0.62, envMapIntensity: 0.8 });
    const core = new THREE.MeshPhysicalMaterial({ color: "#1a253a", metalness: 1, roughness: 0.4 });
    // Holographic edge: thin-film iridescence over hot pink, with a faint emissive glow for bloom.
    const edge = new THREE.MeshPhysicalMaterial({
      color: "#ff007f",
      metalness: 0.75,
      roughness: 0.18,
      iridescence: 1,
      iridescenceIOR: 1.65,
      iridescenceThicknessRange: [260, 720],
      emissive: new THREE.Color("#ff007f"),
      emissiveIntensity: 0.4,
      clearcoat: 1,
    });
    const gold = new THREE.MeshPhysicalMaterial({ color: "#ffda24", metalness: 1, roughness: 0.22, clearcoat: 0.5, clearcoatRoughness: 0.15, envMapIntensity: 2.4 });
    const stamp = new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffda24").multiplyScalar(2.2), toneMapped: false });
    return { front, back, core, edge, gold, stamp };
  }, []);

  // The card lives on its own layer: the main camera renders it, the wet floor's
  // mirror camera (default layer only) does not — it is held up to the screen, not in the world.
  useEffect(() => {
    root.current?.traverse((o) => o.layers.set(CARD_LAYER));
  }, []);

  useEffect(() => {
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      deviceTilt.active = true;
      deviceTilt.x = THREE.MathUtils.clamp((e.beta - 45) / 45, -1, 1);
      deviceTilt.y = THREE.MathUtils.clamp(e.gamma / 45, -1, 1);
    };
    window.addEventListener("deviceorientation", onTilt);
    return () => window.removeEventListener("deviceorientation", onTilt);
  }, []);

  useFrame(({ clock }, dt) => {
    const g = root.current;
    if (!g || !tiltGroup.current || !flipGroup.current) return;
    const { reducedMotion, stamps } = journeyStore.get();
    const t = clock.elapsedTime;

    g.position.copy(cardState.position);
    g.rotation.copy(cardState.rotation);
    g.scale.setScalar(cardState.scale);

    // The card is a convex slab with back-face culling, so it orders itself correctly without depth.
    const depth = !cardState.overlay;
    if (mats.front.depthTest !== depth) Object.values(mats).forEach((m) => (m.depthTest = depth));

    // Pointer (or device) tilt, max 15°, smoothed; touch without orientation gets a slow idle turn.
    const touchIdle = !deviceTilt.active && matchMedia("(hover: none)").matches;
    const px = deviceTilt.active ? deviceTilt.y : touchIdle ? Math.sin(t * 0.35) * 0.6 : journey.pointerX;
    const py = deviceTilt.active ? deviceTilt.x : touchIdle ? Math.sin(t * 0.27) * 0.3 : journey.pointerY;
    const k = 1 - Math.exp(-dt * 5);
    const idle = reducedMotion ? 0 : cardState.idle;
    tiltGroup.current.rotation.x += (py * MAX_TILT * cardState.tilt + Math.sin(t * 0.6) * 0.03 * idle - tiltGroup.current.rotation.x) * k;
    tiltGroup.current.rotation.y += (px * MAX_TILT * cardState.tilt + Math.sin(t * 0.22) * 0.12 * idle - tiltGroup.current.rotation.y) * k;
    tiltGroup.current.position.y = Math.sin(t * 1.1) * 0.025 * idle;

    flipGroup.current.rotation.y += (cardState.flip * Math.PI - flipGroup.current.rotation.y) * (reducedMotion ? 1 : 1 - Math.exp(-dt * 4));

    // A new stamp: pop it in, flash the edge, beep.
    if (stamps > lastStamps.current) {
      flash.current = 1;
      beep();
    }
    lastStamps.current = stamps;
    flash.current = Math.max(0, flash.current - dt * 2.2);
    mats.edge.emissiveIntensity = 0.4 + flash.current * 3.5;

    const pop = (m: THREE.Mesh | undefined, i: number) => {
      if (!m) return;
      const target = i < stamps ? 1 : 0;
      const s = m.scale.x + (target - m.scale.x) * (1 - Math.exp(-dt * 9));
      m.scale.setScalar(Math.max(0.0001, s));
      m.visible = s > 0.01;
    };
    frontStamps.current.forEach(pop);
    // Without depth testing (overlay), only the face turned toward the viewer may draw.
    const showingBack = Math.cos(flipGroup.current.rotation.y) < 0;
    if (frontSide.current) frontSide.current.visible = !showingBack;
    if (backSide.current) backSide.current.visible = showingBack;
    backStamps.current.forEach(pop);
  });

  const zFront = T / 2 + 0.0004;
  return (
    <group ref={root}>
      <group ref={tiltGroup}>
        <group ref={flipGroup}>
          <mesh geometry={geo.body} material={[mats.core, mats.edge]} renderOrder={20} />
          <group ref={frontSide}>
          <mesh geometry={geo.face} material={mats.front} position={[0, 0, zFront]} renderOrder={21} />
          <mesh geometry={geo.mark} material={mats.gold} position={[0, 0, zFront + 0.0003]} renderOrder={22} />
          {FRONT_SLOTS.map(({ u, v }, i) => (
            <mesh key={i} ref={(m) => void (frontStamps.current[i] = m!)} geometry={geo.stamp} material={mats.stamp} renderOrder={23} position={[(u - 0.5) * W, (v - 0.5) * H, zFront + 0.0006]} scale={0.0001} />
          ))}

          </group>

          <group ref={backSide} rotation={[0, Math.PI, 0]}>
            <mesh geometry={geo.face} material={mats.back} position={[0, 0, zFront]} renderOrder={21} />
            {BACK_SLOTS.map(({ u, v }, i) => (
              <group key={i} position={[(u - 0.5) * W, (v - 0.5) * H, zFront + 0.0006]}>
                <mesh ref={(m) => void (backStamps.current[i] = m!)} geometry={geo.backStamp} material={mats.stamp} renderOrder={23} scale={0.0001} />
              </group>
            ))}
          </group>
        </group>
      </group>
    </group>
  );
}
