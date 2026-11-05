import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { BallCollider, CuboidCollider, Physics, RigidBody, useRopeJoint, useSphericalJoint, type RapierRigidBody } from "@react-three/rapier";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import * as THREE from "three";
import { normaliseUVs, roundedRect } from "./cardArt";
import { BADGE, badgeBack, badgeFront, strap } from "./badgeArt";
import { BASE_PITCH } from "./Space";
import { badge } from "@/lib/badge";
import { sectionIndex } from "@/config/sections";
import { journeyStore, useJourney } from "@/lib/journey";

/**
 * About: the founder's crew pass on a lanyard (the R3F "lanyard badge"
 * pattern). A fixed anchor above the screen, three rope-jointed links and the
 * badge on a spherical joint; the strap is a MeshLine along a Catmull-Rom curve
 * through them. Low gravity, so it floats and sways on its own (a slow drift
 * force + torque); grab and drag it (HTML hit area → `badge`), and it swings
 * back, damped. Physics runs only while About is on screen. Reduced motion: a
 * still badge on a straight strap, tilting toward the pointer.
 */

const X = new THREE.Vector3(1, 0, 0);
const LINK_DENSITY = 50;
const SEGMENT = { type: "dynamic" as const, canSleep: true, colliders: false as const, angularDamping: 2, linearDamping: 2 };

/** Anchor and badge rest position in world space, from the camera framing (left third on wide screens, top centre on phones). */
function useLayout() {
  const { size } = useThree();
  const wide = size.width > size.height;
  const aspect = Math.round((size.width / size.height) * 20) / 20;
  return useMemo(() => {
    const d = 2.6;
    const halfH = d * Math.tan(THREE.MathUtils.degToRad((wide ? 45 : 60) / 2));
    const halfW = halfH * aspect;
    const scale = wide ? 1 : 0.62;
    const at = (nx: number, ny: number) => new THREE.Vector3(nx * halfW, ny * halfH, -d).applyAxisAngle(X, BASE_PITCH);
    const rest = wide ? at(-0.42, -0.06) : at(0, 0.5);
    const anchor = at(wide ? -0.42 : 0, 1.12);
    return { wide, scale, rest, anchor };
  }, [wide, aspect]);
}

function useBadgeParts(scale: number) {
  return useMemo(() => {
    const w = BADGE.width * scale, h = BADGE.height * scale, r = 0.04 * scale;
    const body = new THREE.ExtrudeGeometry(roundedRect(w, h, r), { depth: 0.008 * scale, bevelEnabled: false, curveSegments: 10 });
    body.translate(0, 0, -0.004 * scale);
    const face = normaliseUVs(new THREE.ShapeGeometry(roundedRect(w - 0.002, h - 0.002, r), 10), w, h);
    const sleeve = new THREE.ShapeGeometry(roundedRect(w + 0.016 * scale, h + 0.016 * scale, r + 0.008 * scale), 10);
    const front = new THREE.MeshStandardMaterial({ map: badgeFront(), roughness: 0.62, metalness: 0, envMapIntensity: 0.35 });
    const back = new THREE.MeshStandardMaterial({ map: badgeBack(), roughness: 0.7, envMapIntensity: 0.3 });
    const edge = new THREE.MeshStandardMaterial({ color: "#070b14", roughness: 0.5 });
    // Clear plastic sleeve: barely there, with a soft specular sheen from the environment.
    const plastic = new THREE.MeshPhysicalMaterial({ color: "#ffffff", transparent: true, opacity: 0.1, roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.6, depthWrite: false });
    const metal = new THREE.MeshStandardMaterial({ color: "#c9ccd6", metalness: 1, roughness: 0.28, envMapIntensity: 1.4 });
    const band = new MeshLineMaterial({ map: strap(), useMap: 1, repeat: new THREE.Vector2(-4, 1), lineWidth: 0.05 * scale, color: new THREE.Color("#ffffff"), resolution: new THREE.Vector2(1, 1) });
    return { w, h, body, face, sleeve, front, back, edge, plastic, metal, band, line: new MeshLineGeometry() };
  }, [scale]);
}

type Parts = ReturnType<typeof useBadgeParts>;

/** The badge itself (card, sleeve, clip), centred on its own origin. */
function BadgeMesh({ p, scale }: { p: Parts; scale: number }) {
  return (
    <group>
      <mesh geometry={p.body} material={[p.edge, p.edge]} />
      <mesh geometry={p.face} material={p.front} position={[0, 0, 0.0042 * scale]} />
      <mesh geometry={p.face} material={p.back} position={[0, 0, -0.0042 * scale]} rotation={[0, Math.PI, 0]} />
      <mesh geometry={p.sleeve} material={p.plastic} position={[0, 0, 0.009 * scale]} renderOrder={2} />
      {/* Clip: a ring through the badge's top tab and a small metal clasp. */}
      <mesh material={p.metal} position={[0, p.h / 2 + 0.012 * scale, 0]}>
        <torusGeometry args={[0.022 * scale, 0.005 * scale, 10, 28]} />
      </mesh>
      <mesh material={p.metal} position={[0, p.h / 2 + 0.05 * scale, 0]}>
        <boxGeometry args={[0.05 * scale, 0.034 * scale, 0.012 * scale]} />
      </mesh>
    </group>
  );
}

/** Writes the badge face's screen box (for the HTML hit area). */
const corners = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
function reportBox(obj: THREE.Object3D, w: number, h: number, camera: THREE.Camera, size: { width: number; height: number }) {
  // Only while About is on screen (the bodies hold still, possibly un-synced, elsewhere).
  if (journeyStore.get().section !== sectionIndex("about")) return void (badge.box.w = 0);
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

function Lanyard({ layout, p }: { layout: ReturnType<typeof useLayout>; p: Parts }) {
  const { scale, rest, anchor } = layout;
  const fixed = useRef<RapierRigidBody>(null!);
  const j1 = useRef<RapierRigidBody>(null!);
  const j2 = useRef<RapierRigidBody>(null!);
  const j3 = useRef<RapierRigidBody>(null!);
  const card = useRef<RapierRigidBody>(null!);
  const visual = useRef<THREE.Group>(null);
  const [held, setHeld] = useState(false);
  const st = useRef({ offset: new THREE.Vector3(), v: new THREE.Vector3(), dir: new THREE.Vector3(), ang: new THREE.Vector3(), rot: new THREE.Euler(), q: new THREE.Quaternion(), lerped: [new THREE.Vector3(), new THREE.Vector3()], init: false }).current;
  const curve = useMemo(() => Object.assign(new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]), { curveType: "chordal" as const }), []);

  // Links spaced evenly from the anchor down to the clip; the last one starts exactly at the clip, so no joint begins stretched.
  const top = rest.clone().add(new THREE.Vector3(0, p.h / 2 + 0.07 * scale, 0));
  const link = (top.distanceTo(anchor) / 3) * 1.02;
  const along = (k: number) => anchor.clone().lerp(top, k).toArray();
  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], link]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], link]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], link]);
  useSphericalJoint(j3, card, [[0, 0, 0], [0, p.h / 2 + 0.07 * scale, 0]]);

  const { camera, size } = useThree();
  useEffect(() => {
    p.band.resolution.set(size.width, size.height);
  }, [p, size]);

  useFrame(({ clock }, dt) => {
    if (!card.current || !fixed.current) return;
    const t = clock.elapsedTime;
    const pos = card.current.translation();
    // Grab: follow the pointer on the plane at the badge's depth.
    if (badge.held !== held) {
      if (badge.held) {
        const hit = st.v.set(badge.pointer.x, badge.pointer.y, 0.5).unproject(camera).sub(camera.position).normalize();
        st.offset.copy(hit.multiplyScalar(camera.position.distanceTo(pos as THREE.Vector3))).add(camera.position).sub(pos as THREE.Vector3);
      }
      setHeld(badge.held);
    }
    if (held) {
      const dist = camera.position.distanceTo(pos as THREE.Vector3);
      st.dir.set(badge.pointer.x, badge.pointer.y, 0.5).unproject(camera).sub(camera.position).normalize();
      st.v.copy(camera.position).addScaledVector(st.dir, dist).sub(st.offset);
      [card, j1, j2, j3].forEach((r) => r.current.wakeUp());
      card.current.setNextKinematicTranslation({ x: st.v.x, y: st.v.y, z: st.v.z });
    } else {
      // Zero-g float: a slow wandering force and a little twist; hover tilts it toward the pointer.
      const m = card.current.mass();
      card.current.resetForces(true);
      card.current.resetTorques(true);
      card.current.addForce({ x: Math.sin(t * 0.43) * m * 0.22, y: Math.sin(t * 0.31) * m * 0.12, z: Math.cos(t * 0.37) * m * 0.12 }, true);
      // Pointer relative to the badge's own screen centre.
      const tilt = badge.hover ? badge.pointer.x - ((badge.box.x + badge.box.w / 2) / size.width) * 2 + 1 : 0;
      card.current.addTorque({ x: badge.hover ? -badge.pointer.y * m * 0.0015 : 0, y: Math.sin(t * 0.27) * m * 0.0006 + tilt * m * 0.002, z: 0 }, true);
    }
    // Strap: the two middle links eased (as in the pattern), then a curve through all of them.
    if (!st.init) {
      st.lerped[0].copy(j1.current.translation() as THREE.Vector3);
      st.lerped[1].copy(j2.current.translation() as THREE.Vector3);
      st.init = true;
    }
    [j1, j2].forEach((r, i) => {
      const tr = r.current.translation() as THREE.Vector3;
      const k = Math.max(0.1, Math.min(1, st.lerped[i].distanceTo(tr) * 10));
      st.lerped[i].lerp(tr, Math.min(1, dt * (10 + k * 40)));
    });
    curve.points[0].copy(j3.current.translation() as THREE.Vector3);
    curve.points[1].copy(st.lerped[1]);
    curve.points[2].copy(st.lerped[0]);
    curve.points[3].copy(fixed.current.translation() as THREE.Vector3);
    p.line.setPoints(curve.getPoints(32));
    // Keep it facing forward: damp the spin about its vertical axis.
    st.ang.copy(card.current.angvel() as THREE.Vector3);
    st.rot.setFromQuaternion(st.q.copy(card.current.rotation() as THREE.Quaternion));
    card.current.setAngvel({ x: st.ang.x, y: st.ang.y - st.rot.y * 0.25, z: st.ang.z }, true);
    if (visual.current) reportBox(visual.current, p.w, p.h, camera, size);
  });

  return (
    <>
      <RigidBody ref={fixed} {...SEGMENT} type="fixed" position={anchor.toArray()} />
      {/* Links weigh ~1/10 of the badge each (as in the pattern); far lighter and the solver jitters. */}
      <RigidBody ref={j1} {...SEGMENT} position={along(1 / 3)}>
        <BallCollider args={[0.012 * scale]} density={LINK_DENSITY} />
      </RigidBody>
      <RigidBody ref={j2} {...SEGMENT} position={along(2 / 3)}>
        <BallCollider args={[0.012 * scale]} density={LINK_DENSITY} />
      </RigidBody>
      <RigidBody ref={j3} {...SEGMENT} position={along(1)}>
        <BallCollider args={[0.012 * scale]} density={LINK_DENSITY} />
      </RigidBody>
      <RigidBody ref={card} {...SEGMENT} angularDamping={1.4} linearDamping={1.2} position={rest.toArray()} type={held ? "kinematicPosition" : "dynamic"}>
        <CuboidCollider args={[p.w / 2, p.h / 2, 0.005 * scale]} />
        <group ref={visual}>
          <BadgeMesh p={p} scale={scale} />
        </group>
      </RigidBody>
      <mesh geometry={p.line} material={p.band} />
    </>
  );
}

/** Reduced motion: hanging still, tilting a little toward the pointer. */
function StillBadge({ layout, p }: { layout: ReturnType<typeof useLayout>; p: Parts }) {
  const g = useRef<THREE.Group>(null);
  const { camera, size } = useThree();
  useEffect(() => {
    p.line.setPoints([layout.anchor, layout.rest.clone().add(new THREE.Vector3(0, p.h / 2 + 0.07 * layout.scale, 0))]);
    p.band.resolution.set(size.width, size.height);
  }, [p, layout, size]);
  useFrame((_, dt) => {
    if (!g.current) return;
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
      <mesh geometry={p.line} material={p.band} />
    </>
  );
}

export default function Badge() {
  const layout = useLayout();
  const p = useBadgeParts(layout.scale);
  const about = useJourney((s) => s.section === sectionIndex("about"));
  const reduced = useJourney((s) => s.reducedMotion);
  useEffect(() => {
    if (!about) badge.box.w = 0;
  }, [about]);
  useEffect(() => () => void (badge.box.w = 0), []);
  // Rebuilt (fresh bodies) when the framing changes.
  const key = `${layout.wide}-${layout.rest.x.toFixed(2)}`;
  return (
    <group visible={about}>
      {reduced ? (
        <StillBadge key={key} layout={layout} p={p} />
      ) : (
        <Physics key={key} gravity={[0, -1.4, 0]} timeStep={1 / 60} paused={!about}>
          <Lanyard layout={layout} p={p} />
        </Physics>
      )}
    </group>
  );
}
