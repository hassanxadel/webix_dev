import { useEffect, useState } from "react";
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";

export type TexKind = "color" | "data";

function prepare(t: THREE.Texture, kind: TexKind) {
  t.colorSpace = kind === "color" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8; // clamped to the GPU's maximum by three
  return t;
}

/**
 * Loads the small texture first (it suspends, so the first paint is quick),
 * then swaps in the large one in the background a moment later. Returns the
 * texture to use right now; it changes once, when the large one arrives.
 */
export function useProgressiveTexture(low: string, high: string | null, kind: TexKind = "color") {
  const base = prepare(useLoader(THREE.TextureLoader, low), kind);
  const [tex, setTex] = useState<THREE.Texture>(base);

  useEffect(() => {
    if (!high) return;
    let alive = true;
    let loaded: THREE.Texture | null = null;
    const id = window.setTimeout(() => {
      new THREE.TextureLoader()
        .loadAsync(high)
        .then((t) => {
          loaded = prepare(t, kind);
          if (alive) setTex(loaded);
          else loaded.dispose();
        })
        .catch(() => {}); // the small texture stays: a missing upgrade is cosmetic
    }, 1500);
    return () => {
      alive = false;
      window.clearTimeout(id);
      loaded?.dispose();
    };
  }, [high, kind]);

  return tex;
}
