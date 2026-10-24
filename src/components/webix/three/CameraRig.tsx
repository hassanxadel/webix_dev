import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ABOUT_POSTER, CONTACT_WALL_Z, PROCESS_Z, SERVICE_Z, WORK_Y, WORK_Z, WORLD } from "./layout";
import { runtime, sceneStore } from "@/lib/scene-store";
import { PROJECTS } from "@/lib/webix-data";

type Pose = { p: THREE.Vector3; t: THREE.Vector3 };
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/**
 * One camera "shot" per section. `inner` is scroll progress through that
 * section; `wide` is false on portrait screens, where the HTML panel sits
 * below the subject instead of beside it, so shots are centred.
 */
function shot(section: number, inner: number, wide: boolean): Pose {
  const s = sceneStore.get();
  const side = wide ? 1 : 0;
  switch (section) {
    case 0: // Hero: looking down the platform, train nose on the right.
      return { p: v(0.6, 1.7, 10 - inner * 2.5), t: v(-0.8, 2.15, -10) };
    case 1: {
      // Work: travel along the lightbox wall; hover pulls focus to that project.
      const focus = s.hoverProject ?? null;
      const idx = focus ?? inner * (PROJECTS.length - 1);
      const z = THREE.MathUtils.lerp(WORK_Z(0), WORK_Z(PROJECTS.length - 1), idx / (PROJECTS.length - 1));
      return { p: v(-1.3, 1.95, z - 1.4 * side + (wide ? 0 : 1.2)), t: v(WORLD.wallX, WORK_Y - 0.05, z - 1.55 * side) };
    }
    case 2: {
      const i = s.hoverService ?? s.serviceIndex;
      const z = SERVICE_Z(i);
      return { p: v(0.2, 1.6, z - 0.4 * side + (wide ? 0 : 1)), t: v(WORLD.wallX, 1.2, z - 1.9 * side) };
    }
    case 3: // About: diagonal across the platform to the brand column and train.
      return { p: v(-5.4, 1.75, ABOUT_POSTER.z + 7.5 - inner * 1.5), t: v(1.8 + side * 1.6, 1.8, ABOUT_POSTER.z - 3) };
    case 4: {
      // Process: dolly through the light gates as the steps advance.
      const z = THREE.MathUtils.lerp(PROCESS_Z(0) + 5, PROCESS_Z(3) + 2.5, inner);
      return { p: v(-2.2, 1.5, z), t: v(-2.2, 1.55, z - 10) };
    }
    default:
      return { p: v(-2.4, 1.75, CONTACT_WALL_Z + 17 - inner * 3), t: v(-2.6 + side * 3.2, 2.5, CONTACT_WALL_Z) };
  }
}

const smoother = (x: number) => x * x * x * (x * (x * 6 - 15) + 10);

export function CameraRig() {
  const { camera, size } = useThree();
  const lookAt = useRef(new THREE.Vector3(-0.8, 2.15, -10));
  const first = useRef(true);
  const desiredP = useRef(new THREE.Vector3());
  const desiredT = useRef(new THREE.Vector3());

  useFrame((_, dt) => {
    const wide = size.width / size.height > 1;
    const { section, inner, blend } = runtime;
    const reduced = sceneStore.get().reducedMotion;

    let pose = shot(section, inner, wide);
    // Crossing a section boundary: blend the two shots into one continuous move.
    if (blend < 0 && section > 0) {
      const from = shot(section - 1, 1, wide);
      const w = smoother(1 + blend);
      pose = { p: from.p.lerp(pose.p, w), t: from.t.lerp(pose.t, w) };
    } else if (blend > 0 && section < 5) {
      const to = shot(section + 1, 0, wide);
      const w = smoother(blend);
      pose = { p: pose.p.lerp(to.p, w), t: pose.t.lerp(to.t, w) };
    }

    desiredP.current.copy(pose.p);
    desiredT.current.copy(pose.t);
    if (!reduced) {
      // A hint of handheld parallax from the pointer.
      desiredP.current.x += runtime.pointerX * 0.18;
      desiredP.current.y -= runtime.pointerY * 0.1;
      desiredT.current.x += runtime.pointerX * 0.35;
    }

    if (first.current || reduced) {
      camera.position.copy(desiredP.current);
      lookAt.current.copy(desiredT.current);
      first.current = false;
    } else {
      const k = 1 - Math.exp(-dt * 2.6);
      camera.position.lerp(desiredP.current, k);
      lookAt.current.lerp(desiredT.current, k);
    }
    camera.lookAt(lookAt.current);

    const persp = camera as THREE.PerspectiveCamera;
    const fov = wide ? 50 : 64;
    if (persp.fov !== fov) {
      persp.fov = fov;
      persp.updateProjectionMatrix();
    }
  });

  return null;
}
