import { lazy, Suspense, useEffect, useState } from "react";
import { useSceneState } from "@/lib/scene-store";

// Three.js and the scene load as a separate chunk, after the headline is on screen.
const WebixScene = lazy(() => import("./three/WebixScene"));

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Fixed full-screen 3D backdrop, with a painted fallback when WebGL is unavailable. */
export function SceneLayer() {
  const [mode, setMode] = useState<"pending" | "webgl" | "fallback">("pending");
  const ready = useSceneState((s) => s.sceneReady);

  useEffect(() => {
    const ok = hasWebGL();
    setMode(ok ? "webgl" : "fallback");
    if (!ok) document.documentElement.classList.add("no-webgl");
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      <div className="scene-fallback absolute inset-0" />
      {mode === "webgl" && (
        <div
          className="pointer-events-auto absolute inset-0 transition-opacity duration-[1600ms] ease-out"
          style={{ opacity: ready ? 1 : 0 }}
        >
          <Suspense fallback={null}>
            <WebixScene />
          </Suspense>
        </div>
      )}
    </div>
  );
}
