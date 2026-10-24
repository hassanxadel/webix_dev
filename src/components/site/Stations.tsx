import type { ReactNode } from "react";
import { ArrowRight, ArrowUpRight, Instagram, Mail, MessageCircle, MousePointer2 } from "lucide-react";
import { JOURNEY_VH, STATIONS, type StationId } from "@/config/stations";
import { PROCESS, PROJECTS, SERVICES } from "@/lib/webix-data";
import { SITE_CONFIG, whatsappLink } from "@/lib/site-config";
import { journeyStore, travelTo, travelToStation, useJourney } from "@/lib/journey";
import { ContactForm } from "./ContactForm";

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * One station on the page. Its height matches its share of the journey, so
 * the DOM scroll position and the 3D timeline line up exactly. Copy sits in a
 * sticky layer and fades in only during the station's content window.
 */
function Station({ id, children, layout = "left" }: { id: StationId; children: ReactNode; layout?: "left" | "bottom" | "split" }) {
  const index = STATIONS.findIndex((s) => s.id === id);
  const s = STATIONS[index];
  const showing = useJourney((st) => st.showing);
  const last = index === STATIONS.length - 1;
  const height = `${(s.range[1] - s.range[0]) * JOURNEY_VH + (last ? 100 : 0)}vh`;

  return (
    <section
      id={s.id}
      tabIndex={-1}
      aria-labelledby={`${s.id}-title`}
      className="relative outline-none"
      style={{ height }}
      // Keyboard users tabbing into a station travel there, so focus is never on hidden copy.
      onFocusCapture={() => {
        if (journeyStore.get().showing !== index) travelTo(s.anchor);
      }}
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        <div
          className={`station-copy relative mx-auto flex h-full max-w-[1440px] px-5 pb-16 pt-24 sm:px-8 md:pb-10 md:pr-24 lg:pl-12 lg:pr-32 ${
            layout === "bottom" ? "items-end justify-center" : layout === "split" ? "items-center" : "items-end lg:items-center"
          }`}
          data-on={showing === index}
        >
          {children}
        </div>
      </div>
    </section>
  );
}

function Kicker({ id }: { id: StationId }) {
  const s = STATIONS.find((x) => x.id === id)!;
  return (
    <p className="hud flex items-center gap-3 text-paper/70">
      <span className="text-sun">{s.num}</span>
      <span className="h-px w-6 bg-paper/30" aria-hidden />
      {s.en}
      <span lang="ja" className="font-jp normal-case tracking-[0.08em] text-paper/45">
        {s.jp}
      </span>
    </p>
  );
}

/* ───────── 01 Departure ───────── */

function Departure() {
  return (
    <Station id="departure">
      <div className="scrim-left pointer-events-none absolute inset-0 -z-10 hidden lg:block" />
      <div className="scrim-bottom pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-2/3 lg:hidden" />
      <div className="max-w-[34rem] lg:-mt-16">
        <p className="hud text-paper/70">Webix Software Solutions</p>
        <h1 id="departure-title" className="mt-5 text-[2.75rem] text-paper sm:text-6xl xl:text-[4.6rem]">
          Your ideas.
          <span className="block text-sun">Our digital playground.</span>
        </h1>
        <p className="mt-6 max-w-md text-base leading-relaxed text-paper/70 sm:text-lg">
          We design and build modern websites, e-commerce stores and digital experiences for ambitious brands.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="#work"
            className="btn-primary"
            onClick={(e) => {
              e.preventDefault();
              travelToStation("work");
            }}
          >
            Explore our work <ArrowRight size={16} aria-hidden />
          </a>
          <a
            href="#terminal"
            className="btn-secondary"
            onClick={(e) => {
              e.preventDefault();
              travelToStation("terminal");
            }}
          >
            Start a project
          </a>
        </div>
        <p className="hud mt-12 hidden items-center gap-3 text-paper/70 sm:flex">
          <MousePointer2 size={14} className="rotate-180" aria-hidden />
          Scroll to board
          <span className="relative ml-1 h-8 w-px overflow-hidden bg-paper/15" aria-hidden>
            <span className="absolute inset-x-0 top-0 h-1/2 animate-[scroll-hint_2.2s_ease-in-out_infinite] bg-sun" />
          </span>
        </p>
      </div>

      {/* Featured projects strip, as in the hero mockup. */}
      <div className="absolute bottom-10 right-24 hidden w-[44rem] xl:block">
        <p className="hud mb-3 text-paper/55">Featured projects</p>
        <ul className="grid grid-cols-3 gap-3">
          {PROJECTS.slice(0, 3).map((p, i) => (
            <li key={p.slug}>
              <button
                type="button"
                onClick={() => journeyStore.set({ openProject: i })}
                className="group relative block w-full overflow-hidden border border-paper/10 text-left transition-colors hover:border-sun/60"
              >
                <img src={p.image} alt="" width={1280} height={800} loading="lazy" className="aspect-[16/9] w-full object-cover object-top opacity-60 transition-opacity group-hover:opacity-90" />
                <span className="absolute inset-0 bg-gradient-to-t from-night via-night/30 to-transparent" />
                <span className="absolute bottom-2.5 left-3">
                  <span className="block text-sm font-semibold text-paper">{p.name}</span>
                  <span className="hud text-[0.58rem] text-paper/55">{p.platform.includes("Shopify") ? "E-commerce / Shopify" : "Website"}</span>
                </span>
                <span className="hud absolute left-3 top-2.5 text-[0.58rem] text-paper/60">{pad2(i + 1)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Station>
  );
}

/* ───────── 02 Vision ───────── */

function Vision() {
  return (
    <Station id="vision">
      <div className="max-w-3xl lg:-mt-24">
        <Kicker id="vision" />
        <h2 id="vision-title" className="mt-6 text-[2rem] leading-[1.1] text-paper sm:text-5xl xl:text-[3.6rem]">
          We design and build modern websites, e-commerce stores and <span className="text-sun">3D digital experiences for ambitious brands.</span>
        </h2>
        <p className="mt-7 max-w-lg leading-relaxed text-paper/65">
          We combine thoughtful design and modern web technology to help businesses present their brands, reach customers, and grow online.
        </p>
      </div>
    </Station>
  );
}

/* ───────── 03 Services ───────── */

function Services() {
  const step = useJourney((s) => s.serviceStep);
  return (
    <Station id="services">
      <div className="glass w-full max-w-md p-6 sm:p-8">
        <Kicker id="services" />
        <h2 id="services-title" className="mt-5 text-3xl text-paper sm:text-4xl">
          What we build.
        </h2>
        <ol className="mt-6 space-y-1">
          {SERVICES.map((svc, i) => (
            <li key={svc.name} className={`border-l-2 py-3 pl-4 transition-colors duration-500 ${i <= step ? "border-sun" : "border-paper/10"}`}>
              <p className="flex items-baseline gap-3">
                <span className={`hud ${i <= step ? "text-sun" : "text-paper/40"}`}>{pad2(i + 1)}</span>
                <span className={`font-heading text-lg font-semibold transition-colors ${i === step ? "text-paper" : "text-paper/60"}`}>{svc.name}</span>
              </p>
              <p className={`mt-1 text-sm leading-relaxed transition-colors ${i === step ? "text-paper/75" : "text-paper/40"}`}>{svc.line}</p>
            </li>
          ))}
        </ol>
      </div>
    </Station>
  );
}

/* ───────── 04 Work ───────── */

function Work() {
  const step = useJourney((s) => s.workStep);
  const hover = useJourney((s) => s.hoverProject);
  const shown = hover ?? step;
  const p = PROJECTS[shown];
  return (
    <Station id="work">
      <div className="glass w-full max-w-md p-6 sm:p-8">
        <Kicker id="work" />
        <h2 id="work-title" className="mt-5 text-3xl text-paper sm:text-4xl">
          Real brands.
          <span className="block text-sun">Real work.</span>
        </h2>
        <img src={p.image} alt={`Screenshot of the ${p.name} website`} width={1280} height={800} loading="lazy" className="mt-5 aspect-[16/9] w-full border border-paper/10 object-cover object-top md:hidden" />
        <ol className="mt-6 divide-y divide-paper/5">
          {PROJECTS.map((proj, i) => (
            <li key={proj.slug}>
              <button
                type="button"
                aria-current={i === shown ? "true" : undefined}
                onClick={() => journeyStore.set({ openProject: i })}
                onMouseEnter={() => journeyStore.set({ hoverProject: i })}
                onMouseLeave={() => journeyStore.set({ hoverProject: null })}
                onFocus={() => journeyStore.set({ hoverProject: i })}
                onBlur={() => journeyStore.set({ hoverProject: null })}
                className="flex w-full items-center gap-4 py-2.5 text-left"
              >
                <span className={`hud ${i === shown ? "text-sun" : "text-paper/35"}`}>{pad2(i + 1)}</span>
                <span className={`flex-1 font-medium transition-colors ${i === shown ? "text-paper" : "text-paper/55"}`}>{proj.name}</span>
                <span className="hud hidden text-[0.58rem] text-paper/40 sm:inline">{proj.platform.includes("Shopify") ? "Shopify" : "Custom"}</span>
              </button>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-wrap gap-2.5">
          <button type="button" className="btn-primary !px-5 !py-3" onClick={() => journeyStore.set({ openProject: shown })}>
            Case study <ArrowRight size={15} aria-hidden />
          </button>
          <a href={p.url} target="_blank" rel="noopener noreferrer" className="btn-secondary !px-5 !py-3">
            Live site <ArrowUpRight size={15} aria-hidden />
            <span className="sr-only">(opens {p.name} in a new tab)</span>
          </a>
          {p.instagram && (
            <a href={p.instagram} target="_blank" rel="noopener noreferrer" className="btn-secondary !px-3 !py-3" aria-label={`${p.name} on Instagram (opens in a new tab)`}>
              <Instagram size={15} aria-hidden />
            </a>
          )}
        </div>
      </div>
    </Station>
  );
}

/* ───────── 05 Process ───────── */

function Process() {
  const step = Math.max(0, useJourney((s) => s.processStep));
  return (
    <Station id="process" layout="bottom">
      <div className="glass w-full max-w-3xl p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Kicker id="process" />
          <p className="hud text-paper/45">Express line · 4 stops</p>
        </div>
        <h2 id="process-title" className="sr-only">
          Our process
        </h2>
        <ol className="mt-5 grid gap-4 sm:grid-cols-4">
          {PROCESS.map((s, i) => (
            <li key={s.name} aria-current={i === step ? "step" : undefined} className={`border-t-2 pt-3 transition-all duration-500 ${i <= step ? "border-sun" : "border-paper/10"} ${i === step ? "" : "hidden opacity-50 sm:block"}`}>
              <p className="hud text-paper/50">
                <span className={i <= step ? "text-sun" : ""}>{pad2(i + 1)}</span>
                <span lang="ja" className="ml-2 font-jp normal-case tracking-[0.06em]">
                  {s.jp}
                </span>
              </p>
              <p className="mt-1.5 font-heading text-xl font-semibold text-paper">{s.name}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-paper/60">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </Station>
  );
}

/* ───────── 06 Results ───────── */

/** Verifiable facts only — every figure is derived from the project list. */
const STATS = [
  { label: "Live projects", value: PROJECTS.length },
  { label: "Shopify stores", value: PROJECTS.filter((p) => p.platform.includes("Shopify")).length },
  { label: "Custom builds", value: PROJECTS.filter((p) => !p.platform.includes("Shopify")).length },
  { label: "Industries", value: new Set(PROJECTS.map((p) => p.industry.split(" ")[0])).size },
];
export const RESULT_STATS = STATS;

function Results() {
  return (
    <Station id="results">
      <div className="max-w-md lg:-mt-10">
        <Kicker id="results" />
        <h2 id="results-title" className="mt-5 text-4xl text-paper sm:text-5xl">
          Real brands.
          <span className="block text-sun">Real results.</span>
        </h2>
        <dl className="mt-7 grid grid-cols-2 gap-px bg-paper/10">
          {STATS.map((s) => (
            <div key={s.label} className="bg-night/85 p-4">
              <dt className="hud text-paper/50">{s.label}</dt>
              <dd className="mt-1 font-mono text-3xl text-sun">{pad2(s.value)}</dd>
            </div>
          ))}
        </dl>
        {/* TODO: real testimonial — add client quotes here once approved; never invent them. Hidden in production until then. */}
        {import.meta.env.DEV && <p className="hud mt-4 border border-dashed border-signal/60 p-3 text-signal">Placeholder · testimonials pending (dev only)</p>}
      </div>
    </Station>
  );
}

/* ───────── 07 Terminal ───────── */

function Terminal() {
  return (
    <Station id="terminal" layout="split">
      <div className="grid w-full items-center gap-8 lg:grid-cols-[1fr_minmax(0,32rem)] lg:gap-16">
        <div className="max-w-md">
          <Kicker id="terminal" />
          <h2 id="terminal-title" className="mt-5 text-4xl text-paper sm:text-5xl">
            Your stop.
            <span className="block text-sun">Let&apos;s build it.</span>
          </h2>
          <p className="mt-5 leading-relaxed text-paper/65">If we can make a train station feel real in a browser, imagine what we can do for your store.</p>
          <ul className="mt-7 hidden space-y-2.5 text-sm sm:block">
            <li>
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 text-paper/80 hover:text-paper">
                <MessageCircle size={16} className="text-sun" aria-hidden /> WhatsApp <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
            <li>
              <a href={`mailto:${SITE_CONFIG.email}`} className="inline-flex items-center gap-3 text-paper/80 hover:text-paper">
                <Mail size={16} className="text-sun" aria-hidden /> {SITE_CONFIG.email}
              </a>
            </li>
            <li>
              <a href={SITE_CONFIG.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 text-paper/80 hover:text-paper">
                <Instagram size={16} className="text-sun" aria-hidden /> {SITE_CONFIG.instagramHandle} <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          </ul>
        </div>
        <div className="glass max-h-[calc(100vh-8rem)] overflow-y-auto p-5 sm:p-7">
          <ContactForm />
        </div>
      </div>
    </Station>
  );
}

export function Stations() {
  return (
    <>
      <Departure />
      <Vision />
      <Services />
      <Work />
      <Process />
      <Results />
      <Terminal />
    </>
  );
}
