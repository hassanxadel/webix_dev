import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ArrowRight, ArrowUpRight, Instagram, Mail, MessageCircle } from "lucide-react";
import { BLACKOUT, DEPARTURE, JOURNEY_VH, STATIONS, stationIndex, type StationId } from "@/config/stations";
import { WORK } from "@/config/projects";
import { PROCESS, RESULT_STATS, SERVICES } from "@/lib/webix-data";
import { SITE_CONFIG, whatsappLink } from "@/lib/site-config";
import { journey, journeyStore, travelTo, travelToStation, useJourney } from "@/lib/journey";
import { HERO, ramp, smooth } from "@/lib/heroPlate";
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
      <span className="text-sun">Station {s.num}</span>
      <span className="h-px w-6 bg-paper/30" aria-hidden />
      {s.en}
      <span lang="ja" className="font-jp normal-case tracking-[0.08em] text-paper/45">
        {s.jp}
      </span>
    </p>
  );
}

/* ───────── 01 Departure (hero) ───────── */

/**
 * Minimal hero: a two-line headline in the left third, one short sentence in
 * the right third, and a single action at the bottom centre — the card owns
 * the middle. Copy scrubs out with scroll (reversible) as the card turns.
 */
function Departure() {
  const left = useRef<HTMLDivElement>(null);
  const right = useRef<HTMLParagraphElement>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const s = STATIONS[0];

  useEffect(() => {
    let raf = 0;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const p = journey.progress;
      const reduced = journeyStore.get().reducedMotion;
      const k = smooth(ramp(p, [0, HERO.turn[1] * 0.75]));
      const slide = reduced ? 0 : k * 48;
      if (left.current) {
        left.current.style.opacity = String(1 - k);
        left.current.style.transform = `translate3d(${-slide}px, 0, 0)`;
      }
      if (right.current) {
        right.current.style.opacity = String(1 - k);
        right.current.style.transform = `translate3d(${slide}px, 0, 0)`;
      }
      if (bottom.current) bottom.current.style.opacity = String(1 - smooth(ramp(p, [0, HERO.turn[1] * 0.5])));
      const hidden = p > HERO.turn[1];
      [left, right, bottom].forEach((r) => r.current && (r.current.style.visibility = hidden ? "hidden" : "visible"));
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section id={s.id} tabIndex={-1} aria-labelledby="departure-title" className="relative outline-none" style={{ height: `${(s.range[1] - s.range[0]) * JOURNEY_VH}vh` }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="relative mx-auto h-full max-w-[1440px] px-5 sm:px-8 lg:px-12">
          {/* Left third (top band on phones). */}
          <div ref={left} className="absolute left-5 right-5 top-24 sm:left-8 lg:left-12 lg:right-auto lg:top-1/2 lg:w-[33%] lg:-translate-y-1/2">
            <h1 id="departure-title" className="whitespace-nowrap text-[2.6rem] leading-[1.04] text-paper sm:text-6xl lg:text-[2.6rem] xl:text-[2.85rem] 2xl:text-[3.4rem]">
              Your ideas.
              <span className="block text-sun">Our playground.</span>
            </h1>
          </div>

          {/* Right third (above the action on phones). */}
          <p ref={right} className="absolute bottom-[14rem] left-5 right-5 text-xl font-medium leading-snug text-paper [text-shadow:0_2px_18px_rgb(7_11_20/0.95)] sm:left-8 lg:bottom-auto lg:left-auto lg:right-12 lg:top-1/2 lg:w-[22%] lg:-translate-y-1/2 lg:text-right lg:text-2xl">
            We build digital journeys.
          </p>

          {/* Bottom centre: the one action, and the hint to scroll. */}
          <div ref={bottom} className="absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-5">
            <a
              href="#vision"
              className="btn-primary"
              onClick={(e) => {
                e.preventDefault();
                travelToStation("vision");
              }}
            >
              Get Started <ArrowRight size={16} aria-hidden />
            </a>
            <span className="hud flex flex-col items-center gap-3 text-paper/60" aria-hidden>
              Scroll to board
              <span className="relative h-8 w-px overflow-hidden bg-paper/15">
                <span className="absolute inset-x-0 top-0 h-1/2 animate-[scroll-hint_2.2s_ease-in-out_infinite] bg-sun" />
              </span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────── 03 About (vision) ───────── */

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
      </div>
    </Station>
  );
}

/* ───────── 04 Services ───────── */

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

/* ───────── 02 Work ───────── */

/** Project info under the current window: number, name, type, one line, tech tags, action. */
function WorkInfo({ i }: { i: number }) {
  const w = WORK[i];
  return (
    <div className="work-info-in">
      <p className="hud flex items-center gap-3 text-paper/55">
        <span className="font-mono text-sun">
          {pad2(i + 1)} / {pad2(WORK.length)}
        </span>
        <span className="h-px w-6 bg-paper/25" aria-hidden />
        <span className="font-mono">{w.type}</span>
      </p>
      <h3 className="mt-2 font-heading text-2xl font-bold text-paper sm:text-3xl">{w.name}</h3>
      <p className="mt-2 line-clamp-2 max-w-xl text-sm leading-relaxed text-paper/65 md:line-clamp-1">{w.description}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {w.tech.map((t) => (
          <span key={t} className="hud border border-paper/15 px-2 py-1 text-[0.6rem] text-paper/60">
            {t}
          </span>
        ))}
        <button type="button" className="btn-primary ml-auto !px-5 !py-2.5" onClick={() => journeyStore.set({ openProject: w.index })}>
          View project <ArrowRight size={15} aria-hidden />
        </button>
        <a href={w.url} target="_blank" rel="noopener noreferrer" className="btn-secondary !px-3 !py-2.5" aria-label={`${w.name} live site (opens in a new tab)`}>
          <ArrowUpRight size={15} aria-hidden />
        </a>
      </div>
    </div>
  );
}

/**
 * Work: the projects seen through the cabin windows (drawn by BackgroundLayer).
 * This section is the scroll spacer plus a fixed caption layer; title and info
 * scrub in during the arrival and out into the About blackout. Reduced motion
 * gets a plain vertical list instead.
 */
function Work() {
  const s = STATIONS[stationIndex("work")];
  const step = useJourney((st) => st.workStep);
  const reduced = useJourney((st) => st.reducedMotion);
  const head = useRef<HTMLDivElement>(null);
  const info = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced) return;
    const tick = () => {
      const p = journey.progress;
      const out = 1 - smooth(ramp(p, [BLACKOUT[0], (BLACKOUT[0] + BLACKOUT[1]) / 2]));
      const h = smooth(ramp(p, [DEPARTURE.arrive[0] + 0.01, DEPARTURE.arrive[1]])) * out;
      const k = smooth(ramp(p, DEPARTURE.settle)) * out;
      // Fast scrolling between windows: the caption smears a little with the train.
      const v = journey.velocity;
      if (head.current) {
        head.current.style.opacity = String(h);
        head.current.style.transform = `translate3d(${(1 - h) * 24}px, 0, 0)`;
        head.current.style.visibility = h > 0.01 ? "visible" : "hidden";
      }
      if (info.current) {
        info.current.style.opacity = String(k * (1 - Math.min(0.5, v * 0.8)));
        info.current.style.transform = `translate3d(${(1 - k) * 24 - v * 18}px, 0, 0)`;
        info.current.style.visibility = k > 0.01 ? "visible" : "hidden";
      }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [reduced]);

  const height = `${(s.range[1] - s.range[0]) * JOURNEY_VH}vh`;
  if (reduced) {
    return (
      <section id="work" tabIndex={-1} aria-labelledby="work-title" className="relative outline-none" style={{ height }}>
        <div className="mx-auto max-w-[1440px] px-5 py-28 sm:px-8 md:pl-[36%] lg:pr-32">
          <Kicker id="work" />
          <h2 id="work-title" className="mt-5 text-3xl text-paper sm:text-4xl">
            Real brands. <span className="text-sun">Real work.</span>
          </h2>
          <ol className="mt-10 space-y-14">
            {WORK.map((w, i) => (
              <li key={w.id}>
                <img src={w.image} alt={`Screenshot of the ${w.name} website`} width={1280} height={800} loading="lazy" className="aspect-[16/9] w-full border border-paper/10 object-cover object-top" />
                <div className="mt-5">
                  <WorkInfo i={i} />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    );
  }

  return (
    <section
      id="work"
      tabIndex={-1}
      aria-labelledby="work-title"
      className="relative outline-none"
      style={{ height }}
      onFocusCapture={() => {
        if (journeyStore.get().station !== 1) travelTo(s.anchor);
      }}
    >
      <div className="pointer-events-none fixed inset-0 z-10">
        <div ref={head} className="invisible absolute left-5 right-5 top-20 opacity-0 sm:left-8 md:left-[36%] md:top-24 md:right-12">
          <Kicker id="work" />
          <h2 id="work-title" className="mt-4 hidden text-3xl text-paper md:block lg:text-4xl">
            Real brands. <span className="text-sun">Real work.</span>
          </h2>
        </div>
        <div ref={info} aria-live="polite" className="pointer-events-auto invisible absolute bottom-6 left-5 right-5 opacity-0 sm:left-8 sm:right-8 md:bottom-[6vh] md:left-[45.5%] md:right-auto md:w-[42%]">
          <WorkInfo key={step} i={step} />
        </div>
      </div>
    </section>
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
          {RESULT_STATS.map((s) => (
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
      <Work />
      <Vision />
      <Services />
      <Process />
      <Results />
      <Terminal />
    </>
  );
}
