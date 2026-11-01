import { useEffect, useState } from "react";
import { useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";

let ktx2: KTX2Loader | null = null;
/** One KTX2 (Basis) loader for the one canvas; the transcoder is three r182's, served from /basis/. */
function ktx2Loader(gl: THREE.WebGLRenderer) {
  ktx2 ??= new KTX2Loader().setTranscoderPath("/basis/").detectSupport(gl);
  return ktx2;
}

/** "color" maps are sRGB; "data" maps (normal, specular, clouds, displacement) stay linear. */
export type TexKind = "color" | "data";

function prepare(t: THREE.Texture, kind: TexKind, anisotropy: number) {
  t.colorSpace = kind === "color" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = anisotropy;
  return t;
}

/**
 * Loads the small texture first (it suspends, so the first paint is quick),
 * then swaps in the large one in the background a moment later. Returns the
 * texture to use right now; it changes once, when the large one arrives.
 * A `.ktx2` large texture is GPU-compressed (Basis ETC1S, with mipmaps); it
 * can't be flipped on upload, so its image is stored flipped already.
 */
export function useProgressiveTexture(low: string, high: string | null, kind: TexKind = "color") {
  const gl = useThree((s) => s.gl);
  // Full anisotropic filtering: the Earth and Moon are seen at grazing angles.
  const aniso = gl.capabilities.getMaxAnisotropy();
  const base = prepare(useLoader(THREE.TextureLoader, low), kind, aniso);
  const [tex, setTex] = useState<THREE.Texture>(base);

  useEffect(() => {
    if (!high) return;
    let alive = true;
    let loaded: THREE.Texture | null = null;
    const id = window.setTimeout(() => {
      const loader = high.endsWith(".ktx2") ? ktx2Loader(gl) : new THREE.TextureLoader();
      loader
        .loadAsync(high)
        .then((t) => {
          loaded = prepare(t, kind, aniso);
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
  }, [high, kind, aniso, gl]);

  return tex;
}
