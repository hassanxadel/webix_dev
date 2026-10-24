import { useEffect, useState } from "react";
import { useJourney } from "@/lib/journey";

/** Fixed full-screen backdrop that will hold the 3D journey; painted fallback without WebGL. */
export function SceneLayer() {
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const ready = useJourney((s) => s.sceneReady);

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      setWebgl(!!(c.getContext("webgl2") || c.getContext("webgl")));
    } catch {
      setWebgl(false);
    }
    // Phase 1: no 3D yet — the HTML layer is the whole page.
    document.documentElement.dataset.scene = "ready";
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden data-webgl={webgl === null ? "pending" : webgl ? "on" : "off"}>
      <div className={`scene-fallback absolute inset-0 transition-opacity duration-1000 ${ready ? "opacity-0" : "opacity-100"}`} />
    </div>
  );
}
