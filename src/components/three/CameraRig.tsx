import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { READER, cameraAt, doorOpen, riding, trainHead } from "./world";
import { CARD_LAYER, cardState } from "./WebixPass";
import { trainState } from "./Train";
import { STATIONS } from "@/config/stations";
import { journey, journeyStore } from "@/lib/journey";

/** Camera speed (units/s), read by the effects for motion-only chromatic aberration. */
export const cameraMotion = { speed: 0 };

/** Reduced motion: one still shot per station instead of camera flights. */
const STILL_SHOTS = [0, 0.25, 0.37, 0.53, 0.665, 0.8, 0.985];
function reducedProgress(p: number) {
  let i = 0;
  STATIONS.forEach((s, k) => {
    if (p >= s.range[0]) i = k;
  });
  return STILL_SHOTS[i];
}

type ScreenPose = { nx: number; ny: number; d: number; scale: number; tilt: number; idle: number; flip: number };

/** Card poses anchored to the screen (normalised device coords at distance d). */
function screenPoses(wide: boolean): Record<"hero" | "ride" | "reveal" | "rest", ScreenPose> {
  return {
    hero: wide ? { nx: 0.3, ny: -0.02, d: 2.6, scale: 0.85, tilt: 1, idle: 1, flip: 0 } : { nx: 0, ny: 0.44, d: 2.6, scale: 0.5, tilt: 1, idle: 1, flip: 0 },
    ride: wide ? { nx: 0.66, ny: -0.6, d: 1.6, scale: 0.22, tilt: 0.6, idle: 0.4, flip: 0 } : { nx: 0.5, ny: -0.66, d: 1.6, scale: 0.16, tilt: 0.6, idle: 0.4, flip: 0 },
    reveal: wide ? { nx: 0, ny: 0.06, d: 2.2, scale: 0.62, tilt: 0.8, idle: 0.6, flip: 1 } : { nx: 0, ny: 0.2, d: 2.2, scale: 0.42, tilt: 0.8, idle: 0.6, flip: 1 },
    rest: wide ? { nx: -0.62, ny: 0.66, d: 2.2, scale: 0.26, tilt: 0.6, idle: 0.4, flip: 1 } : { nx: 0, ny: 0.8, d: 2.2, scale: 0.2, tilt: 0.6, idle: 0.4, flip: 1 },
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
  const tmp = useRef({
    a: new THREE.Vector3(),
    b: new THREE.Vector3(),
    qa: new THREE.Quaternion(),
    qb: new THREE.Quaternion(),
    right: new THREE.Vector3(),
    up: new THREE.Vector3(),
    fwd: new THREE.Vector3(),
    flat: new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0.25)),
  });

  // See the card's layer as well as the world's.
  useEffect(() => camera.layers.enable(CARD_LAYER), [camera]);

  useFrame((_, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    const wide = size.width / size.height > 1;
    const { reducedMotion } = journeyStore.get();
    const p = reducedMotion ? reducedProgress(journey.progress) : journey.progress;

    // Train timetable and doors.
    trainState.head = trainHead(p);
    trainState.door = doorOpen(p);

    // Camera along the path, with a whisper of pointer parallax.
    cameraAt(p, pos.current, look.current);
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
    trainState.riding = riding(cam.position.z, cam.position.x, p);

    // ── Card choreography ──
    const t = tmp.current;
    const poses = screenPoses(wide);
    const halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    cam.matrixWorld.extractBasis(t.right, t.up, t.fwd);
    t.fwd.negate();
    const screenToWorld = (sp: ScreenPose, out: THREE.Vector3) =>
      out
        .copy(cam.position)
        .addScaledVector(t.fwd, sp.d)
        .addScaledVector(t.right, sp.nx * sp.d * halfH * cam.aspect)
        .addScaledVector(t.up, sp.ny * sp.d * halfH);

    // Which two poses are we between, and how far?
    let from: ScreenPose | "reader" = poses.hero;
    let to: ScreenPose | "reader" = poses.hero;
    let w = 0;
    if (p < 0.042) [from, to, w] = [poses.hero, poses.hero, 0];
    else if (p < 0.072) [from, to, w] = [poses.hero, "reader", span(p, 0.042, 0.072)];
    else if (p < 0.08) [from, to, w] = ["reader", "reader", 0];
    else if (p < 0.11) [from, to, w] = ["reader", poses.ride, span(p, 0.08, 0.11)];
    else if (p < 0.92) [from, to, w] = [poses.ride, poses.ride, 0];
    else if (p < 0.945) [from, to, w] = [poses.ride, poses.reveal, span(p, 0.92, 0.945)];
    else if (p < 0.962) [from, to, w] = [poses.reveal, poses.reveal, 0];
    else [from, to, w] = [poses.reveal, poses.rest, span(p, 0.962, 0.976)];

    const resolve = (pose: ScreenPose | "reader", out: THREE.Vector3, q: THREE.Quaternion) => {
      if (pose === "reader") {
        out.copy(READER).add(new THREE.Vector3(0, 0.012, 0));
        q.copy(t.flat);
        return { scale: 0.28, tilt: 0, idle: 0, flip: 0 };
      }
      screenToWorld(pose, out);
      q.copy(cam.quaternion);
      return pose;
    };
    const A = resolve(from, t.a, t.qa);
    const B = resolve(to, t.b, t.qb);
    cardState.position.lerpVectors(t.a, t.b, w);
    t.qa.slerp(t.qb, w);
    cardState.rotation.setFromQuaternion(t.qa);
    cardState.scale = THREE.MathUtils.lerp(A.scale, B.scale, w);
    cardState.tilt = THREE.MathUtils.lerp(A.tilt, B.tilt, w);
    cardState.idle = THREE.MathUtils.lerp(A.idle, B.idle, w);
    // The flip itself happens mid-reveal, once the card is centred.
    cardState.flip = p >= 0.93 ? span(p, 0.93, 0.952) : 0;
    // Only the gate tap happens in the world; everywhere else the card is held up to the screen.
    cardState.overlay = from !== "reader" && to !== "reader";
  }, -1);

  return null;
}
