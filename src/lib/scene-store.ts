import { useSyncExternalStore } from "react";

/**
 * Two layers of shared state between the HTML interface and the Three.js scene:
 *
 * - `runtime` is a plain mutable object written by the scroll tracker and read
 *   every frame by the camera rig. It never triggers React renders.
 * - `sceneStore` holds discrete values (active project, hovered service…) that
 *   both the DOM and the 3D objects react to.
 */

export const SECTION_IDS = ["home", "work", "services", "about", "process", "contact"] as const;
export type SectionId = (typeof SECTION_IDS)[number];

export const runtime = {
  /** Section the viewport centre is in, with blend info toward neighbours. */
  section: 0,
  /** 0..1 progress through the current section (sticky sections use their pinned range). */
  inner: 0,
  /** Blend toward the previous (-) or next (+) section while crossing a boundary, -0.5..0.5. */
  blend: 0,
  pointerX: 0,
  pointerY: 0,
};

type SceneState = {
  section: number;
  workIndex: number;
  serviceIndex: number;
  processIndex: number;
  hoverProject: number | null;
  hoverService: number | null;
  openProject: number | null;
  reducedMotion: boolean;
  lowPower: boolean;
  sceneReady: boolean;
};

let state: SceneState = {
  section: 0,
  workIndex: 0,
  serviceIndex: 0,
  processIndex: 0,
  hoverProject: null,
  hoverService: null,
  openProject: null,
  reducedMotion: false,
  lowPower: false,
  sceneReady: false,
};

const listeners = new Set<() => void>();

export const sceneStore = {
  get: () => state,
  set(partial: Partial<SceneState>) {
    let changed = false;
    for (const key in partial) {
      const k = key as keyof SceneState;
      if (state[k] !== partial[k]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    state = { ...state, ...partial };
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useSceneState<T>(selector: (s: SceneState) => T): T {
  return useSyncExternalStore(
    sceneStore.subscribe,
    () => selector(sceneStore.get()),
    () => selector(sceneStore.get()),
  );
}
