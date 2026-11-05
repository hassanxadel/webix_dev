import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { easing } from "maath";
import * as THREE from "three";
import { CARD_LAYER, cardState } from "./WebixPass";
import { BASE_PITCH } from "./Space";
import { HERO_GLIDE, SECTIONS, sectionIndex } from "@/config/sections";
import { journey, journeyStore } from "@/lib/journey";

/**
 * A card pose anchored to the screen: normalised device coords (nx, ny) at
 * distance d, a scale, and a rotation relative to facing the camera.
 */
type Pose = { nx: number; ny: number; d: number; scale: number; rx: number; ry: number; rz: number; tilt: number; idle: number };
const P = (nx: number, ny: number, d: number, scale: number, rx = 0, ry = 0, rz = 0, tilt = 1, idle = 1): Pose => ({ nx, ny, d, scale, rx, ry, rz, tilt, idle });

const POSES = {
  // Hero: centre, floating above the Earth's limb. Work: small, tucked in the top-right corner above the filmstrip (which starts at 26vh).
  // After Work: left third on desktop (angled toward the panels), top on phones.
  wide: { hero: P(0, -0.1, 2.6, 0.82), work: P(0.86, 0.76, 2.6, 0.26, 0.05, -0.35, 0, 0.4, 0.5), side: P(-0.64, 0.02, 2.4, 0.74, 0.04, 0.42, 0, 0.55, 0.8) },
  // Short windows (phones in landscape): the card a little higher, under a one-line headline, with room for Get started below.
  short: { hero: P(0, 0.08, 2.6, 0.82), work: P(0.86, 0.76, 2.6, 0.26, 0.05, -0.3, 0, 0.4, 0.5), side: P(-0.64, 0.02, 2.4, 0.74, 0.04, 0.42, 0, 0.55, 0.8) },
  // Phones (portrait, FOV 68°): the card ~74vw wide, centred above the middle so the service grid fits below it.
  tall: { hero: P(0, 0.16, 2.6, 1.0), work: P(0.72, 0.86, 2.6, 0.23, 0.05, -0.3, 0, 0.4, 0.5), side: P(0, 0.7, 2.4, 0.49, 0.04, 0.3, 0, 0.55, 0.8) },
};

/** Vertical FOV per window shape: 45° wide; 68° portrait (wider than 60° so more of the Moon's loop crosses the narrow frame; the limb stays in the bottom ~37%). */
export const fovFor = (w: number, h: number) => (w > h ? 45 : 68);

/** Camera framing: looking slightly up, so the Earth's limb fills the lower ~35–40% of the frame. */
const BASE = { pos: new THREE.Vector3(0, 0, 0), pitch: BASE_PITCH };

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const span = (p: number, a: number, b: number) => ease(Math.min(1, Math.max(0, (p - a) / (b - a))));

/**
 * Camera idle drift + mouse parallax (±1.5° rotation, a little translation so
 * the Earth, Moon, Hubble, card and stars move at different rates),
 * and the card's single writer: its target pose is a pure function of scroll
 * progress (fully reversible), damped so it can never jump.
 */
export function CameraRig() {
  const { camera, size } = useThree();
  const first = useRef(true);
  const look = useRef(new THREE.Vector2());
  const t = useRef({
    a: new THREE.Vector3(),
    b: new THREE.Vector3(),
    qa: new THREE.Quaternion(),
    qb: new THREE.Quaternion(),
    qe: new THREE.Quaternion(),
    e: new THREE.Euler(),
    right: new THREE.Vector3(),
    up: new THREE.Vector3(),
    fwd: new THREE.Vector3(),
    scale: { v: 1 },
  }).current;

  useEffect(() => camera.layers.enable(CARD_LAYER), [camera]);

  useFrame(({ clock }, dt) => {
    const cam = camera as THREE.PerspectiveCamera;
    const wide = size.width / size.height > 1;
    const fov = fovFor(size.width, size.height);
    if (cam.fov !== fov) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    const { reducedMotion } = journeyStore.get();

    // ── Camera: idle drift + damped mouse parallax (none with reduced motion) ──
    const k = 1 - Math.exp(-dt * 2.2);
    look.current.x += ((reducedMotion ? 0 : journey.pointerX) - look.current.x) * k;
    look.current.y += ((reducedMotion ? 0 : journey.pointerY) - look.current.y) * k;
    const time = reducedMotion ? 0 : clock.elapsedTime;
    const yaw = -look.current.x * 0.026 + Math.sin(time * 0.07) * 0.004;
    const pitch = BASE.pitch - look.current.y * 0.016 + Math.sin(time * 0.05) * 0.003;
    cam.position.set(BASE.pos.x + look.current.x * 0.35, BASE.pos.y - look.current.y * 0.12 + Math.sin(time * 0.11) * 0.03, BASE.pos.z);
    cam.rotation.set(pitch, yaw, 0, "YXZ");
    cam.updateMatrixWorld();

    // ── Card: screen-anchored target pose ──
    const S = !wide ? POSES.tall : size.height <= 520 ? POSES.short : POSES.wide;
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

    // Hero → corner over the hero's second half; it stays in the corner through Work and About (the filmstrip, then the badge), → side after About.
    const p = journey.progress;
    const workEnd = SECTIONS[sectionIndex("about")].range[1];
    let from = S.hero, to = S.work, w = span(p, ...HERO_GLIDE);
    if (p >= workEnd - 0.01) [from, to, w] = [S.work, S.side, span(p, workEnd - 0.01, workEnd + 0.02)];
    const A = resolve(from, t.a, t.qa);
    const B = resolve(to, t.b, t.qb);
    t.a.lerp(t.b, w);
    t.qa.slerp(t.qb, w);
    const targetScale = THREE.MathUtils.lerp(A.scale, B.scale, w);

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
    cardState.tilt = THREE.MathUtils.lerp(A.tilt, B.tilt, w);
    cardState.idle = THREE.MathUtils.lerp(A.idle, B.idle, w);
    cardState.flip = 0;
    cardState.overlay = true;
  }, -1);

  return null;
}
