import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Mail, MessageCircle } from "lucide-react";
import { Block, PageShell, Pairs } from "@/components/site/PageShell";
import { HOURLY_RATE, OFFERS, PAYMENT, QUOTE_NOTE, STARTING_PRICE, SUPPORT, TIMELINE_NOTE, egp } from "@/config/business";
import { Button } from "@/components/site/Button";
import { PROCESS, SERVICES } from "@/lib/webix-data";
import { SITE_CONFIG, SITE_URL, whatsappLink } from "@/lib/site-config";

const TITLE = "Who we are — Webix";
const DESCRIPTION = "Webix is a Cairo web agency for Egyptian and Gulf brands: websites, Shopify stores and 3D experiences. Our story, how we work, timelines, prices from EGP 10,000, payment terms and support plans.";

export const Route = createFileRoute("/about-webix")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:image", content: `${SITE_URL}/brand/webix-wordmark.png` },
    ],
  }),
  component: AboutWebix,
});

const STEPS = [...PROCESS, { name: "Support", text: `After launch: ${SUPPORT.freeDays} days of free bug-fix support, then an optional monthly plan to keep the site updated and secure.` }];

const STORY = [
  "Webix started the way many good studios do: one developer, a laptop and a lot of late nights. While studying Computer Engineering and Software Systems at Ain Shams University, Hassan Adel spent two years freelancing, building websites for shops, small businesses and brands. By the time he graduated in 2026, he had delivered more than ten of them.",
  "Along the way the same story kept coming up. Businesses wanted sites that look modern, load fast and actually bring in customers, but the choice was between templates that all look the same and agencies that are slow and hard to reach. Webix is the answer to that: a Cairo-based software and web agency that designs and builds websites, online stores and immersive 3D experiences for Egyptian and Gulf brands.",
  "You work directly with the people who build your site. You get a fixed quote before anything starts, and we deliver when we say we will. Our mission is simple: your ideas, our digital playground.",
];

const WHY = [
  ["Clear communication", "You talk to the person building your site, on WhatsApp or email, with regular updates."],
  ["Honest pricing", `A fixed quote before we start, from ${egp(STARTING_PRICE)}, and no surprise fees.`],
  ["On-time delivery", "We agree a timeline up front and keep to it."],
  ["Craft", "Fast, responsive, accessible builds, with 3D and motion when they serve the brand."],
  ["Yours to keep", "Source files and full ownership are handed over after the final payment."],
];

const STACK = [
  ["React, React Three Fiber and Three.js", "Fast interfaces and real-time 3D that run in the browser."],
  ["Shopify", "Store setup, theming and migration."],
  ["E-commerce", "Product pages, collections, cart and checkout."],
  ["3D and interactive web", "Scroll-driven stories, product visualisation and interactive campaigns."],
  ["UI/UX design", "User journeys and interfaces, designed before they are built."],
  ["Maintenance and SEO", "Updates, backups, speed and search basics after launch."],
];

const PRICE_FACTORS = ["How many pages or products the project has", "How much custom design and motion it needs", "Whether it includes real-time 3D", "Integrations with other tools and services", "How ready your content and brand assets are", "How soon you need to launch"];

const NEEDS = [
  ["Content", "Your text, product details, photos and videos."],
  ["Brand assets", "Your logo, colours and any guidelines you already have."],
  ["Access", "Logins for your domain, hosting, Shopify or other tools we need to work in."],
  ["Feedback rounds", "One person who can review the work and answer questions, so decisions stay quick."],
];

const [landing, business, shopify] = OFFERS;
const FAQ = [
  ["How much does a project cost?", `A landing page starts from ${egp(landing.from)}, a business website from ${egp(business.from)} and a Shopify store from ${egp(shopify.from)}. ${QUOTE_NOTE}`],
  ["How long does a project take?", `A landing page takes ${landing.timeline}, a business website ${business.timeline} and a Shopify store ${shopify.timeline}. ${TIMELINE_NOTE}`],
  ["What do you need from me to start?", "Your content, brand assets, access to your accounts, and one person who can give feedback. If something is not ready, tell us and we will plan around it."],
  ["Do you handle the domain and hosting?", "They are not included in the price, but we help you choose, buy and connect them, and we set everything up."],
  ["How many revisions do I get?", `Two rounds per phase are included. Extra rounds are billed at ${egp(HOURLY_RATE)} an hour.`],
  ["Who owns the website?", "You do. Source files and full ownership are handed over after the final payment."],
  ["Can you build in Arabic?", "Yes. We build bilingual Arabic and English sites with proper right-to-left layouts."],
  ["Will it work on phones and show up on Google?", "Yes. Every site is responsive, tested on phones and built with SEO foundations: fast pages, clean structure and the right meta tags."],
  ["How do I pay?", `${PAYMENT.schedule} ${PAYMENT.methods}`],
  ["What happens after launch?", `${SUPPORT.freeDays} days of free bug-fix support, then an optional monthly plan from ${egp(SUPPORT.plans[0].monthly)}. ${SUPPORT.cancel}`],
];

/** Everything a client needs to know before starting a project. Links into the home page are full loads, so it mounts its scene fresh. */
function AboutWebix() {
  return (
    <PageShell className="max-w-3xl">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link to="/">
            <ArrowLeft size={16} aria-hidden /> Back to home
          </Link>
        </Button>
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

        <Block id="who" title="Our story">
          {STORY.map((para, i) => (
            <p key={i} className={i ? "mt-3" : undefined}>
              {para}
            </p>
          ))}
        </Block>

        <Block id="why" title="Why Webix">
          <Pairs items={WHY} />
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
          <Pairs items={OFFERS.map((o) => [o.name, o.timeline])} />
          <p className="mt-4 text-sm">{TIMELINE_NOTE}</p>
        </Block>

        <Block id="pricing" title="Pricing">
          <p className="font-heading text-xl font-semibold text-sun">Projects start from {egp(STARTING_PRICE)}.</p>
          <div className="mt-4">
            <Pairs items={OFFERS.map((o) => [o.name, `From ${egp(o.from)}`])} />
          </div>
          <p className="mt-4 text-sm">{QUOTE_NOTE}</p>
          <p className="mt-5">What affects the price:</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
            {PRICE_FACTORS.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </Block>

        <Block id="payment" title="Payment terms">
          <ul className="list-inside list-disc space-y-1.5 text-sm">
            {[PAYMENT.schedule, PAYMENT.largeProjects, PAYMENT.methods, ...PAYMENT.terms].map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Block>

        <Block id="needs" title="What we need from you">
          <Pairs items={NEEDS} />
        </Block>

        <Block id="after" title="After launch">
          <p>{SUPPORT.freeDays} days of free bug-fix support after launch. After that, an optional monthly plan:</p>
          <ul className="mt-4 grid gap-4 sm:grid-cols-3">
            {SUPPORT.plans.map((plan) => (
              <li key={plan.name} className="rounded-xl border border-paper/12 p-4">
                <p className="font-heading font-semibold text-paper">{plan.name}</p>
                <p className="mt-1 text-sm text-sun">{egp(plan.monthly)} / month</p>
                <ul className="mt-3 space-y-1 text-sm">
                  {[...plan.includes, plan.response].map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm">
            {SUPPORT.cancel} {SUPPORT.outside}
          </p>
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
            <Button asChild>
              <a href="/contact">
                Start a project <ArrowRight aria-hidden size={18} strokeWidth={2.6} />
              </a>
            </Button>
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-paper/80 hover:text-paper">
              <MessageCircle size={16} className="text-sun" aria-hidden /> WhatsApp <span className="sr-only">(opens in a new tab)</span>
            </a>
            <a href={`mailto:${SITE_CONFIG.email}`} className="inline-flex items-center gap-2 text-sm text-paper/80 hover:text-paper">
              <Mail size={16} className="text-sun" aria-hidden /> {SITE_CONFIG.email}
            </a>
          </div>
        </Block>
    </PageShell>
  );
}
