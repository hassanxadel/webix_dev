import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Mail, MessageCircle } from "lucide-react";
import { Menu } from "@/components/site/Menu";
import { PROCESS, SERVICES } from "@/lib/webix-data";
import { SITE_CONFIG, whatsappLink } from "@/lib/site-config";

const TITLE = "Who we are — Webix";
const DESCRIPTION = "Who Webix is, what we build, how a project works, timelines, pricing from EGP 10,000, what we need from you, and what happens after launch.";

export const Route = createFileRoute("/about-webix")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: AboutWebix,
});

const STEPS = [...PROCESS, { name: "Support", text: "After launch we help with fixes, updates and questions, so the site keeps working for your business." }];

const STACK = [
  ["React, React Three Fiber and Three.js", "Fast interfaces and real-time 3D that run in the browser."],
  ["Shopify", "Store setup, theming and migration."],
  ["E-commerce", "Product pages, collections, cart and checkout."],
  ["3D and interactive web", "Scroll-driven stories, product visualisation and interactive campaigns."],
  ["UI/UX design", "User journeys and interfaces, designed before they are built."],
];

const PRICE_FACTORS = ["How many pages or products the project has", "How much custom design and motion it needs", "Whether it includes real-time 3D", "Integrations with other tools and services", "How ready your content and brand assets are", "How soon you need to launch"];

const NEEDS = [
  ["Content", "Your text, product details, photos and videos."],
  ["Brand assets", "Your logo, colours and any guidelines you already have."],
  ["Access", "Logins for your domain, hosting, Shopify or other tools we need to work in."],
  ["Feedback rounds", "One person who can review the work and answer questions, so decisions stay quick."],
];

const AFTER = [
  ["Maintenance", "Fixes and small changes once the site is live."],
  ["Hosting help", "Help choosing hosting and connecting your domain."],
  ["Updates", "New pages, products or features as your business grows."],
  ["Support", "A direct line to the people who built it, on WhatsApp or email."],
];

const FAQ = [
  ["How much does a project cost?", "Projects start from EGP 10,000. The final price depends on scope; tell us what you need and we will give you a clear quote."],
  ["How long does a project take?", "It depends on the size of the project. We agree on a timeline with you after a short discovery call, before any work starts."],
  ["What do you need from me to start?", "Your content, brand assets, access to your accounts, and someone who can give feedback. If something is not ready, tell us and we will plan around it."],
  ["Will the site work on phones?", "Yes. Everything we build is responsive and tested across devices."],
  ["Can my team run the store day to day?", "Yes. We set Shopify stores up so your team can manage products, collections and orders themselves."],
  ["Will 3D make my site slow?", "We build 3D to run in any modern browser, and we treat performance as part of the design."],
  ["Do you only build on Shopify?", "No. Shopify is for e-commerce; marketing and company websites and 3D experiences are custom-built."],
  ["What happens after launch?", "We make sure your team is ready to run it, then stay available for fixes, updates and support."],
];

/** A fact the owner must fill in: visible in development only, so it can never ship. */
function Todo({ children }: { children: ReactNode }) {
  return import.meta.env.DEV ? <p className="hud mt-3 border border-dashed border-signal/60 p-3 text-signal">TODO: {children}</p> : null;
}

function Block({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="glass p-6 sm:p-8">
      <h2 id={id} className="text-2xl text-paper sm:text-3xl">
        {title}
      </h2>
      <div className="mt-4 leading-relaxed text-paper/70">{children}</div>
    </section>
  );
}

function Pairs({ items }: { items: string[][] }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="font-heading font-semibold text-paper">{k}</dt>
          <dd className="mt-1 text-sm">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Everything a client needs to know before starting a project. Links into the home page are full loads, so it mounts its scene fresh. */
function AboutWebix() {
  return (
    <>
      <div aria-hidden className="space-sky fixed inset-0">
        <div className="page-stars absolute inset-0" />
      </div>
      <Menu />
      <main className="relative z-10 mx-auto grid max-w-3xl gap-6 px-5 pb-28 pt-28 sm:px-8">
        <Link to="/" className="hud inline-flex w-fit items-center gap-2 text-paper/80 hover:text-sun">
          <ArrowLeft size={16} aria-hidden /> Back to home
        </Link>
        <h1 className="work-title">
          <span className="logo-type" data-text="Who">
            Who
          </span>{" "}
          <span className="logo-type" data-text="we">
            we
          </span>{" "}
          <span className="logo-type logo-type-ix" data-text="are.">
            are.
          </span>
        </h1>

        <Block id="who" title="A software and web agency">
          <p>Webix designs and builds modern websites, e-commerce stores and 3D digital experiences for ambitious brands.</p>
          <p className="mt-3">Our mission: combine thoughtful design and modern web technology to help businesses present their brands, reach customers, and grow online.</p>
          <Todo>add the Webix story (how and when it started, who is behind it).</Todo>
        </Block>

        <Block id="what" title="What we do">
          <ul className="grid gap-4 sm:grid-cols-2">
            {SERVICES.map((s) => (
              <li key={s.slug}>
                <a href={`/#service-${s.slug}`} className="group block">
                  <span className="inline-flex items-center gap-2 font-heading font-semibold text-paper group-hover:text-sun">
                    {s.name} <ArrowRight size={15} aria-hidden />
                  </span>
                  <span className="mt-1 block text-sm">{s.line}</span>
                </a>
              </li>
            ))}
          </ul>
        </Block>

        <Block id="how" title="How we work">
          <ol className="grid gap-4">
            {STEPS.map((s, i) => (
              <li key={s.name} className="flex gap-4">
                <span className="hud pt-1 text-sun">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <p className="font-heading font-semibold text-paper">{s.name}</p>
                  <p className="mt-1 text-sm">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </Block>

        <Block id="stack" title="Our stack and capabilities">
          <Pairs items={STACK} />
        </Block>

        <Block id="timelines" title="Timelines">
          <p>Timelines depend on the project. We set yours together after a short discovery call, before any work starts.</p>
          <Todo>add typical durations per project type (website, Shopify store, 3D experience, branding).</Todo>
        </Block>

        <Block id="pricing" title="Pricing">
          <p className="font-heading text-xl font-semibold text-sun">Projects start from EGP 10,000.</p>
          <p className="mt-3">What affects the price:</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
            {PRICE_FACTORS.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <Todo>add payment terms (deposit, milestones, accepted methods).</Todo>
        </Block>

        <Block id="needs" title="What we need from you">
          <Pairs items={NEEDS} />
        </Block>

        <Block id="after" title="After launch">
          <Pairs items={AFTER} />
          <Todo>add maintenance and support terms (what is included, for how long, what it costs).</Todo>
        </Block>

        <Block id="faq" title="Questions clients ask">
          <div className="grid gap-2">
            {FAQ.map(([q, a]) => (
              <details key={q} className="border-b border-paper/10 pb-2">
                <summary className="cursor-pointer py-1 font-heading font-semibold text-paper hover:text-sun">{q}</summary>
                <p className="mt-1 text-sm">{a}</p>
              </details>
            ))}
          </div>
        </Block>

        <Block id="start" title="Ready when you are">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
            <a href="/#contact" className="btn-logo">
              Start a project <ArrowRight aria-hidden size={18} strokeWidth={2.6} />
            </a>
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-paper/80 hover:text-paper">
              <MessageCircle size={16} className="text-sun" aria-hidden /> WhatsApp <span className="sr-only">(opens in a new tab)</span>
            </a>
            <a href={`mailto:${SITE_CONFIG.email}`} className="inline-flex items-center gap-2 text-sm text-paper/80 hover:text-paper">
              <Mail size={16} className="text-sun" aria-hidden /> {SITE_CONFIG.email}
            </a>
          </div>
        </Block>
      </main>
    </>
  );
}
