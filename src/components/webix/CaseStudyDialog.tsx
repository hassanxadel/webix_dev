import type { CSSProperties } from "react";
import { ArrowUpRight, Instagram } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PROJECTS } from "@/lib/webix-data";
import { sceneStore, useSceneState } from "@/lib/scene-store";

/** Full case study, opened from the Work panel or by clicking a lightbox in the scene. */
export function CaseStudyDialog() {
  const open = useSceneState((s) => s.openProject);
  const p = open === null ? null : PROJECTS[open];

  return (
    <Dialog open={p !== null} onOpenChange={(o) => !o && sceneStore.set({ openProject: null })}>
      {p && (
        <DialogContent
          className="max-h-[92vh] max-w-3xl overflow-y-auto border-white/10 bg-[#080b16]/95 p-0 text-white backdrop-blur-xl sm:rounded-2xl"
          style={{ "--panel-accent": p.accent } as CSSProperties}
        >
          <div className="relative">
            <img src={p.image} alt={`Homepage of the ${p.name} website`} width={1280} height={800} className="aspect-[16/9] w-full object-cover object-top" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080b16] via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-px" style={{ background: p.accent, boxShadow: `0 0 18px ${p.accent}` }} />
          </div>

          <div className="p-6 sm:p-9">
            <p className="eyebrow" style={{ "--eyebrow-color": p.accent } as CSSProperties}>
              Case study · {p.industry}
            </p>
            <DialogTitle className="mt-3 font-display text-3xl font-bold sm:text-4xl">{p.name}</DialogTitle>
            <DialogDescription className="mt-2 text-base text-mist">
              {p.type} — {p.platform}
            </DialogDescription>

            <div className="mt-7 grid gap-8 sm:grid-cols-[1.3fr_1fr]">
              <div>
                <h3 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-mist/70">Objective</h3>
                <p className="mt-2 leading-relaxed text-white/90">{p.objective}</p>

                <h3 className="mt-7 font-display text-sm font-semibold uppercase tracking-[0.18em] text-mist/70">Design decisions</h3>
                <ul className="mt-3 space-y-2.5">
                  {p.decisions.map((d) => (
                    <li key={d} className="flex gap-3 text-[0.95rem] leading-relaxed text-white/85">
                      <span className="mt-2.5 h-1 w-3 shrink-0 rounded-full" style={{ background: p.accent }} aria-hidden />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-7">
                <div>
                  <h3 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-mist/70">Services</h3>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {p.services.map((s) => (
                      <li key={s} className="rounded-full border border-white/12 bg-white/[0.04] px-3 py-1 text-sm text-white/90">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-display text-sm font-semibold uppercase tracking-[0.18em] text-mist/70">Features</h3>
                  <ul className="mt-3 space-y-1.5 text-sm text-white/85">
                    {p.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-9 flex flex-wrap gap-3 border-t border-white/10 pt-6">
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="btn-primary">
                Visit the live site <ArrowUpRight size={18} aria-hidden />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
              {p.instagram && (
                <a href={p.instagram} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                  <Instagram size={18} aria-hidden /> Instagram
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              )}
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
