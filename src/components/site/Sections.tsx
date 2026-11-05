import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { ArrowRight, Instagram, Mail, MessageCircle } from "lucide-react";
import { HERO_GLIDE, PAGE_VH, SECTIONS, sectionIndex, type SectionId } from "@/config/sections";
import { PROCESS, RESULT_STATS, SERVICES } from "@/lib/webix-data";
import { SITE_CONFIG, whatsappLink } from "@/lib/site-config";
import { journey, journeyStore, travelTo, travelToSection, useJourney } from "@/lib/journey";
import { ContactForm } from "./ContactForm";
import { ServiceDeck } from "./ServiceDeck";
import { CharacterCarousel } from "@/shaders/character-carousel/CharacterCarousel";
import "@/shaders/threeui.css";

const pad2 = (n: number) => String(n).padStart(2, "0");
const heightOf = (id: SectionId) => {
  const i = sectionIndex(id);
  const s = SECTIONS[i];
  // The last section gets one extra screen so the page can scroll all the way to progress 1.
  return `${(s.range[1] - s.range[0]) * PAGE_VH + (i === SECTIONS.length - 1 ? 100 : 0)}vh`;
};

/**
 * One section. Its height is its share of the scroll; the panel sits in a
 * sticky layer opposite the card (right on desktop, below it on phones) and
 * fades in only during the section's content window.
 */
function Section({ id, children }: { id: SectionId; children: ReactNode }) {
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
      <div className="sticky top-0 h-screen overflow-hidden">
        <div
          className="section-copy mx-auto flex h-full max-w-[1440px] items-start px-5 pb-6 pt-[34vh] sm:px-8 md:items-center md:py-24 md:pl-[38%] lg:pr-16"
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

/** A word lettered like the Webix logo (`.logo-type` in styles.css); `ix` = the logo's yellow "ix" colours, `sub` = the small subline style. */
function LogoWord({ w, variant }: { w: string; variant?: "ix" | "sub" }) {
  return (
    <span className={variant ? `logo-type logo-type-${variant}` : "logo-type"} data-text={w}>
      {w}
    </span>
  );
}
const HERO_SUB = "websites, stores and 3D experiences by webix.";

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
      {/* ~15% from the top: clearly below the W and the Menu at every width (they end at ~60 px / ~76 px), even with the tilt. */}
      <div ref={fade} className="pointer-events-none fixed inset-x-0 top-[max(100px,15vh)] z-30 px-3 sm:px-8 [@media(max-height:620px)]:top-[90px]">
        <div className="hero-headline text-center" data-in={shown}>
          <h1 id="hero-title" className="hero-title">
            <LogoWord w="we" />{" "}
            <LogoWord w="launch" />{" "}
            <LogoWord w="brands" />{" "}
            <LogoWord w="into" />{" "}
            <LogoWord w="orbit." variant="ix" />
          </h1>
          <p className="hero-sub mt-3 sm:mt-4">
            {HERO_SUB.split(" ").map((w, i) => (
              <Fragment key={i}>
                {i > 0 && " "}
                <LogoWord w={w} variant="sub" />
              </Fragment>
            ))}
          </p>
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
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="section-copy relative h-full" data-on={showing === index}>
          <div className="mx-auto max-w-[1440px] px-5 pt-[13vh] sm:px-8">
            <Label id="work" />
            <h2 id="work-title" className="mt-3 text-3xl text-paper sm:text-4xl">
              Real brands. <span className="text-sun">Real work.</span>
            </h2>
          </div>
          <div className="shader-frame absolute inset-x-0 bottom-[3vh] top-[26vh]">
            <CharacterCarousel variant="filmstrip" speed={1.0} scale={1.0} opacity={1.0} hue={0} saturation={1.0} brightness={1.0} />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────── About (includes the former hero lines) ───────── */

function About() {
  return (
    <Section id="about">
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
                <MessageCircle size={16} className="text-sun" aria-hidden /> WhatsApp <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
            <li>
              <a href={`mailto:${SITE_CONFIG.email}`} className="inline-flex items-center gap-2 text-paper/80 hover:text-paper">
                <Mail size={16} className="text-sun" aria-hidden /> {SITE_CONFIG.email}
              </a>
            </li>
            <li>
              <a href={SITE_CONFIG.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-paper/80 hover:text-paper">
                <Instagram size={16} className="text-sun" aria-hidden /> {SITE_CONFIG.instagramHandle} <span className="sr-only">(opens in a new tab)</span>
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
    </>
  );
}
