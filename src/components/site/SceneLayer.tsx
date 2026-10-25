import { lazy, Suspense, useEffect, useState } from "react";
import { useJourney } from "@/lib/journey";
import { HeroPlate } from "./HeroPlate";

// Three.js and the world load as a separate chunk, after the HTML hero is on screen.
const Experience = lazy(() => import("@/components/three/Experience"));

/** Fixed full-screen 3D backdrop, with a painted fallback when WebGL is unavailable. */
export function SceneLayer() {
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const ready = useJourney((s) => s.sceneReady);

  useEffect(() => {
    let ok = false;
    try {
      const c = document.createElement("canvas");
      ok = !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch {
      ok = false;
    }
    setWebgl(ok);
    // Without WebGL the HTML journey is the whole page; nothing to wait for.
    if (!ok) document.documentElement.dataset.scene = "ready";
  }, []);

  return (
    <div className="fixed inset-0 z-0" aria-hidden>
      <div className={`scene-fallback pointer-events-none absolute inset-0 transition-opacity duration-1000 ${ready ? "opacity-0" : "opacity-100"}`} />
      {/* The hero's photograph sits under the (transparent) canvas, so the 3D card floats in it. */}
      <HeroPlate />
      {webgl && (
        <div className={`absolute inset-0 transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}>
          <Suspense fallback={null}>
            <Experience />
          </Suspense>
        </div>
      )}
    </div>
  );
}
