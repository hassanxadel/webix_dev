import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { cameraAt, doorOpen, riding, trainHead } from "./world";
import { CARD_LAYER, cardState } from "./WebixPass";
import { trainState } from "./Train";
import { STATIONS } from "@/config/stations";
import { HERO, plateFor, plateToViewport } from "@/lib/heroPlate";
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

/**
 * A card pose anchored to the screen: normalised device coords (nx, ny) at
 * distance d, a scale, and a rotation relative to facing the camera.
 */
type Pose = { nx: number; ny: number; d: number; scale: number; rx: number; ry: number; rz: number; tilt: number; idle: number };

function poses(wide: boolean, reader: { nx: number; ny: number }): Record<"hero" | "turn" | "reader" | "settle" | "ride" | "reveal" | "rest", Pose> {
  const P = (nx: number, ny: number, d: number, scale: number, rx = 0, ry = 0, rz = 0, tilt = 1, idle = 1): Pose => ({ nx, ny, d, scale, rx, ry, rz, tilt, idle });
  return wide
    ? {
        // Centre third, ~40% of the viewport width.
        hero: P(0, -0.02, 2.6, 1.12),
        // 3/4 turn toward the camera: shows the W's pink-red depth and the glowing edge.
        turn: P(0.02, 0, 2.15, 1.2, 0.14, -0.72, 0.05),
        // Lying back over the gate reader in the photograph.
        reader: P(reader.nx, reader.ny + 0.06, 2.4, 0.34, -1.05, 0.2, 0.25, 0, 0),
        // Right third, beside the Vision copy.
        settle: P(0.5, 0.02, 2.4, 0.74, 0.04, -0.34, 0),
        ride: P(0.66, -0.6, 1.6, 0.22, 0, 0, 0, 0.6, 0.4),
        reveal: P(0, 0.06, 2.2, 0.62, 0, 0, 0, 0.8, 0.6),
        rest: P(-0.62, 0.66, 2.2, 0.26, 0, 0, 0, 0.6, 0.4),
      }
    : {
        // ~75% of the viewport width on phones.
        hero: P(0, -0.02, 2.6, 0.86),
        turn: P(0, 0, 2.2, 0.86, 0.14, -0.7, 0.05),
        reader: P(reader.nx, reader.ny + 0.05, 2.4, 0.3, -1.05, 0.2, 0.25, 0, 0),
        settle: P(0, 0.5, 2.4, 0.55, 0.04, -0.3, 0),
        ride: P(0.5, -0.66, 1.6, 0.16, 0, 0, 0, 0.6, 0.4),
        reveal: P(0, 0.2, 2.2, 0.42, 0, 0, 0, 0.8, 0.6),
        rest: P(0, 0.8, 2.2, 0.2, 0, 0, 0, 0.6, 0.4),
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
    qe: new THREE.Quaternion(),
    e: new THREE.Euler(),
    right: new THREE.Vector3(),
    up: new THREE.Vector3(),
    fwd: new THREE.Vector3(),
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
    const plate = plateFor(size.width, size.height);
    const r = plateToViewport(plate, plate.reader, size.width, size.height);
    const P = poses(wide, { nx: (r.x / size.width) * 2 - 1, ny: -((r.y / size.height) * 2 - 1) });
    const halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    cam.matrixWorld.extractBasis(t.right, t.up, t.fwd);
    t.fwd.negate();

    const resolve = (pose: Pose, out: THREE.Vector3, q: THREE.Quaternion) => {
      out
        .copy(cam.position)
        .addScaledVector(t.fwd, pose.d)
        .addScaledVector(t.right, pose.nx * pose.d * halfH * cam.aspect)
        .addScaledVector(t.up, pose.ny * pose.d * halfH);
      q.copy(cam.quaternion).multiply(t.qe.setFromEuler(t.e.set(pose.rx, pose.ry, pose.rz)));
      return pose;
    };

    // Which two poses are we between, and how far? Hero beats first, then the journey.
    let from = P.hero;
    let to = P.hero;
    let w = 0;
    if (p < HERO.turn[1]) [from, to, w] = [P.hero, P.turn, span(p, ...HERO.turn)];
    else if (p < HERO.tap) [from, to, w] = [P.turn, P.reader, span(p, HERO.glide[0], HERO.tap)];
    else if (p < HERO.settle[0]) [from, to, w] = [P.reader, P.reader, 0];
    else if (p < HERO.end) [from, to, w] = [P.reader, P.settle, span(p, ...HERO.settle)];
    else if (p < 0.3) [from, to, w] = [P.settle, P.settle, 0];
    else if (p < 0.33) [from, to, w] = [P.settle, P.ride, span(p, 0.3, 0.33)];
    else if (p < 0.92) [from, to, w] = [P.ride, P.ride, 0];
    else if (p < 0.945) [from, to, w] = [P.ride, P.reveal, span(p, 0.92, 0.945)];
    else if (p < 0.962) [from, to, w] = [P.reveal, P.reveal, 0];
    else [from, to, w] = [P.reveal, P.rest, span(p, 0.962, 0.976)];

    const A = resolve(from, t.a, t.qa);
    const B = resolve(to, t.b, t.qb);
    cardState.position.lerpVectors(t.a, t.b, w);
    t.qa.slerp(t.qb, w);
    cardState.rotation.setFromQuaternion(t.qa);
    cardState.scale = THREE.MathUtils.lerp(A.scale, B.scale, w);
    cardState.tilt = THREE.MathUtils.lerp(A.tilt, B.tilt, w);
    cardState.idle = THREE.MathUtils.lerp(A.idle, B.idle, w);
    // The flip happens mid-reveal at the terminal, once the card is centred.
    cardState.flip = p >= 0.93 ? span(p, 0.93, 0.952) : 0;
    cardState.overlay = true;
  }, -1);

  return null;
}
