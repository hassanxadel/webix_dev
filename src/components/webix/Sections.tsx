import { useRef, type CSSProperties, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, Check, Instagram } from "lucide-react";
import { PROCESS, PROJECTS, SERVICES } from "@/lib/webix-data";
import { sceneStore, useSceneState, type SectionId } from "@/lib/scene-store";
import { scrollToStage } from "@/lib/scroll-stage";
import { useIntro, useReveal } from "@/lib/reveal";

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * A section that pins its content while the visitor scrolls through `steps`
 * sub-states; the scroll tracker maps progress to the active step and the
 * camera travels with it.
 */
function Pinned({ id, steps, perStepVh = 45, label, children }: { id: SectionId; steps: number; perStepVh?: number; label: string; children: ReactNode }) {
  return (
    <section
      id={id}
      data-pinned="true"
      tabIndex={-1}
      aria-label={label}
      className="relative outline-none"
      style={{ height: `calc(100vh + ${steps * perStepVh}vh)` }}
    >
      <div className="sticky top-0 flex h-screen w-full overflow-hidden">{children}</div>
    </section>
  );
}

function Counter({ value, total, color }: { value: number; total: number; color: string }) {
  return (
    <span className="font-display text-xs font-semibold tabular-nums tracking-[0.2em] text-mist/70">
      <span style={{ color }}>{pad2(value + 1)}</span> / {pad2(total)}
    </span>
  );
}

/* ───────────────────────────── Hero ───────────────────────────── */

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  useIntro(ref);
  return (
    <section ref={ref} id="home" tabIndex={-1} aria-label="Introduction" className="relative min-h-[115vh] outline-none">
      <div className="scrim-left pointer-events-none absolute inset-0" />
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-4 pb-24 pt-32 sm:px-6 lg:px-8">
        <p className="eyebrow" data-intro="fade">
          Software &amp; digital solutions agency
        </p>
        <h1 className="mt-6 max-w-4xl text-[2.9rem] font-bold leading-[1.02] text-white sm:text-6xl lg:text-7xl xl:text-[5.5rem]">
          <span className="block" data-intro="line">
            Your ideas.
          </span>
          <span className="neon-text-sun block" data-intro="line">
            Our digital playground.
          </span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-mist sm:text-xl" data-intro="fade">
          We design and build modern websites, e-commerce stores, and digital experiences for ambitious brands.
        </p>
        <div className="mt-9 flex flex-wrap gap-3" data-intro="fade">
          <a
            href="#work"
            className="btn-primary"
            onClick={(e) => {
              e.preventDefault();
              scrollToStage("work");
            }}
          >
            Explore Our Work <ArrowRight size={18} aria-hidden />
          </a>
          <a
            href="#contact"
            className="btn-ghost"
            onClick={(e) => {
              e.preventDefault();
              scrollToStage("contact");
            }}
          >
            Start a Project
          </a>
        </div>
        <ul className="mt-12 flex max-w-2xl flex-wrap gap-x-6 gap-y-2 text-sm text-mist/70" data-intro="fade" aria-label="What we do">
          {["E-commerce & Shopify", "Custom web development", "UI/UX design", "Brand identity"].map((s) => (
            <li key={s} className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-neon shadow-[0_0_8px_#ff007f]" aria-hidden />
              {s}
            </li>
          ))}
        </ul>
      </div>
      <div className="pointer-events-none absolute bottom-10 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 text-mist/60 sm:flex" aria-hidden>
        <span className="font-jp text-xs tracking-[0.4em]">乗車</span>
        <span className="font-display text-[0.65rem] uppercase tracking-[0.35em]">Scroll to board</span>
        <span className="h-10 w-px bg-gradient-to-b from-sun to-transparent" />
      </div>
    </section>
  );
}

/* ───────────────────────────── Work ───────────────────────────── */

export function Work() {
  const index = useSceneState((s) => s.workIndex);
  const hover = useSceneState((s) => s.hoverProject);
  const shown = hover ?? index;
  const p = PROJECTS[shown];

  return (
    <Pinned id="work" steps={PROJECTS.length} label="Featured projects">
      <div className="mx-auto flex h-full w-full max-w-7xl items-end px-4 pb-5 pt-20 sm:px-6 lg:items-center lg:justify-end lg:px-8 lg:pb-0">
        <div className="panel w-full max-w-md p-5 sm:p-7" style={{ "--panel-accent": p.accent } as CSSProperties}>
          <div className="flex items-center justify-between">
            <p className="eyebrow" style={{ "--eyebrow-color": p.accent } as CSSProperties}>
              Selected work
            </p>
            <Counter value={shown} total={PROJECTS.length} color={p.accent} />
          </div>

          <div key={p.slug} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <img
              src={p.image}
              alt={`Screenshot of the ${p.name} website`}
              loading="lazy"
              width={1280}
              height={800}
              className="webgl-thumb mt-5 block aspect-[16/10] w-full rounded-lg border border-white/10 object-cover object-top lg:hidden"
            />
            <h2 className="mt-5 text-3xl font-bold text-white sm:text-4xl">{p.name}</h2>
            <p className="mt-2 font-display text-sm font-medium text-mist/80">
              {p.type} <span className="text-white/25">·</span> {p.platform}
            </p>
            <p className="mt-4 hidden leading-relaxed text-mist sm:block">{p.summary}</p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <button type="button" className="btn-primary !px-5 !py-2.5 !text-sm" onClick={() => sceneStore.set({ openProject: shown })}>
                View case study
              </button>
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="btn-ghost !px-5 !py-2.5 !text-sm">
                Live site <ArrowUpRight size={16} aria-hidden />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
              {p.instagram && (
                <a href={p.instagram} target="_blank" rel="noopener noreferrer" className="btn-ghost !px-3 !py-2.5" aria-label={`${p.name} on Instagram (opens in a new tab)`}>
                  <Instagram size={16} aria-hidden />
                </a>
              )}
            </div>
          </div>

          <ol className="mt-7 hidden grid-cols-2 gap-x-4 gap-y-1 border-t border-white/10 pt-5 sm:grid" aria-label="All projects">
            {PROJECTS.map((proj, i) => (
              <li key={proj.slug}>
                <button
                  type="button"
                  aria-current={i === shown ? "true" : undefined}
                  onClick={() => scrollToStage("work", i)}
                  onMouseEnter={() => sceneStore.set({ hoverProject: i })}
                  onMouseLeave={() => sceneStore.set({ hoverProject: null })}
                  onFocus={() => sceneStore.set({ hoverProject: i })}
                  onBlur={() => sceneStore.set({ hoverProject: null })}
                  className={`flex w-full items-center gap-2 rounded-md py-1.5 text-left text-sm transition-colors ${
                    i === shown ? "text-white" : "text-mist/55 hover:text-white"
                  }`}
                >
                  <span className="font-display text-[0.65rem] tabular-nums" style={{ color: i === shown ? proj.accent : undefined }}>
                    {pad2(i + 1)}
                  </span>
                  {proj.name}
                </button>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex gap-1.5 sm:hidden" aria-hidden>
            {PROJECTS.map((proj, i) => (
              <span key={proj.slug} className="h-1 flex-1 rounded-full transition-colors" style={{ background: i === shown ? proj.accent : "rgb(255 255 255 / 0.12)" }} />
            ))}
          </div>
        </div>
      </div>
    </Pinned>
  );
}

/* ───────────────────────────── Services ───────────────────────────── */

export function Services() {
  const index = useSceneState((s) => s.serviceIndex);
  const hover = useSceneState((s) => s.hoverService);
  const shown = hover ?? index;
  const svc = SERVICES[shown];

  return (
    <Pinned id="services" steps={SERVICES.length} label="Services">
      <div className="mx-auto flex h-full w-full max-w-7xl items-end px-4 pb-5 pt-20 sm:px-6 lg:items-center lg:justify-end lg:px-8 lg:pb-0">
        <div className="panel w-full max-w-md p-5 sm:p-7" style={{ "--panel-accent": svc.color } as CSSProperties}>
          <div className="flex items-center justify-between">
            <p className="eyebrow" style={{ "--eyebrow-color": svc.color } as CSSProperties}>
              Services
            </p>
            <Counter value={shown} total={SERVICES.length} color={svc.color} />
          </div>
          <h2 className="mt-4 text-2xl font-bold text-white sm:text-3xl">What we build for you</h2>

          <div role="tablist" aria-label="Services" className="mt-5 grid grid-cols-2 gap-2">
            {SERVICES.map((s, i) => (
              <button
                key={s.name}
                role="tab"
                type="button"
                aria-selected={i === shown}
                aria-controls="service-detail"
                onClick={() => scrollToStage("services", i)}
                onMouseEnter={() => sceneStore.set({ hoverService: i })}
                onMouseLeave={() => sceneStore.set({ hoverService: null })}
                className={`rounded-xl border px-3 py-2.5 text-left font-display text-[0.8rem] font-medium transition-all ${
                  i === shown ? "border-white/25 bg-white/[0.07] text-white" : "border-white/8 text-mist/60 hover:border-white/20 hover:text-white"
                }`}
                style={i === shown ? { boxShadow: `inset 3px 0 0 ${s.color}` } : undefined}
              >
                {s.short}
              </button>
            ))}
          </div>

          <div id="service-detail" role="tabpanel" key={svc.name} className="animate-in fade-in slide-in-from-bottom-2 mt-5 duration-500">
            <h3 className="text-lg font-semibold text-white">{svc.name}</h3>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-mist">{svc.description}</p>
            <ul className="mt-4 hidden space-y-2 sm:block">
              {svc.items.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-white/85">
                  <Check size={16} className="mt-0.5 shrink-0" style={{ color: svc.color }} aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Pinned>
  );
}

/* ───────────────────────────── About ───────────────────────────── */

const PILLARS = [
  { title: "Design", text: "Interfaces and brand presentation that feel considered, clear and recognisably yours.", color: "#FF007F" },
  { title: "Technology", text: "Modern, fast and maintainable builds — from Shopify stores to real-time 3D.", color: "#FFDA24" },
  { title: "Business sense", text: "Every decision tied back to what the website needs to do for your business.", color: "#4D8BFF" },
];

export function About() {
  const ref = useRef<HTMLElement>(null);
  useReveal(ref);
  return (
    <section ref={ref} id="about" tabIndex={-1} aria-label="About Webix" className="relative min-h-[150vh] outline-none">
      <div className="sticky top-0 flex min-h-screen items-end lg:items-center">
        <div className="mx-auto w-full max-w-7xl px-4 pb-6 pt-24 sm:px-6 lg:px-8">
          <div className="panel max-w-xl p-6 sm:p-9" style={{ "--panel-accent": "#FF007F" } as CSSProperties}>
            <p className="eyebrow" style={{ "--eyebrow-color": "#FF007F" } as CSSProperties} data-reveal>
              About Webix
            </p>
            <h2 className="mt-5 text-3xl font-bold leading-tight text-white sm:text-[2.6rem]" data-reveal>
              A creative software agency that thinks like your <span className="neon-text-pink">business</span>.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-mist" data-reveal>
              We combine thoughtful design and modern web technology to help businesses present their brands, reach customers, and grow online.
            </p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-3">
              {PILLARS.map((p) => (
                <li key={p.title} data-reveal className="border-t pt-4" style={{ borderColor: p.color }}>
                  <h3 className="text-base font-semibold text-white">{p.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-mist/80">{p.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────────── Process ───────────────────────────── */

const STEP_COLORS = ["#FFDA24", "#FF007F", "#E81A2E", "#4D8BFF"];

export function Process() {
  const index = useSceneState((s) => s.processIndex);
  return (
    <Pinned id="process" steps={PROCESS.length} perStepVh={40} label="Our process">
      <div className="mx-auto flex h-full w-full max-w-7xl flex-col justify-end px-4 pb-6 pt-20 sm:px-6 lg:px-8 lg:pb-10">
        <div className="panel p-5 sm:p-7" style={{ "--panel-accent": STEP_COLORS[index] } as CSSProperties}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow" style={{ "--eyebrow-color": STEP_COLORS[index] } as CSSProperties}>
                Our process
              </p>
              <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">From first call to launch day.</h2>
            </div>
            <Counter value={index} total={PROCESS.length} color={STEP_COLORS[index]} />
          </div>

          {/* Progress rail, filled up to the current step. */}
          <div className="relative mt-6 h-px bg-white/10" aria-hidden>
            <div
              className="absolute inset-y-0 left-0 transition-[width] duration-700 ease-out"
              style={{ width: `${((index + 1) / PROCESS.length) * 100}%`, background: STEP_COLORS[index], boxShadow: `0 0 12px ${STEP_COLORS[index]}` }}
            />
          </div>

          <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS.map((step, i) => {
              const state = i < index ? "done" : i === index ? "current" : "next";
              return (
                <li key={step.name} aria-current={state === "current" ? "step" : undefined} className={i === index ? "" : "hidden sm:block"}>
                  <button
                    type="button"
                    onClick={() => scrollToStage("process", i)}
                    className={`h-full w-full rounded-xl border p-4 text-left transition-all duration-500 ${
                      state === "current" ? "border-white/20 bg-white/[0.06]" : "border-transparent opacity-55 hover:opacity-90"
                    }`}
                  >
                    <span className="flex items-baseline gap-2.5">
                      <span className="font-display text-xs font-semibold tabular-nums" style={{ color: STEP_COLORS[i] }}>
                        {pad2(i + 1)}
                      </span>
                      <span className="font-display text-lg font-semibold text-white">{step.name}</span>
                      <span className="font-jp text-xs text-mist/50" lang="ja">
                        {step.jp}
                      </span>
                    </span>
                    <span className="mt-2 block text-sm leading-relaxed text-mist/85">{step.text}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </Pinned>
  );
}
