import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { BallCollider, CuboidCollider, interactionGroups, Physics, RigidBody, useRopeJoint, useSphericalJoint, type RapierRigidBody } from "@react-three/rapier";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import * as THREE from "three";
import { normaliseUVs, roundedRect } from "./cardArt";
import { BADGE, badgeBack, badgeFront, strap } from "./badgeArt";
import { BASE_PITCH } from "./Space";
import { fovFor } from "./CameraRig";
import { badge } from "@/lib/badge";
import { sectionIndex } from "@/config/sections";
import { journeyStore, useJourney } from "@/lib/journey";

/**
 * About Me: the founder's crew pass, worn on a lanyard (the R3F "lanyard
 * badge" pattern, with two straps). Two rope chains, each from its own fixed
 * anchor above the top of the screen (apart like straps round a neck),
 * converge on the badge's metal clip through spherical joints; each strap is a
 * MeshLine along a Catmull-Rom through its chain, its width varying to read as
 * twisted webbing. Low gravity: it floats and sways on its own (a slow drift
 * force + twist); grab and drag it (HTML hit area → `badge`), and it swings
 * back, damped. Only in About Me: hidden, and physics paused, everywhere else.
 * Reduced motion: hanging still, tilting toward the pointer.
 */

const X = new THREE.Vector3(1, 0, 0);
const LINK_DENSITY = 50;
// Links collide with nothing (they keep their mass); two chains meeting at one clip would otherwise push each other apart.
const LINKS_ONLY = interactionGroups(1, []);
const SEGMENT = { type: "dynamic" as const, canSleep: true, colliders: false as const, angularDamping: 2, linearDamping: 2 };
/** Clip height above the badge's top edge, and the two straps' spread at the anchors, as fractions of the badge. */
const CLIP = 0.14;
const SPREAD = 0.3;

/**
 * Where the badge hangs (world space, from the camera framing): centred.
 * Wide screens (≥ 1200 px, ≥ 3:2): ~30% of the width and up to 82% of the
 * height, the copy beside it; otherwise the copy is below, so it takes ~34% of
 * the width (70% on phones) and at most 52% of the height, top-anchored.
 */
function useLayout() {
  const { size } = useThree();
  const aspect = Math.round((size.width / size.height) * 20) / 20;
  const beside = size.width >= 1200 && aspect >= 1.5;
  const tall = size.width <= size.height;
  return useMemo(() => {
    const d = 2.6;
    const halfH = d * Math.tan(THREE.MathUtils.degToRad(fovFor(size.width, size.height) / 2));
    const halfW = halfH * aspect;
    let bw = (beside ? 0.32 : tall ? 0.7 : 0.34) * 2 * halfW;
    let bh = bw * (BADGE.height / BADGE.width);
    const maxH = (beside ? 0.82 : 0.52) * 2 * halfH;
    if (bh > maxH) [bh, bw] = [maxH, maxH * (BADGE.width / BADGE.height)];
    const scale = bw / BADGE.width;
    const at = (x: number, y: number) => new THREE.Vector3(x, y, -d).applyAxisAngle(X, BASE_PITCH);
    // Beside: vertically centred (a touch low, under the strap); below: the badge's top at 10% from the top of the screen.
    const cy = beside ? -0.04 * halfH : 0.8 * halfH - bh / 2;
    const rest = at(0, cy);
    const top = at(0, halfH * 1.12);
    const anchors = [at(-SPREAD * bw * 0.5, top.y), at(SPREAD * bw * 0.5, top.y)] as const;
    return { beside, scale, rest, anchors };
  }, [beside, tall, aspect, size.width, size.height]);
}
type Layout = ReturnType<typeof useLayout>;

function useBadgeParts(scale: number) {
  return useMemo(() => {
    const w = BADGE.width * scale, h = BADGE.height * scale, r = 0.04 * scale;
    const body = new THREE.ExtrudeGeometry(roundedRect(w, h, r), { depth: 0.008 * scale, bevelEnabled: false, curveSegments: 10 });
    body.translate(0, 0, -0.004 * scale);
    const face = normaliseUVs(new THREE.ShapeGeometry(roundedRect(w - 0.002, h - 0.002, r), 10), w, h);
    const sleeve = new THREE.ShapeGeometry(roundedRect(w + 0.016 * scale, h + 0.016 * scale, r + 0.008 * scale), 10);
    // Opaque printed faces, lit by the sun key + Earth-shine + the HDRI, and carrying their own print as emission so they read
    // clearly at any angle (as present as the Webix Pass; no transparency).
    const frontMap = badgeFront(), backMap = badgeBack();
    const front = new THREE.MeshStandardMaterial({ map: frontMap, emissiveMap: frontMap, emissive: "#ffffff", emissiveIntensity: 0.6, roughness: 0.45, metalness: 0, envMapIntensity: 0.7 });
    const back = new THREE.MeshStandardMaterial({ map: backMap, emissiveMap: backMap, emissive: "#ffffff", emissiveIntensity: 0.45, roughness: 0.5, envMapIntensity: 0.6 });
    const edge = new THREE.MeshStandardMaterial({ color: "#1a253a", roughness: 0.45, metalness: 0.2, envMapIntensity: 0.8 });
    // Clear plastic sleeve: only its glossy highlights show (clearcoat over a nearly invisible film).
    const plastic = new THREE.MeshPhysicalMaterial({ color: "#ffffff", transparent: true, opacity: 0.08, roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.8, depthWrite: false });
    const metal = new THREE.MeshStandardMaterial({ color: "#d4d7e0", metalness: 1, roughness: 0.24, envMapIntensity: 1.6 });
    const band = new MeshLineMaterial({ map: strap(), useMap: 1, repeat: new THREE.Vector2(-4, 1), lineWidth: 0.05 * scale, color: new THREE.Color("#ffffff"), resolution: new THREE.Vector2(1, 1) });
    return { w, h, body, face, sleeve, front, back, edge, plastic, metal, band, lines: [new MeshLineGeometry(), new MeshLineGeometry()] };
  }, [scale]);
}
type Parts = ReturnType<typeof useBadgeParts>;

/** Webbing twist: the ribbon narrows where it turns edge-on (MeshLine always faces the camera). */
const twist = (phase: number) => (p: number) => 0.55 + 0.45 * Math.abs(Math.cos(p * Math.PI * 2.3 + phase));

/** The badge itself (card, sleeve, clip), centred on its own origin. */
function BadgeMesh({ p, scale }: { p: Parts; scale: number }) {
  return (
    <group>
      <mesh geometry={p.body} material={[p.edge, p.edge]} />
      <mesh geometry={p.face} material={p.front} position={[0, 0, 0.0042 * scale]} />
      <mesh geometry={p.face} material={p.back} position={[0, 0, -0.0042 * scale]} rotation={[0, Math.PI, 0]} />
      <mesh geometry={p.sleeve} material={p.plastic} position={[0, 0, 0.009 * scale]} renderOrder={2} />
      {/* Clip: a ring through the badge's top tab and the clasp both straps meet in. */}
      <mesh material={p.metal} position={[0, p.h / 2 + 0.012 * scale, 0]}>
        <torusGeometry args={[0.022 * scale, 0.005 * scale, 10, 28]} />
      </mesh>
      <mesh material={p.metal} position={[0, p.h / 2 + 0.05 * scale, 0]}>
        <boxGeometry args={[0.06 * scale, 0.04 * scale, 0.014 * scale]} />
      </mesh>
    </group>
  );
}

const ME = () => sectionIndex("me");
/** Writes the badge face's screen box (for the HTML hit area); nothing outside About Me. */
const corners = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
function reportBox(obj: THREE.Object3D, w: number, h: number, camera: THREE.Camera, size: { width: number; height: number }) {
  if (journeyStore.get().showing !== ME()) return void (badge.box.w = 0);
  obj.updateWorldMatrix(true, false); // the rigid body syncs after this frame callback
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  corners.forEach((v, i) => {
    v.set((i & 1 ? 0.5 : -0.5) * w, (i & 2 ? 0.5 : -0.5) * h, 0).applyMatrix4(obj.matrixWorld).project(camera);
    const px = (v.x + 1) * 0.5 * size.width, py = (1 - v.y) * 0.5 * size.height;
    [x0, y0, x1, y1] = [Math.min(x0, px), Math.min(y0, py), Math.max(x1, px), Math.max(y1, py)];
  });
  // Bodies not yet synced (first frames) project from the camera: report nothing rather than a giant box.
  if (!(x1 - x0 < size.width && y1 - y0 < size.height)) return void (badge.box.w = 0);
  Object.assign(badge.box, { x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
}

type Body = RefObject<RapierRigidBody>;
/** One strap: a fixed anchor and three rope-jointed links; the last starts exactly at its side of the clip and is joined to it. */
function Chain({ anchor, clip, attach, card, links, scale }: { anchor: THREE.Vector3; clip: THREE.Vector3; attach: [number, number, number]; card: Body; links: Body[]; scale: number }) {
  const fixed = useRef<RapierRigidBody>(null!);
  const length = (anchor.distanceTo(clip) / 3) * 1.02;
  const along = (k: number) => anchor.clone().lerp(clip, k).toArray();
  useRopeJoint(fixed, links[0], [[0, 0, 0], [0, 0, 0], length]);
  useRopeJoint(links[0], links[1], [[0, 0, 0], [0, 0, 0], length]);
  useRopeJoint(links[1], links[2], [[0, 0, 0], [0, 0, 0], length]);
  useSphericalJoint(links[2], card, [[0, 0, 0], attach]);
  return (
    <>
      <RigidBody ref={fixed} {...SEGMENT} type="fixed" position={anchor.toArray()} />
      {links.map((ref, i) => (
        <RigidBody key={i} ref={ref} {...SEGMENT} position={along((i + 1) / 3)}>
          {/* ~1/10 of the badge's mass each (as in the pattern); far lighter and the solver jitters. */}
          <BallCollider args={[0.012 * scale]} density={LINK_DENSITY} collisionGroups={LINKS_ONLY} />
        </RigidBody>
      ))}
    </>
  );
}

function Lanyard({ layout, p }: { layout: Layout; p: Parts }) {
  const { scale, rest, anchors } = layout;
  const card = useRef<RapierRigidBody>(null!);
  const chains = [
    [useRef<RapierRigidBody>(null!), useRef<RapierRigidBody>(null!), useRef<RapierRigidBody>(null!)],
    [useRef<RapierRigidBody>(null!), useRef<RapierRigidBody>(null!), useRef<RapierRigidBody>(null!)],
  ];
  const visual = useRef<THREE.Group>(null);
  const [held, setHeld] = useState(false);
  const st = useRef({ offset: new THREE.Vector3(), v: new THREE.Vector3(), dir: new THREE.Vector3(), ang: new THREE.Vector3(), rot: new THREE.Euler(), q: new THREE.Quaternion(), eased: [0, 1].map(() => [new THREE.Vector3(), new THREE.Vector3()]), init: false }).current;
  const curves = useMemo(() => [0, 1].map(() => Object.assign(new THREE.CatmullRomCurve3([0, 1, 2, 3, 4].map(() => new THREE.Vector3())), { curveType: "chordal" as const })), []);
  const clipY = p.h / 2 + CLIP * p.h * 0.5;
  const side = 0.014 * scale; // each strap meets its own side of the clasp, so the two never cross
  const clipWorld = (s: number) => rest.clone().add(new THREE.Vector3(s * side, clipY, 0));

  const { camera, size } = useThree();
  useEffect(() => {
    p.band.resolution.set(size.width, size.height);
  }, [p, size]);

  useFrame(({ clock }, dt) => {
    if (!card.current || journeyStore.get().showing !== ME()) return;
    const t = clock.elapsedTime;
    const pos = card.current.translation() as THREE.Vector3;
    const all = [card, ...chains[0], ...chains[1]];
    // Grab: follow the pointer on the plane at the badge's depth.
    if (badge.held !== held) {
      if (badge.held) {
        const hit = st.v.set(badge.pointer.x, badge.pointer.y, 0.5).unproject(camera).sub(camera.position).normalize();
        st.offset.copy(hit.multiplyScalar(camera.position.distanceTo(pos))).add(camera.position).sub(pos);
      }
      setHeld(badge.held);
    }
    if (held) {
      const dist = camera.position.distanceTo(pos);
      st.dir.set(badge.pointer.x, badge.pointer.y, 0.5).unproject(camera).sub(camera.position).normalize();
      st.v.copy(camera.position).addScaledVector(st.dir, dist).sub(st.offset);
      all.forEach((r) => r.current?.wakeUp());
      card.current.setNextKinematicTranslation({ x: st.v.x, y: st.v.y, z: st.v.z });
    } else {
      // Zero-g float: a slow wandering force and a little twist; hover tilts it toward the pointer.
      const m = card.current.mass();
      card.current.resetForces(true);
      card.current.resetTorques(true);
      card.current.addForce({ x: Math.sin(t * 0.43) * m * 0.22 * scale, y: Math.sin(t * 0.31) * m * 0.12 * scale, z: Math.cos(t * 0.37) * m * 0.12 * scale }, true);
      const tilt = badge.hover ? badge.pointer.x - ((badge.box.x + badge.box.w / 2) / size.width) * 2 + 1 : 0;
      const k = m * scale * scale;
      card.current.addTorque({ x: badge.hover ? -badge.pointer.y * k * 0.0015 : 0, y: Math.sin(t * 0.27) * k * 0.0006 + tilt * k * 0.002, z: 0 }, true);
    }
    // Straps: each chain's two upper links eased (as in the pattern), then a curve anchor → links → clip.
    chains.forEach((links, c) => {
      const e = st.eased[c];
      if (!st.init) links.slice(0, 2).forEach((r, i) => e[i].copy(r.current.translation() as THREE.Vector3));
      links.slice(0, 2).forEach((r, i) => {
        const tr = r.current.translation() as THREE.Vector3;
        const k = Math.max(0.1, Math.min(1, (e[i].distanceTo(tr) * 10) / scale));
        e[i].lerp(tr, Math.min(1, dt * (10 + k * 40)));
      });
      const pts = curves[c].points;
      pts[0].copy(anchors[c]);
      pts[1].copy(e[0]);
      pts[2].copy(e[1]);
      pts[3].copy(links[2].current.translation() as THREE.Vector3);
      // The strap ends in the clasp itself (not at the last link's centre).
      if (visual.current) {
        visual.current.updateWorldMatrix(true, false);
        pts[4].set((c ? 1 : -1) * side, clipY, 0).applyMatrix4(visual.current.matrixWorld);
      }
      p.lines[c].setPoints(curves[c].getPoints(40), twist(c * 1.3));
    });
    st.init = true;
    // Keep it facing forward: damp the spin about its vertical axis.
    st.ang.copy(card.current.angvel() as THREE.Vector3);
    st.rot.setFromQuaternion(st.q.copy(card.current.rotation() as THREE.Quaternion));
    card.current.setAngvel({ x: st.ang.x, y: st.ang.y - st.rot.y * 0.25, z: st.ang.z }, true);
    if (visual.current) reportBox(visual.current, p.w, p.h, camera, size);
  });

  return (
    <>
      {chains.map((links, c) => (
        <Chain key={c} anchor={anchors[c]} clip={clipWorld(c ? 1 : -1)} attach={[(c ? 1 : -1) * side, clipY, 0]} card={card} links={links} scale={scale} />
      ))}
      <RigidBody ref={card} {...SEGMENT} angularDamping={1.4} linearDamping={1.2} position={rest.toArray()} type={held ? "kinematicPosition" : "dynamic"}>
        <CuboidCollider args={[p.w / 2, p.h / 2, 0.005 * scale]} />
        <group ref={visual}>
          <BadgeMesh p={p} scale={scale} />
        </group>
      </RigidBody>
      {p.lines.map((g, i) => (
        <mesh key={i} geometry={g} material={p.band} />
      ))}
    </>
  );
}

/** Reduced motion: hanging still on two straight straps, tilting a little toward the pointer. */
function StillBadge({ layout, p }: { layout: Layout; p: Parts }) {
  const g = useRef<THREE.Group>(null);
  const { camera, size } = useThree();
  useEffect(() => {
    const clipY = p.h / 2 + CLIP * p.h * 0.5;
    layout.anchors.forEach((a, c) => {
      const clip = layout.rest.clone().add(new THREE.Vector3((c ? 1 : -1) * 0.014 * layout.scale, clipY, 0));
      p.lines[c].setPoints([a, a.clone().lerp(clip, 0.5), clip], twist(c * 1.3));
    });
    p.band.resolution.set(size.width, size.height);
  }, [p, layout, size]);
  useFrame((_, dt) => {
    if (!g.current || journeyStore.get().showing !== ME()) return;
    const k = 1 - Math.exp(-dt * 6);
    g.current.rotation.y += ((badge.hover ? badge.pointer.x * 0.25 : 0) - g.current.rotation.y) * k;
    g.current.rotation.x += ((badge.hover ? -badge.pointer.y * 0.15 : 0) - g.current.rotation.x) * k;
    reportBox(g.current, p.w, p.h, camera, size);
  });
  return (
    <>
      <group ref={g} position={layout.rest}>
        <BadgeMesh p={p} scale={layout.scale} />
      </group>
      {p.lines.map((l, i) => (
        <mesh key={i} geometry={l} material={p.band} />
      ))}
    </>
  );
}

export default function Badge() {
  const layout = useLayout();
  const p = useBadgeParts(layout.scale);
  const on = useJourney((s) => s.showing === sectionIndex("me"));
  const reduced = useJourney((s) => s.reducedMotion);
  useEffect(() => {
    if (!on) badge.box.w = 0;
  }, [on]);
  useEffect(() => () => void (badge.box.w = 0), []);
  // Rebuilt (fresh bodies) when the framing changes.
  const key = `${layout.beside}-${layout.scale.toFixed(3)}-${layout.rest.y.toFixed(3)}`;
  return (
    <group visible={on}>
      {reduced ? (
        <StillBadge key={key} layout={layout} p={p} />
      ) : (
        <Physics key={key} gravity={[0, -1.4, 0]} timeStep={1 / 60} paused={!on}>
          <Lanyard layout={layout} p={p} />
        </Physics>
      )}
    </group>
  );
}
