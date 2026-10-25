import { STATIONS } from "@/config/stations";
import { useJourney } from "@/lib/journey";

/**
 * Japanese station name board (駅名標) in its real format: Japanese name on
 * top, English name large, the line-colour band with previous / next stations,
 * and the station number. Crisp HTML, so it stays legible at any size.
 */
export function StationSign() {
  const station = useJourney((s) => s.station);
  const showing = useJourney((s) => s.showing);
  const s = STATIONS[station];
  const prev = STATIONS[station - 1];
  const next = STATIONS[station + 1];

  return (
    <div
      aria-hidden
      className="station-copy pointer-events-none fixed right-20 top-24 z-30 hidden w-[19rem] md:block lg:right-28 lg:top-28"
      // Not on the hero (the card's moment) or the terminal (the form needs the space).
      data-on={showing === station && s.id !== "terminal" && s.id !== "departure"}
    >
      <div key={s.id} className="glass animate-in fade-in duration-700 overflow-hidden rounded-[2px]">
        <div className="flex items-start gap-4 px-5 pb-3 pt-4">
          <span className="mt-1 flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-[3px] border-2 border-sun font-mono text-[0.62rem] leading-none text-paper">
            <span className="text-sun">WX</span>
            <span className="mt-0.5 text-sm font-medium">{s.num}</span>
          </span>
          <div className="min-w-0">
            <p className="font-jp text-lg font-bold leading-tight text-paper" lang="ja">
              {s.jp}
            </p>
            <p className="mt-0.5 font-heading text-2xl font-semibold tracking-[-0.01em] text-paper">{s.en}</p>
          </div>
        </div>
        <div className="hud flex items-center justify-between bg-sun px-4 py-1.5 text-[0.6rem] text-indigo">
          <span>{prev ? `← ${prev.en}` : "Webix Line"}</span>
          <span>{next ? `${next.en} →` : "Terminus"}</span>
        </div>
        <div className="h-[3px] bg-neon/80" />
      </div>
    </div>
  );
}
