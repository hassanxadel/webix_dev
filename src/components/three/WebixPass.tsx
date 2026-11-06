import { useEffect, useMemo, useRef } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { CARD, backPrint, frontPrint, frontRoughness, normaliseUVs, roundedRect } from "./cardArt";
import { journey, journeyStore } from "@/lib/journey";
import { deck } from "@/lib/deck";
import { SERVICES } from "@/lib/webix-data";
import { HERO_GLIDE } from "@/config/sections";

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

export const CARD_LAYER = 1;
const { width: W, height: H, thickness: T, radius: R } = CARD;
const Z_FRONT = T / 2 + 0.0004;

/** Device tilt on phones (Android fires without a permission prompt). */
const deviceTilt = { x: 0, y: 0, active: false };

/* ───────── Services deck (state in lib/deck.ts) ───────── */

const deg = THREE.MathUtils.degToRad;
/** Dealt passes: at least this fraction of the card on wide screens; at most PASS_GRID in the phone grid. */
const PASS = 0.45;
const PASS_GRID = 0.62;
/** Hovering the card: it tilts back this much and scales to 0.95. */
const PRESS_TILT = deg(10);
/** Pass slabs: brand faces with a darker extruded side, like the logo's letters (the HTML face covers them once dealt). */
const PASS_FACES = { yellow: ["#ffda24", "#e81a2e"], pink: ["#ff007f", "#a8004f"], red: ["#e81a2e", "#8f0c19"], indigo: ["#1a253a", "#070b14"] } as const;
const PASS_DEPTH = 0.06;
type Slot = { x: number; y: number; rz: number };

/** Smallest pass that still reads well (CSS px wide); below it the deck moves to the next layout. */
const MIN_PASS_PX = 120;
/** Kept free at the bottom of the screen in the grid layout (WhatsApp button, wordmark), CSS px. */
const BOTTOM_RESERVE = 84;

/**
 * Where the passes land (card-local units), chosen so no pass overlaps another
 * or the card, each as large as the window allows: four across like a hand of
 * cards (0.45–0.55 of the card), else two stacked on each side (≤ 0.75), else
 * (phones) a 2×2 grid below the card, scaled to the width and to the height
 * left under the card. `ppu` = screen px per card unit; `belowPx` = where the
 * card's bottom edge is on screen.
 * shortcut: four slots for the four services; add slots if SERVICES grows.
 */
function dealLayout(vw: number, vh: number, ppu: number, belowPx: number): { kind: typeof deck.layout; scale: number; slots: Slot[] } {
  const g = 0.07 * W, half = (vw * 0.48) / ppu;
  const readable = (k: number) => k * W * ppu >= MIN_PASS_PX;
  if (vw > vh) {
    const sf = Math.min(0.55, (half - W / 2 - 2 * g - 0.03) / (2 * W));
    if (sf >= PASS && readable(sf)) {
      const pw = sf * W, inner = W / 2 + g + pw / 2, outer = inner + pw + g;
      return { kind: "fan", scale: sf, slots: [{ x: -outer, y: -0.12, rz: deg(9) }, { x: -inner, y: -0.03, rz: deg(4) }, { x: inner, y: -0.03, rz: deg(-4) }, { x: outer, y: -0.12, rz: deg(-9) }] };
    }
    const ss = Math.min(0.75, (half - W / 2 - g - 0.03) / W, ((vh * 0.9) / ppu - g) / (2 * H));
    if (ss >= 0.4 && readable(ss)) {
      const pw = ss * W, ph = ss * H, cx = W / 2 + g + pw / 2, dy = ph / 2 + g / 2;
      return { kind: "split", scale: ss, slots: [{ x: -cx, y: dy, rz: deg(3) }, { x: -cx, y: -dy, rz: deg(-2) }, { x: cx, y: dy, rz: deg(-3) }, { x: cx, y: -dy, rz: deg(2) }] };
    }
  }
  const sg = Math.max(0.3, Math.min(PASS_GRID, (half * 2 - g) / (2 * W), ((vh - belowPx - BOTTOM_RESERVE) / ppu - 2 * g) / (2 * H)));
  const gw = sg * W, gh = sg * H, cx = gw / 2 + g / 2, y1 = -(H / 2 + g + gh / 2), y2 = y1 - gh - g;
  return { kind: "grid", scale: sg, slots: [{ x: -cx, y: y1, rz: 0 }, { x: cx, y: y1, rz: 0 }, { x: -cx, y: y2, rz: 0 }, { x: cx, y: y2, rz: 0 }] };
}

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
  const pressGroup = useRef<THREE.Group>(null);
  const passes = useRef<(THREE.Group | null)[]>([]);
  const deal = useRef({ press: 0, hero: 1, layout: null as ReturnType<typeof dealLayout> | null, lift: deck.progress.map(() => 0), v: new THREE.Vector3(), c: new THREE.Vector3(), a: new THREE.Vector3() }).current;
  const flipGroup = useRef<THREE.Group>(null);
  const frontSide = useRef<THREE.Group>(null);
  const backSide = useRef<THREE.Group>(null);

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
    // ~18 px corners once dealt (0.072 of the pass width), thicker than the card.
    const slab = new THREE.ExtrudeGeometry(roundedRect(W, H, 0.072 * W), { depth: PASS_DEPTH, bevelEnabled: false, curveSegments: 12 });
    slab.translate(0, 0, -PASS_DEPTH / 2);
    return { body, face, slab };
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
    // Service passes: flat brand faces with a darker side (cap, side material groups), each fading on its own.
    const pass = SERVICES.map(({ face }) => {
      const [c, side] = PASS_FACES[face];
      return [
        new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.18, roughness: 0.5, transparent: true }),
        new THREE.MeshStandardMaterial({ color: side, roughness: 0.6, transparent: true }),
      ];
    });
    return { front, back, core, edge, pass };
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

  useFrame(({ clock, camera, size }, dt) => {
    const g = root.current;
    if (!g || !tiltGroup.current || !flipGroup.current || !pressGroup.current) return;
    const { reducedMotion, section } = journeyStore.get();
    const t = clock.elapsedTime;

    g.position.copy(cardState.position);
    g.quaternion.copy(cardState.quaternion);
    g.scale.setScalar(cardState.scale);
    g.visible = cardState.scale > 0.012; // gone in About Me

    // Pointer (or device) tilt, max 18° in the hero (scaled by cardState.tilt elsewhere), damped (~0.08 per frame at 60 fps); touch gets a gentle sway.
    const touchSway = !deviceTilt.active && matchMedia("(hover: none)").matches;
    const px = deviceTilt.active ? deviceTilt.y : touchSway ? Math.sin(t * 0.35) * 0.55 : journey.pointerX;
    const py = deviceTilt.active ? deviceTilt.x : touchSway ? Math.sin(t * 0.27) * 0.3 : journey.pointerY;
    const k = 1 - Math.exp(-dt * 5);
    // Reduced motion keeps a smaller, calmer float rather than none (the card must read as floating).
    const idle = cardState.idle * (reducedMotion ? 0.4 : 1);
    const tg = tiltGroup.current;
    // Calmer while the deck is open, so the passes hold still under the pointer.
    const tilt = MAX_TILT * cardState.tilt * (1 - 0.6 * deal.press);
    tg.rotation.x += (py * tilt + Math.sin(t * 0.5) * 0.025 * idle - tg.rotation.x) * k;
    tg.rotation.y += (px * tilt + Math.sin(t * 0.18) * 0.1 * idle - tg.rotation.y) * k;
    // Floating: a slow bob, ±0.06 over ~5 s.
    tg.position.y = Math.sin((t * Math.PI * 2) / 5) * 0.06 * idle;

    flipGroup.current.rotation.y += (cardState.flip * Math.PI - flipGroup.current.rotation.y) * (reducedMotion ? 1 : 1 - Math.exp(-dt * 4));
    const showingBack = Math.cos(flipGroup.current.rotation.y) < 0;
    if (frontSide.current) frontSide.current.visible = !showingBack;
    if (backSide.current) backSide.current.visible = showingBack;

    // In the hero, a soft pink pulse every ~3 s hints that the card does something.
    const hint = section === 0 && !deck.open ? Math.pow(Math.max(Math.sin((t * Math.PI * 2) / 3), 0), 12) : 0;
    mats.edge.emissive.copy(EDGE_PINK);
    mats.edge.emissiveIntensity = 0.4 + hint * 1.4;

    // ── Services deck: the card tilts back on hover; the passes deal out of the stack behind it ──
    const kd = 1 - Math.exp(-dt * 10);
    deal.press += ((deck.open ? 1 : 0) - deal.press) * kd;
    pressGroup.current.rotation.x = -PRESS_TILT * deal.press;
    pressGroup.current.scale.setScalar(1 - 0.05 * deal.press);
    // The layout is picked while the deck is closed (and frozen while open, so it never jumps mid-hover).
    if (!deck.open || !deal.layout) {
      const ppu = deck.card.w > 0 ? deck.card.w / (W * (1 - 0.05 * deal.press)) : size.height * 0.4;
      deal.layout = dealLayout(size.width, size.height, ppu, deck.card.w > 0 ? deck.card.y + deck.card.h : size.height * 0.55);
      deck.layout = deal.layout.kind;
    }
    const { slots, scale: dealt } = deal.layout;
    // The stack (and its coloured slivers) only exists in the hero.
    deal.hero += ((journey.progress < HERO_GLIDE[0] * 0.5 ? 1 : 0) - deal.hero) * kd;
    passes.current.forEach((p, i) => {
      if (!p) return;
      const v = deck.progress[i].v;
      const lift = (deal.lift[i] += ((deck.hover === i ? 1 : 0) - deal.lift[i]) * kd);
      // Reduced motion: no dealing; the slab leaves the stack and the HTML face fades in at its slot.
      const m = reducedMotion ? (v > 0.001 ? 1 : 0) : v;
      const f = slots[i];
      const n = i + 1;
      const mc = Math.min(Math.max(m, 0), 1);
      // Stacked: almost card-sized, each a sliver further down-right and further back, hidden behind the one above.
      p.position.set(THREE.MathUtils.lerp(0.012 * n, f.x, m), THREE.MathUtils.lerp(-0.014 * n, f.y, m), THREE.MathUtils.lerp(-0.012 * n - PASS_DEPTH, -0.03, mc) + 0.18 * lift);
      p.rotation.z = f.rz * m;
      p.scale.setScalar(THREE.MathUtils.lerp(0.985, dealt, mc) * (1 + 0.1 * lift));
      const face = reducedMotion ? Math.min(v, 1) : THREE.MathUtils.smoothstep(Math.min(v, 1), 0.55, 0.95);
      const slab = (reducedMotion ? 1 - m : 1 - face) * deal.hero;
      p.visible = slab > 0.002;
      for (const mat of mats.pass[i]) mat.opacity = slab;
      deck.passes[i].alpha = face * deal.hero;
    });

    // Report the card's and each pass's screen box (CSS px) for the HTML hit area, hint and links.
    g.updateMatrixWorld(true);
    const toPx = (v: THREE.Vector3) => {
      v.project(camera);
      return v.set((v.x + 1) * 0.5 * size.width, (1 - v.y) * 0.5 * size.height, 0);
    };
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const sx of [-1, 1])
      for (const sy of [-1, 1]) {
        const v = toPx(deal.v.set((sx * W) / 2, (sy * H) / 2, Z_FRONT).applyMatrix4(pressGroup.current.matrixWorld));
        [x0, y0, x1, y1] = [Math.min(x0, v.x), Math.min(y0, v.y), Math.max(x1, v.x), Math.max(y1, v.y)];
      }
    Object.assign(deck.card, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
    passes.current.forEach((p, i) => {
      if (!p) return;
      const zf = PASS_DEPTH / 2;
      const c = toPx(deal.c.set(0, 0, zf).applyMatrix4(p.matrixWorld));
      const a = toPx(deal.a.set(W / 2, 0, zf).applyMatrix4(p.matrixWorld));
      const b = toPx(deal.v.set(0, H / 2, zf).applyMatrix4(p.matrixWorld));
      Object.assign(deck.passes[i], { x: c.x, y: c.y, w: 2 * a.distanceTo(c), h: 2 * b.distanceTo(c), rot: Math.atan2(a.y - c.y, a.x - c.x) });
    });
  });

  return (
    <group ref={root}>
      {/* Clears depth just before the card draws, so it sits over the world yet its own layers still occlude correctly. */}
      <mesh renderOrder={19} frustumCulled={false} onBeforeRender={(r) => cardState.overlay && r.clearDepth()}>
        <planeGeometry args={[0.0001, 0.0001]} />
        <meshBasicMaterial colorWrite={false} depthWrite={false} depthTest={false} />
      </mesh>
      <group ref={tiltGroup}>
        <group ref={pressGroup}>
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
        {/* The service passes, stacked behind the card until the deck opens. */}
        {mats.pass.map((m, i) => (
          <group key={i} ref={(el) => void (passes.current[i] = el)}>
            <mesh geometry={geo.slab} material={m} renderOrder={20} />
          </group>
        ))}
      </group>
    </group>
  );
}
