import { ArrowUpRight, Instagram } from "lucide-react";
import { Button } from "@/components/site/Button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PROJECTS } from "@/lib/webix-data";
import { journeyStore, useJourney } from "@/lib/journey";

/** Full case study, opened from the Work copy, the hero strip or a billboard in the scene. */
export function CaseStudyDialog() {
  const open = useJourney((s) => s.openProject);
  const p = open === null ? null : PROJECTS[open];

  return (
    <Dialog open={p !== null} onOpenChange={(o) => !o && journeyStore.set({ openProject: null })}>
      {p && (
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto rounded-[2px] border-paper/10 bg-night/95 p-0 text-paper backdrop-blur-xl">
          <div className="relative">
            <img src={p.image} alt={`Homepage of the ${p.name} website`} width={1280} height={800} className="aspect-[16/9] w-full object-cover object-top" />
            <div className="absolute inset-0 bg-gradient-to-t from-night via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-sun" />
          </div>

          <div className="p-6 sm:p-9">
            <p className="hud text-sun">Case study · {p.industry}</p>
            <DialogTitle className="mt-3 font-heading text-3xl font-bold tracking-[-0.02em] sm:text-4xl">{p.name}</DialogTitle>
            <DialogDescription className="mt-2 text-base text-paper/60">
              {p.type} — {p.platform}
            </DialogDescription>

            <div className="mt-7 grid gap-8 sm:grid-cols-[1.3fr_1fr]">
              <div>
                <h3 className="hud text-paper/55">Objective</h3>
                <p className="mt-2 leading-relaxed text-paper/90">{p.objective}</p>
                <h3 className="hud mt-7 text-paper/55">Design decisions</h3>
                <ul className="mt-3 space-y-2.5">
                  {p.decisions.map((d) => (
                    <li key={d} className="flex gap-3 text-[0.95rem] leading-relaxed text-paper/85">
                      <span className="mt-2.5 h-px w-3 shrink-0 bg-sun" aria-hidden />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-7">
                <div>
                  <h3 className="hud text-paper/55">Services</h3>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {p.services.map((s) => (
                      <li key={s} className="border border-paper/15 px-3 py-1 text-sm text-paper/90">
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="hud text-paper/55">Features</h3>
                  <ul className="mt-3 space-y-1.5 text-sm text-paper/85">
                    {p.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-9 flex flex-wrap gap-3 border-t border-paper/10 pt-6">
              <Button asChild>
                <a href={p.url} target="_blank" rel="noopener noreferrer">
                  Visit the live site <ArrowUpRight size={16} aria-hidden />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </Button>
              {p.instagram && (
                <Button asChild variant="ghost">
                  <a href={p.instagram} target="_blank" rel="noopener noreferrer">
                    <Instagram size={16} aria-hidden /> Instagram
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
