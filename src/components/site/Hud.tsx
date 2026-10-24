import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { STATIONS } from "@/config/stations";
import { journeyStore, useJourney } from "@/lib/journey";
import { beep, unlockAudio } from "@/lib/sound";

function Clock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const fmt = () => new Date().toLocaleTimeString("en-GB", { hour12: false });
    setNow(fmt());
    const id = setInterval(() => setNow(fmt()), 1000);
    return () => clearInterval(id);
  }, []);
  // Rendered only after mount so server and client markup match.
  return <span className="tabular-nums">{now ?? "--:--:--"}</span>;
}

export function SoundToggle() {
  const sound = useJourney((s) => s.sound);
  return (
    <button
      type="button"
      aria-pressed={sound}
      aria-label={sound ? "Turn sound off" : "Turn sound on"}
      onClick={() => {
        unlockAudio();
        journeyStore.set({ sound: !sound });
        if (!sound) setTimeout(beep, 30);
      }}
      className="hud inline-flex items-center gap-2 text-paper/60 transition-colors hover:text-paper"
    >
      {sound ? <Volume2 size={14} aria-hidden /> : <VolumeX size={14} aria-hidden />}
      Sound {sound ? "on" : "off"}
    </button>
  );
}

/** Igloo-style monospace HUD: current station, next stop, a running clock and the sound toggle. */
export function Hud() {
  const station = useJourney((s) => s.station);
  const s = STATIONS[station];
  const next = STATIONS[station + 1];
  return (
    <div className="pointer-events-none fixed bottom-8 left-8 z-40 hidden flex-col gap-2 md:flex lg:left-12">
      <p className="hud text-paper/80">
        <span className="text-sun">Station {s.num}</span> — {s.en}
      </p>
      <p className="hud text-paper/45">{next ? `Next: ${next.en}` : "End of the line"}</p>
      <p className="hud flex items-center gap-4 text-paper/45">
        <Clock />
        <span className="pointer-events-auto">
          <SoundToggle />
        </span>
      </p>
    </div>
  );
}
