import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { easing } from "maath";
import * as THREE from "three";
import { CARD_LAYER, cardState } from "./WebixPass";
import { HERO_GLIDE } from "@/config/sections";
import { journey, journeyStore } from "@/lib/journey";

/**
 * A card pose anchored to the screen: normalised device coords (nx, ny) at
 * distance d, a scale, and a rotation relative to facing the camera.
 */
type Pose = { nx: number; ny: number; d: number; scale: number; rx: number; ry: number; rz: number; tilt: number; idle: number };
const P = (nx: number, ny: number, d: number, scale: number, rx = 0, ry = 0, rz = 0, tilt = 1, idle = 1): Pose => ({ nx, ny, d, scale, rx, ry, rz, tilt, idle });

const POSES = {
  // Hero: centre. After it: left third on desktop (angled toward the panels), top on phones.
  wide: { hero: P(0, -0.02, 2.6, 1.12), side: P(-0.64, 0.02, 2.4, 0.74, 0.04, 0.42, 0, 0.55, 0.8) },
  tall: { hero: P(0, -0.02, 2.6, 0.8), side: P(0, 0.7, 2.4, 0.42, 0.04, 0.3, 0, 0.55, 0.8) },
};

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const span = (p: number, a: number, b: number) => ease(Math.min(1, Math.max(0, (p - a) / (b - a))));

/**
 * The camera is fixed; this is the card's single writer. The target pose is a
 * pure function of scroll progress (fully reversible) and the card damps
 * toward it, so it can never jump.
 */
export function CameraRig() {
  const { camera, size } = useThree();
  const first = useRef(true);
  const t = useRef({
    a: new THREE.Vector3(),
    b: new THREE.Vector3(),
    qa: new THREE.Quaternion(),
    qb: new THREE.Quaternion(),
    qe: new THREE.Quaternion(),
    e: new THREE.Euler(),
    scale: { v: 1 },
  }).current;

  // See the card's layer as well as the default one.
  useEffect(() => camera.layers.enable(CARD_LAYER), [camera]);

  useFrame((_, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    const wide = size.width / size.height > 1;
    const fov = wide ? 45 : 60;
    if (cam.fov !== fov) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    const { reducedMotion, workStep, section } = journeyStore.get();
    const S = wide ? POSES.wide : POSES.tall;
    const halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const resolve = (pose: Pose, out: THREE.Vector3, q: THREE.Quaternion, extraRy = 0) => {
      out.set(pose.nx * pose.d * halfH * cam.aspect, pose.ny * pose.d * halfH, -pose.d);
      q.setFromEuler(t.e.set(pose.rx, pose.ry + extraRy, pose.rz));
    };

    // Each project change in Work gives the card a small turn (~20°), alternating direction.
    const turn = section === 1 && !reducedMotion && workStep % 2 ? -0.35 : 0;
    const w = span(journey.progress, ...HERO_GLIDE);
    resolve(S.hero, t.a, t.qa);
    resolve(S.side, t.b, t.qb, turn);
    t.a.lerp(t.b, w);
    t.qa.slerp(t.qb, w);
    const targetScale = THREE.MathUtils.lerp(S.hero.scale, S.side.scale, w);

    const smooth = reducedMotion ? 0.12 : 0.2;
    if (first.current) {
      cardState.position.copy(t.a);
      cardState.quaternion.copy(t.qa);
      cardState.scale = targetScale;
      first.current = false;
    } else {
      easing.damp3(cardState.position, t.a, smooth, dt);
      easing.dampQ(cardState.quaternion, t.qa, smooth, dt);
      t.scale.v = cardState.scale;
      easing.damp(t.scale, "v", targetScale, smooth, dt);
      cardState.scale = t.scale.v;
    }
    cardState.tilt = THREE.MathUtils.lerp(S.hero.tilt, S.side.tilt, w);
    cardState.idle = THREE.MathUtils.lerp(S.hero.idle, S.side.idle, w);
    cardState.flip = 0;
    cardState.overlay = true;
  }, -1);

  return null;
}
