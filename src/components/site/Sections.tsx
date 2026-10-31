import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ArrowRight, ArrowUpRight, Instagram, Mail, MessageCircle } from "lucide-react";
import { PAGE_VH, SECTIONS, WORK_WINDOW, sectionIndex, type SectionId } from "@/config/sections";
import { WORK } from "@/config/projects";
import { PROCESS, RESULT_STATS, SERVICES } from "@/lib/webix-data";
import { SITE_CONFIG, whatsappLink } from "@/lib/site-config";
import { journey, journeyStore, travelTo, travelToSection, useJourney } from "@/lib/journey";
import { ContactForm } from "./ContactForm";

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

/* ───────── Hero: only the card (centre), the W, the wordmark and the menu (see Menu.tsx) ───────── */

function Hero() {
  return <section id="hero" aria-label="Webix" className="relative" style={{ height: heightOf("hero") }} />;
}

/* ───────── Work: one floating panel per project, sliding in as the last slides out ───────── */

function ProjectPanel({ i }: { i: number }) {
  const w = WORK[i];
  return (
    <article className="glass w-full overflow-hidden">
      <img src={w.image} alt={`Screenshot of the ${w.name} website`} width={1280} height={800} loading={i < 2 ? "eager" : "lazy"} decoding="async" className="aspect-[16/9] w-full object-cover object-top" />
      <div className="p-5 sm:p-7">
        <p className="hud flex flex-wrap items-center gap-x-3 gap-y-1 text-paper/55">
          <span className="text-sun">
            {pad2(i + 1)} / {pad2(WORK.length)}
          </span>
          <span>{w.type}</span>
        </p>
        <h3 className="mt-2 font-heading text-2xl font-bold text-paper sm:text-3xl">{w.name}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-paper/65">{w.description}</p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {w.tech.map((t) => (
            <span key={t} className="hud rounded-full border border-paper/15 px-2.5 py-1 text-[0.6rem] text-paper/60">
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
    </article>
  );
}

function Work() {
  const reduced = useJourney((s) => s.reducedMotion);
  const step = useJourney((s) => s.workStep);
  const panels = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (reduced) return;
    const [w0, w1] = WORK_WINDOW;
    const n = WORK.length - 1;
    const tick = () => {
      const f = Math.max(-1, Math.min(n, ((journey.progress - w0) / (w1 - w0)) * n));
      panels.current.forEach((el, i) => {
        if (!el) return;
        const d = i - f; // 0 = centred, +1 = waiting on the right, −1 = gone left
        const o = Math.max(0, 1 - Math.abs(d) * 1.4);
        el.style.transform = `translate3d(${d * 70}%, 0, 0) scale(${1 - Math.min(1, Math.abs(d)) * 0.06})`;
        el.style.opacity = String(o);
        el.style.visibility = o > 0.01 ? "visible" : "hidden";
      });
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [reduced]);

  const head = (
    <h2 id="work-title" className="mt-3 text-3xl text-paper sm:text-4xl">
      Real brands. <span className="text-sun">Real work.</span>
    </h2>
  );

  // Reduced motion: a plain vertical list.
  if (reduced) {
    return (
      <section id="work" tabIndex={-1} aria-labelledby="work-title" className="relative outline-none" style={{ height: heightOf("work") }}>
        <div className="mx-auto max-w-[1440px] px-5 pb-24 pt-[34vh] sm:px-8 md:pl-[38%] md:pt-28 lg:pr-16">
          <Label id="work" />
          {head}
          <ol className="mt-10 space-y-10">
            {WORK.map((w, i) => (
              <li key={w.id}>
                <ProjectPanel i={i} />
              </li>
            ))}
          </ol>
        </div>
      </section>
    );
  }

  return (
    <Section id="work">
      <div className="flex w-full max-w-2xl flex-col">
        <Label id="work" />
        <div className="hidden md:block">{head}</div>
        <h2 className="sr-only md:hidden">Real brands. Real work.</h2>
        <div className="relative mt-6 grid">
          {WORK.map((w, i) => (
            <div
              key={w.id}
              ref={(el) => void (panels.current[i] = el)}
              className="col-start-1 row-start-1 will-change-transform"
              aria-hidden={i !== step || undefined}
              inert={i !== step || undefined}
            >
              <ProjectPanel i={i} />
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ───────── About (includes the former hero lines) ───────── */

function About() {
  return (
    <Section id="about">
      <div className="glass w-full max-w-2xl p-6 sm:p-9">
        <Label id="about" />
        <h1 id="about-title" className="mt-4 text-[2.2rem] leading-[1.05] text-paper sm:text-5xl">
          Your ideas. <span className="block text-sun">Our playground.</span>
        </h1>
        <p className="mt-3 text-lg font-medium text-paper/85">We build digital journeys.</p>
        <h2 className="mt-7 text-xl leading-snug text-paper sm:text-2xl">
          We design and build modern websites, e-commerce stores and <span className="text-sun">3D digital experiences for ambitious brands.</span>
        </h2>
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
