import { useEffect, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { ArrowRight, Mail, MessageCircle } from "lucide-react";
import { HERO_GLIDE, PAGE_VH, SECTIONS, sectionIndex, type SectionId } from "@/config/sections";
import { PROCESS, RESULT_STATS, SERVICES } from "@/lib/webix-data";
import { SITE_CONFIG, whatsappLink } from "@/lib/site-config";
import { journey, journeyStore, travelTo, travelToSection, useJourney } from "@/lib/journey";
import { badge } from "@/lib/badge";
import { ContactForm } from "./ContactForm";
import { ServiceDeck } from "./ServiceDeck";
import { WorkFilmstrip } from "./WorkFilmstrip";
import { WORK } from "@/config/projects";

const pad2 = (n: number) => String(n).padStart(2, "0");
const heightOf = (id: SectionId) => {
  const i = sectionIndex(id);
  const s = SECTIONS[i];
  // The last section gets one extra screen so the page can scroll all the way to progress 1.
  return `${(s.range[1] - s.range[0]) * PAGE_VH + (i === SECTIONS.length - 1 ? 100 : 0)}vh`;
};

/**
 * One section. Its height is its share of the scroll; the panel sits in a
 * sticky layer opposite the card (right on desktop — `copy="left"` when the
 * card is on the right, as in About — below it on phones) and
 * fades in only during the section's content window.
 */
function Section({ id, children, copy = "right" }: { id: SectionId; children: ReactNode; copy?: "left" | "right" }) {
  const index = sectionIndex(id);
  const s = SECTIONS[index];
  const showing = useJourney((st) => st.showing);
  return (
    <section
      id={id}
      tabIndex={-1}
      aria-labelledby={`${id}-title`}
      className="relative outline-none"
      style={{ height: heightOf(id) }}
      // Keyboard users tabbing into a section travel there, so focus is never on hidden copy.
      onFocusCapture={() => {
        if (journeyStore.get().showing !== index) travelTo(s.anchor);
      }}
    >
      <div className="sticky top-0 h-svh overflow-hidden">
        <div
          className={`section-copy mx-auto flex h-full max-w-[1440px] items-start px-5 pb-6 pt-[34vh] sm:px-8 md:items-center md:py-24 ${copy === "left" ? "md:pr-[40%] lg:pl-16" : "md:pl-[38%] lg:pr-16"}`}
          data-on={showing === index}
        >
          {/* Phones: the card sits above, so long panels scroll inside the space left below it. */}
          <div className="max-h-full w-full overflow-y-auto overscroll-contain md:overflow-visible">{children}</div>
        </div>
      </div>
    </section>
  );
}

function Label({ id }: { id: SectionId }) {
  return <p className="hud text-sun">{SECTIONS[sectionIndex(id)].label}</p>;
}

/* ───────── Hero: the headline (top centre) over the card; W, Menu, wordmark and hint live in Menu.tsx ───────── */

/** A word lettered like the Webix logo (`.logo-type` in styles.css); `ix` = the logo's yellow "ix" colours. */
function LogoWord({ w, variant }: { w: string; variant?: "ix" }) {
  return (
    <span className={variant ? `logo-type logo-type-${variant}` : "logo-type"} data-text={w}>
      {w}
    </span>
  );
}

function Hero() {
  const ready = useJourney((s) => s.sceneReady);
  const [shown, setShown] = useState(false);
  const fade = useRef<HTMLDivElement>(null);

  // Arrives with the scene (or after the loader's own timeout, so it never waits on WebGL).
  useEffect(() => {
    if (ready) setShown(true);
    const t = window.setTimeout(() => setShown(true), 2600);
    return () => window.clearTimeout(t);
  }, [ready]);

  // Leaves on scroll with the rest of the hero chrome.
  useEffect(() => {
    const tick = () => {
      const el = fade.current;
      if (!el) return;
      const k = Math.min(1, Math.max(0, (journey.progress - HERO_GLIDE[0] * 0.6) / (HERO_GLIDE[0] * 0.8)));
      el.style.opacity = String(1 - k);
      el.style.transform = `translate3d(0, ${-k * 24}px, 0)`;
      el.style.visibility = k >= 1 ? "hidden" : "visible";
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <section id="hero" aria-labelledby="hero-title" className="relative" style={{ height: heightOf("hero") }}>
      {/* Below the W / Menu row (safe-area aware): ~16% from the top on desktop, under the row on phones (.hero-head). */}
      <div ref={fade} className="hero-head pointer-events-none fixed inset-x-0 z-30 px-3 sm:px-8">
        <div className="hero-headline text-center" data-in={shown}>
          <h1 id="hero-title" className="hero-title">
            <LogoWord w="we" />{" "}
            <LogoWord w="launch" />{" "}
            <LogoWord w="brands" />{" "}
            <LogoWord w="into" />{" "}
            <LogoWord w="orbit." variant="ix" />
          </h1>
        </div>
      </div>
      <ServiceDeck />
    </section>
  );
}

/* ───────── Work: ThreeUI CharacterCarousel (filmstrip) ───────── */

function Work() {
  const index = sectionIndex("work");
  const showing = useJourney((st) => st.showing);
  return (
    <section id="work" tabIndex={-1} aria-labelledby="work-title" className="relative outline-none" style={{ height: heightOf("work") }}>
      <div className="sticky top-0 h-svh overflow-hidden">
        <div className="section-copy relative h-full" data-on={showing === index}>
          <div className="mx-auto max-w-[1440px] px-5 pt-[13vh] sm:px-8">
            <Label id="work" />
            <h2 id="work-title" className="work-title mt-3 max-w-[calc(100%-42vw)] md:max-w-none">
              <LogoWord w="Real" /> <LogoWord w="brands." /> <LogoWord w="Real" /> <LogoWord w="work." variant="ix" />
            </h2>
            <p className="hud mt-3 text-paper/55">Move, scroll or use the arrow keys · select the card in front to open it</p>
          </div>
          <WorkFilmstrip />
          {/* The same projects outside the frame, for assistive tech. */}
          <ol className="sr-only">
            {WORK.map((w) => (
              <li key={w.id}>
                <button type="button" onClick={() => journeyStore.set({ openProject: w.index })}>
                  Open {w.name}, {w.type}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ───────── About (includes the former hero lines) ───────── */

/** Grab area over the 3D badge (the canvas takes no pointer events): placed every frame from `badge.box`. */
function BadgeHit() {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const tick = () => {
      const d = el.current;
      if (!d) return;
      const b = badge.box;
      d.style.visibility = b.w > 1 ? "visible" : "hidden";
      d.style.transform = `translate3d(${b.x}px, ${b.y}px, 0)`;
      d.style.width = `${b.w}px`;
      d.style.height = `${b.h}px`;
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);
  const point = (e: React.PointerEvent) => Object.assign(badge.pointer, { x: (e.clientX / innerWidth) * 2 - 1, y: 1 - (e.clientY / innerHeight) * 2 });
  return (
    <div
      ref={el}
      aria-hidden
      className="badge-hit pointer-events-auto fixed left-0 top-0 z-20"
      onPointerEnter={(e) => {
        point(e);
        badge.hover = true;
      }}
      onPointerLeave={() => !badge.held && (badge.hover = false)}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        point(e);
        badge.held = true;
      }}
      onPointerMove={point}
      onPointerUp={() => {
        badge.held = false;
        badge.hover = false;
      }}
      onPointerCancel={() => (badge.held = badge.hover = false)}
    />
  );
}

function About() {
  return (
    <Section id="about" copy="left">
      <div className="glass w-full max-w-2xl p-6 sm:p-9">
        <Label id="about" />
        <h2 id="about-title" className="mt-4 text-[2.2rem] leading-[1.05] text-paper sm:text-5xl">
          Your ideas. <span className="block text-sun">Our playground.</span>
        </h2>
        <p className="mt-3 text-lg font-medium text-paper/85">We build digital journeys.</p>
        <p className="mt-7 font-heading text-xl font-semibold leading-snug text-paper sm:text-2xl">
          We design and build modern websites, e-commerce stores and <span className="text-sun">3D digital experiences for ambitious brands.</span>
        </p>
        <p className="mt-4 max-w-lg leading-relaxed text-paper/65">
          We combine thoughtful design and modern web technology to help businesses present their brands, reach customers, and grow online.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <a
            href="#contact"
            className="btn-primary"
            onClick={(e) => {
              e.preventDefault();
              travelToSection("contact");
            }}
          >
            Get Started <ArrowRight size={16} aria-hidden />
          </a>
          <a
            href="#work"
            className="btn-secondary"
            onClick={(e) => {
              e.preventDefault();
              travelToSection("work");
            }}
          >
            Explore our work
          </a>
        </div>
      </div>
    </Section>
  );
}

/* ───────── Services ───────── */

function Services() {
  return (
    <Section id="services">
      <div className="glass w-full max-w-xl p-6 sm:p-9">
        <Label id="services" />
        <h2 id="services-title" className="mt-4 text-3xl text-paper sm:text-4xl">
          What we build.
        </h2>
        <ol className="mt-6 space-y-5">
          {SERVICES.map((svc, i) => (
            <li key={svc.name} className="flex gap-4">
              <span className="hud pt-1 text-sun">{pad2(i + 1)}</span>
              <div>
                <p className="font-heading text-lg font-semibold text-paper">{svc.name}</p>
                <p className="mt-1 text-sm leading-relaxed text-paper/60">{svc.line}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}

/* ───────── Process ───────── */

function Process() {
  return (
    <Section id="process">
      <div className="glass w-full max-w-2xl p-6 sm:p-9">
        <Label id="process" />
        <h2 id="process-title" className="mt-4 text-3xl text-paper sm:text-4xl">
          Our process
        </h2>
        <ol className="mt-6 grid gap-6 sm:grid-cols-2">
          {PROCESS.map((s, i) => (
            <li key={s.name}>
              <p className="hud text-sun">{pad2(i + 1)}</p>
              <p className="mt-1.5 font-heading text-xl font-semibold text-paper">{s.name}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-paper/60">{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}

/* ───────── Results ───────── */

function Results() {
  return (
    <Section id="results">
      <div className="glass w-full max-w-xl p-6 sm:p-9">
        <Label id="results" />
        <h2 id="results-title" className="mt-4 text-3xl text-paper sm:text-4xl">
          Real brands. <span className="text-sun">Real results.</span>
        </h2>
        <dl className="mt-7 grid grid-cols-2 gap-3">
          {RESULT_STATS.map((s) => (
            <div key={s.label} className="rounded-xl border border-paper/10 p-4">
              <dt className="hud text-paper/50">{s.label}</dt>
              <dd className="mt-1 font-mono text-3xl text-sun">{pad2(s.value)}</dd>
            </div>
          ))}
        </dl>
        {/* TODO: real testimonial — add client quotes here once approved; never invent them. Hidden in production until then. */}
        {import.meta.env.DEV && <p className="hud mt-4 border border-dashed border-signal/60 p-3 text-signal">Placeholder · testimonials pending (dev only)</p>}
      </div>
    </Section>
  );
}

/* ───────── About Me: the founder's crew pass on its lanyard (three/Badge) ───────── */

/**
 * Last section. The badge hangs centred (3D, in the main canvas); the copy sits
 * beside it on wide screens (≥ 1200 px, ≥ 3:2) and below it elsewhere.
 */
function AboutMe() {
  const index = sectionIndex("me");
  const showing = useJourney((st) => st.showing);
  return (
    <section id="me" tabIndex={-1} aria-labelledby="me-title" className="relative outline-none" style={{ height: heightOf("me") }}>
      <div className="sticky top-0 h-svh overflow-hidden">
        <div className="section-copy relative h-full" data-on={showing === index}>
          <div className="me-copy">
            <div className="glass p-6 sm:p-8">
              <Label id="me" />
              <h2 id="me-title" className="me-title mt-4">
                <LogoWord w={SITE_CONFIG.owner.split(" ")[0]} /> <LogoWord w={SITE_CONFIG.owner.split(" ").slice(1).join(" ")} variant="ix" />
              </h2>
              <p className="mt-2 font-heading text-lg font-semibold text-sun">{SITE_CONFIG.ownerTitle}</p>
              {/* TODO: a real bio from the owner; this restates only what the site already says. */}
              <p className="mt-4 leading-relaxed text-paper/70">
                I run Webix: we design and build websites, Shopify stores, real-time 3D for the web and brand identities, from {SITE_CONFIG.city}.
              </p>
              <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <li>
                  <a href={`mailto:${SITE_CONFIG.email}`} className="inline-flex items-center gap-2 text-paper/80 hover:text-paper">
                    <Mail size={16} className="text-sun" aria-hidden /> {SITE_CONFIG.email}
                  </a>
                </li>
                <li>
                  <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-paper/80 hover:text-paper">
                    <MessageCircle size={16} className="text-sun" aria-hidden /> WhatsApp <span className="hud text-[0.65rem] text-paper/55">{SITE_CONFIG.handle}</span>{" "}
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────── Contact ───────── */

function Contact() {
  return (
    <Section id="contact">
      <div className="grid w-full max-w-3xl gap-6">
        <div className="glass p-6 sm:p-8">
          <Label id="contact" />
          <h2 id="contact-title" className="mt-4 text-3xl text-paper sm:text-4xl">
            Your stop. <span className="text-sun">Let&apos;s build it.</span>
          </h2>
          <p className="mt-3 leading-relaxed text-paper/65">If we can make a train station feel real in a browser, imagine what we can do for your store.</p>
          <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <li>
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-paper/80 hover:text-paper">
                <MessageCircle size={16} className="text-sun" aria-hidden /> WhatsApp {SITE_CONFIG.whatsappDisplay}{" "}
                <span className="hud text-[0.65rem] text-paper/55">{SITE_CONFIG.handle}</span> <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
            <li>
              <a href={`mailto:${SITE_CONFIG.email}`} className="inline-flex items-center gap-2 text-paper/80 hover:text-paper">
                <Mail size={16} className="text-sun" aria-hidden /> {SITE_CONFIG.email}
              </a>
            </li>
          </ul>
        </div>
        <div className="glass p-5 sm:p-7 md:max-h-[calc(100vh-22rem)] md:overflow-y-auto">
          <ContactForm />
        </div>
      </div>
    </Section>
  );
}

export function Sections() {
  return (
    <>
      <Hero />
      <Work />
      <About />
      <Services />
      <Process />
      <Results />
      <Contact />
      <AboutMe />
      <BadgeHit />
    </>
  );
}
