import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { easing } from "maath";
import * as THREE from "three";
import { cameraAt, doorOpen, riding, trainHead } from "./world";
import { CARD_LAYER, cardState } from "./WebixPass";
import { trainState } from "./Train";
import { DEPARTURE, STATIONS, WORK_WINDOW, toLegacy } from "@/config/stations";
import { journey, journeyStore } from "@/lib/journey";

/** Camera speed (units/s), read by the effects for motion-only chromatic aberration. */
export const cameraMotion = { speed: 0 };

/** Reduced motion: one still shot per station (its anchor) instead of continuous motion. */
function reducedProgress(p: number) {
  let s = STATIONS[0];
  STATIONS.forEach((st) => {
    if (p >= st.range[0]) s = st;
  });
  return s.id === "work" ? p : s.anchor;
}

/**
 * A card pose anchored to the screen: normalised device coords (nx, ny) at
 * distance d, a scale, and a rotation relative to facing the camera.
 */
type Pose = { nx: number; ny: number; d: number; scale: number; rx: number; ry: number; rz: number; tilt: number; idle: number };
const P = (nx: number, ny: number, d: number, scale: number, rx = 0, ry = 0, rz = 0, tilt = 1, idle = 1): Pose => ({ nx, ny, d, scale, rx, ry, rz, tilt, idle });

function poses(wide: boolean) {
  return wide
    ? {
        hero: P(0, -0.02, 2.6, 1.12),
        // 3/4 turn, lifted toward the camera.
        turn: P(0.02, 0.02, 2.2, 1.12, 0.14, -0.72, 0.05),
        // Work: left third, angled toward the windows. Tilt eased to ~10° outside the hero.
        left: P(-0.64, 0.02, 2.4, 0.74, 0.04, 0.42, 0, 0.55, 0.8),
        // About: right third, beside the copy.
        settle: P(0.5, 0.02, 2.4, 0.74, 0.04, -0.34, 0, 0.55, 0.8),
        ride: P(0.66, -0.6, 1.6, 0.22, 0, 0, 0, 0.5, 0.4),
        reveal: P(0, 0.06, 2.2, 0.62, 0, 0, 0, 0.6, 0.6),
        rest: P(-0.62, 0.66, 2.2, 0.26, 0, 0, 0, 0.5, 0.4),
      }
    : {
        hero: P(0, -0.02, 2.6, 0.86),
        turn: P(0, 0.02, 2.2, 0.86, 0.14, -0.7, 0.05),
        // Phones: card at the top (~45% width), windows below.
        left: P(0, 0.64, 2.4, 0.5, 0.04, 0.3, 0, 0.55, 0.8),
        settle: P(0, 0.5, 2.4, 0.55, 0.04, -0.3, 0, 0.55, 0.8),
        ride: P(0.5, -0.66, 1.6, 0.16, 0, 0, 0, 0.5, 0.4),
        reveal: P(0, 0.2, 2.2, 0.42, 0, 0, 0, 0.6, 0.6),
        rest: P(0, 0.8, 2.2, 0.2, 0, 0, 0, 0.5, 0.4),
      };
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const span = (p: number, a: number, b: number) => ease(Math.min(1, Math.max(0, (p - a) / (b - a))));

export function CameraRig() {
  const { camera, size } = useThree();
  const pos = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());
  const prev = useRef(new THREE.Vector3());
  const parallax = useRef(new THREE.Vector2());
  const first = useRef(true);
  const t = useRef({
    a: new THREE.Vector3(),
    b: new THREE.Vector3(),
    target: new THREE.Vector3(),
    qa: new THREE.Quaternion(),
    qb: new THREE.Quaternion(),
    qe: new THREE.Quaternion(),
    e: new THREE.Euler(),
    right: new THREE.Vector3(),
    up: new THREE.Vector3(),
    fwd: new THREE.Vector3(),
    scale: { v: 1 },
  }).current;

  // See the card's layer as well as the world's.
  useEffect(() => camera.layers.enable(CARD_LAYER), [camera]);

  useFrame((_, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    const wide = size.width / size.height > 1;
    const { reducedMotion, workStep } = journeyStore.get();
    const p = reducedMotion ? reducedProgress(journey.progress) : journey.progress;
    const lp = toLegacy(p);

    // The 3D world runs on its original timeline.
    trainState.head = trainHead(lp);
    trainState.door = doorOpen(lp);
    cameraAt(lp, pos.current, look.current);
    const k = 1 - Math.exp(-dt * 3);
    parallax.current.x += ((reducedMotion ? 0 : journey.pointerX) * 0.05 - parallax.current.x) * k;
    parallax.current.y += ((reducedMotion ? 0 : journey.pointerY) * 0.03 - parallax.current.y) * k;
    cam.position.copy(pos.current);
    cam.lookAt(look.current);
    cam.translateX(parallax.current.x);
    cam.translateY(-parallax.current.y);
    const fov = wide ? 45 : 60;
    if (cam.fov !== fov) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    cam.updateMatrixWorld();
    cameraMotion.speed = dt > 0 ? prev.current.distanceTo(cam.position) / dt : 0;
    prev.current.copy(cam.position);
    trainState.riding = riding(cam.position.z, cam.position.x, lp);

    // ── Card: target pose from scroll (pure function of progress → fully reversible) ──
    const S = poses(wide);
    const halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    cam.matrixWorld.extractBasis(t.right, t.up, t.fwd);
    t.fwd.negate();
    const resolve = (pose: Pose, out: THREE.Vector3, q: THREE.Quaternion, extraRy = 0) => {
      out
        .copy(cam.position)
        .addScaledVector(t.fwd, pose.d)
        .addScaledVector(t.right, pose.nx * pose.d * halfH * cam.aspect)
        .addScaledVector(t.up, pose.ny * pose.d * halfH);
      q.copy(cam.quaternion).multiply(t.qe.setFromEuler(t.e.set(pose.rx, pose.ry + extraRy, pose.rz)));
      return pose;
    };

    // Each project change gives the card a small turn (~20°), alternating direction.
    const inWork = p >= DEPARTURE.end && p < WORK_WINDOW[1] + 0.02;
    const projectTurn = inWork && !reducedMotion ? (workStep % 2 ? -0.35 : 0) : 0;

    let from = S.hero;
    let to = S.hero;
    let w = 0;
    const [, w1] = WORK_WINDOW;
    if (p < DEPARTURE.copyOut[1]) [from, to, w] = [S.hero, S.turn, span(p, ...DEPARTURE.copyOut)];
    else if (p < DEPARTURE.run[1]) [from, to, w] = [S.turn, S.left, span(p, ...DEPARTURE.run)];
    else if (p < w1) [from, to, w] = [S.left, S.left, 0];
    else if (p < w1 + 0.02) [from, to, w] = [S.left, S.settle, span(p, w1, w1 + 0.02)];
    // About onward: the original sequence, on the world's timeline.
    else if (lp < 0.3) [from, to, w] = [S.settle, S.settle, 0];
    else if (lp < 0.33) [from, to, w] = [S.settle, S.ride, span(lp, 0.3, 0.33)];
    else if (lp < 0.92) [from, to, w] = [S.ride, S.ride, 0];
    else if (lp < 0.945) [from, to, w] = [S.ride, S.reveal, span(lp, 0.92, 0.945)];
    else if (lp < 0.962) [from, to, w] = [S.reveal, S.reveal, 0];
    else [from, to, w] = [S.reveal, S.rest, span(lp, 0.962, 0.976)];

    const A = resolve(from, t.a, t.qa, projectTurn * (1 - w));
    const B = resolve(to, t.b, t.qb, projectTurn * w);
    t.target.lerpVectors(t.a, t.b, w);
    t.qa.slerp(t.qb, w);
    const targetScale = THREE.MathUtils.lerp(A.scale, B.scale, w);

    // The card damps toward its target: nothing else writes its transform, so it can't jump.
    const smooth = reducedMotion ? 0.12 : 0.2;
    if (first.current) {
      cardState.position.copy(t.target);
      cardState.quaternion.copy(t.qa);
      cardState.scale = targetScale;
      first.current = false;
    } else {
      easing.damp3(cardState.position, t.target, smooth, dt);
      easing.dampQ(cardState.quaternion, t.qa, smooth, dt);
      t.scale.v = cardState.scale;
      easing.damp(t.scale, "v", targetScale, smooth, dt);
      cardState.scale = t.scale.v;
    }
    cardState.tilt = THREE.MathUtils.lerp(A.tilt, B.tilt, w);
    cardState.idle = THREE.MathUtils.lerp(A.idle, B.idle, w);
    cardState.flip = lp >= 0.93 && p > w1 ? span(lp, 0.93, 0.952) : 0;
    cardState.overlay = true;
  }, -1);

  return null;
}
