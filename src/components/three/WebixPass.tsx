import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { CARD, backPrint, frontPrint, frontRoughness, normaliseUVs, roundedRect } from "./cardArt";
import { journey, journeyStore } from "@/lib/journey";

/**
 * Where the card is and how it behaves this frame. The card rig writes it;
 * the card reads it. Keeping it outside React means no re-renders per frame.
 */
export const cardState = {
  position: new THREE.Vector3(0, 1.5, 0),
  quaternion: new THREE.Quaternion(),
  scale: 1,
  /** 0..1 — how strongly the card follows the pointer / device tilt. */
  tilt: 1,
  /** 0..1 — idle float and yaw drift. */
  idle: 1,
  /** 0 = front, 1 = back. */
  flip: 0,
  /** Draw over the background (never hidden behind the space objects). */
  overlay: true,
};

const MAX_TILT = THREE.MathUtils.degToRad(18);
const EDGE_PINK = new THREE.Color("#ff007f");
const EDGE_YELLOW = new THREE.Color("#ffda24");

export const CARD_LAYER = 1;
const { width: W, height: H, thickness: T, radius: R } = CARD;
const Z_FRONT = T / 2 + 0.0004;

/** Device tilt on phones (Android fires without a permission prompt). */
const deviceTilt = { x: 0, y: 0, active: false };

/* ───────── The W: a metal enamel inlay built from the traced logo ───────── */

/** SVG units → card units, and where the mark sits on the front (slightly left of centre). */
const W_WIDTH = 0.64;
const SVG_W = 1000;
const S = W_WIDTH / SVG_W;
const W_CENTRE = { x: -0.04, y: -0.012 };

/**
 * Extrude an SVG layer onto the card face. SVG is y-down, so the shape is
 * mirrored in y — and in z too, which keeps the winding (and normals) correct.
 */
function inlayLayer(shapes: THREE.Shape[], depth: number, bevel: number, bevelSize: number, svgH: number) {
  const g = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize, bevelSegments: 2, curveSegments: 6 });
  g.scale(S, -S, -1);
  g.translate(W_CENTRE.x - W_WIDTH / 2, W_CENTRE.y + (svgH * S) / 2, Z_FRONT + depth + bevel);
  return g;
}

function WInlay() {
  const svg = useLoader(SVGLoader, "/brand/webix-w.svg");
  const { geo, mats } = useMemo(() => {
    const byId = (id: string) => svg.paths.find((p) => (p.userData?.node as Element | undefined)?.id === id)!;
    const svgH = Number((svg.xml as unknown as Element).getAttribute("viewBox")!.split(" ")[3]);
    const shapes = (id: string) => SVGLoader.createShapes(byId(id));
    return {
      geo: {
        // Pink-red base (the logo's drawn depth), then the raised gold rim, then the recessed enamel face.
        side: inlayLayer(shapes("side"), 0.0011, 0.0003, 2, svgH),
        rim: inlayLayer(shapes("rim"), 0.003, 0.0004, 3, svgH),
        face: inlayLayer(shapes("face"), 0.0019, 0.0003, 1.5, svgH),
      },
      mats: {
        // Brushed gold rim: the highlights slide across it as the card tilts.
        gold: new THREE.MeshPhysicalMaterial({ color: "#ffd21a", metalness: 1, roughness: 0.25, clearcoat: 0.4, clearcoatRoughness: 0.2, envMapIntensity: 2.2 }),
        // The extrusion depth in pink-red metal (between #E81A2E and #FF007F).
        side: new THREE.MeshPhysicalMaterial({ color: "#f2124e", metalness: 0.85, roughness: 0.3, clearcoat: 0.6, emissive: new THREE.Color("#e81a2e"), emissiveIntensity: 0.12, envMapIntensity: 1.6 }),
        // Deep navy enamel, slightly glossy.
        enamel: new THREE.MeshPhysicalMaterial({ color: "#22345e", metalness: 0.1, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.3, envMapIntensity: 0.45 }),
        // The face's own walls read as the thin dark line around it.
        gap: new THREE.MeshStandardMaterial({ color: "#05070c", roughness: 0.8 }),
      },
    };
  }, [svg]);

  return (
    <group>
      <mesh geometry={geo.side} material={[mats.side, mats.side]} renderOrder={22} />
      <mesh geometry={geo.rim} material={[mats.gold, mats.side]} renderOrder={23} />
      <mesh geometry={geo.face} material={[mats.enamel, mats.gap]} renderOrder={24} />
    </group>
  );
}

/* ───────── The card ───────── */

export function WebixPass() {
  const root = useRef<THREE.Group>(null);
  const tiltGroup = useRef<THREE.Group>(null);
  const flipGroup = useRef<THREE.Group>(null);
  const frontSide = useRef<THREE.Group>(null);
  const backSide = useRef<THREE.Group>(null);
  const lastWork = useRef(-1);
  const pulse = useRef(0);

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
    return { body, face };
  }, []);

  const mats = useMemo(() => {
    const front = new THREE.MeshPhysicalMaterial({
      map: frontPrint(),
      roughnessMap: frontRoughness(),
      metalness: 1,
      roughness: 0.55,
      // Brushed metal comes from the streaked roughness map. (Anisotropy would be truer, but it
      // produces NaNs in mirrored renders, which bloom then spreads across the frame.)
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
    return { front, back, core, edge };
  }, []);

  // The card lives on its own layer: the main camera renders it, the wet floor's
  // mirror camera (default layer only) does not.
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
    const { reducedMotion, workStep, section } = journeyStore.get();
    const t = clock.elapsedTime;

    g.position.copy(cardState.position);
    g.quaternion.copy(cardState.quaternion);
    g.scale.setScalar(cardState.scale);

    // Pointer (or device) tilt, max 18° in the hero (scaled by cardState.tilt elsewhere), damped (~0.08 per frame at 60 fps); touch gets a gentle sway.
    const touchSway = !deviceTilt.active && matchMedia("(hover: none)").matches;
    const px = deviceTilt.active ? deviceTilt.y : touchSway ? Math.sin(t * 0.35) * 0.55 : journey.pointerX;
    const py = deviceTilt.active ? deviceTilt.x : touchSway ? Math.sin(t * 0.27) * 0.3 : journey.pointerY;
    const k = 1 - Math.exp(-dt * 5);
    // Reduced motion keeps a smaller, calmer float rather than none (the card must read as floating).
    const idle = cardState.idle * (reducedMotion ? 0.4 : 1);
    const tg = tiltGroup.current;
    tg.rotation.x += (py * MAX_TILT * cardState.tilt + Math.sin(t * 0.5) * 0.025 * idle - tg.rotation.x) * k;
    tg.rotation.y += (px * MAX_TILT * cardState.tilt + Math.sin(t * 0.18) * 0.1 * idle - tg.rotation.y) * k;
    // Floating: a slow bob, ±0.06 over ~5 s.
    tg.position.y = Math.sin((t * Math.PI * 2) / 5) * 0.06 * idle;

    flipGroup.current.rotation.y += (cardState.flip * Math.PI - flipGroup.current.rotation.y) * (reducedMotion ? 1 : 1 - Math.exp(-dt * 4));
    const showingBack = Math.cos(flipGroup.current.rotation.y) < 0;
    if (frontSide.current) frontSide.current.visible = !showingBack;
    if (backSide.current) backSide.current.visible = showingBack;

    // Each project change in Work: a yellow pulse along the edge.
    const inWork = section === 1;
    if (inWork && lastWork.current !== -1 && workStep !== lastWork.current && !reducedMotion) pulse.current = 1;
    lastWork.current = inWork ? workStep : -1;
    pulse.current = Math.max(0, pulse.current - dt * 1.8);
    mats.edge.emissive.copy(EDGE_PINK).lerp(EDGE_YELLOW, pulse.current);
    mats.edge.emissiveIntensity = 0.4 + pulse.current * 2.4;
  });

  return (
    <group ref={root}>
      {/* Clears depth just before the card draws, so it sits over the world yet its own layers still occlude correctly. */}
      <mesh renderOrder={19} frustumCulled={false} onBeforeRender={(r) => cardState.overlay && r.clearDepth()}>
        <planeGeometry args={[0.0001, 0.0001]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} depthTest={false} />
      </mesh>
      <group ref={tiltGroup}>
        <group ref={flipGroup}>
          <mesh geometry={geo.body} material={[mats.core, mats.edge]} renderOrder={20} />
          <group ref={frontSide}>
            <mesh geometry={geo.face} material={mats.front} position={[0, 0, Z_FRONT]} renderOrder={21} />
            <WInlay />
          </group>
          <group ref={backSide} rotation={[0, Math.PI, 0]}>
            <mesh geometry={geo.face} material={mats.back} position={[0, 0, Z_FRONT]} renderOrder={21} />
          </group>
        </group>
      </group>
    </group>
  );
}
