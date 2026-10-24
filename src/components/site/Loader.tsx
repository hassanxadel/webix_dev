import { useEffect, useState } from "react";
import { STATIONS } from "@/config/stations";
import { useJourney } from "@/lib/journey";

/** Longest we hold the boarding screen; the HTML underneath is always usable. */
const MAX_WAIT_MS = 4500;

/**
 * "Boarding…" screen: a thin yellow progress line runs along the Webix Line
 * while the 3D world loads. It lifts as soon as the scene is ready, or after
 * a few seconds regardless, so the hero never waits on WebGL.
 */
export function Loader() {
  const ready = useJourney((s) => s.sceneReady);
  const loaded = useJourney((s) => s.loadProgress);
  const [timedOut, setTimedOut] = useState(false);
  const [gone, setGone] = useState(false);
  const done = ready || timedOut;

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), MAX_WAIT_MS);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setGone(true), 900);
    return () => clearTimeout(t);
  }, [done]);

  if (gone) return null;
  const pct = Math.round((done ? 1 : loaded) * 100);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Boarding, ${pct} percent loaded`}
      className={`fixed inset-0 z-[70] flex items-center justify-center bg-night transition-opacity duration-700 ${done ? "pointer-events-none opacity-0" : "opacity-100"}`}
    >
      <div className="w-[min(34rem,80vw)]">
        <p className="hud flex items-center justify-between text-paper/70">
          <span>Boarding…</span>
          <span className="tabular-nums text-sun">{String(pct).padStart(3, "0")}%</span>
        </p>
        <div className="relative mt-5 h-3">
          <span className="absolute left-0 top-[5px] h-px w-full bg-paper/15" />
          <span className="absolute left-0 top-[5px] h-px bg-sun transition-[width] duration-300" style={{ width: `${pct}%` }} />
          {STATIONS.map((s, i) => (
            <span
              key={s.id}
              className={`absolute top-0.5 h-2 w-2 -translate-x-1/2 rounded-full border ${pct / 100 >= i / (STATIONS.length - 1) ? "border-sun bg-sun" : "border-paper/40 bg-night"}`}
              style={{ left: `${(i / (STATIONS.length - 1)) * 100}%` }}
            />
          ))}
        </div>
        <p className="hud mt-4 flex justify-between text-paper/40">
          <span lang="ja" className="font-jp normal-case tracking-[0.1em]">
            ウェビックス線
          </span>
          <span>Webix Line</span>
        </p>
      </div>
    </div>
  );
}
