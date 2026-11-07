/**
 * Webix business values: the one place to edit prices, timelines, payment terms and support plans.
 * The service sub-sections, the Who we are page (timelines, pricing, after launch, FAQ) and the
 * contact page read from here. Amounts are starting prices in EGP; every project gets a fixed quote.
 */

export const egp = (n: number) => `EGP ${n.toLocaleString("en-US")}`;

/** The lowest starting price (landing page). */
export const STARTING_PRICE = 10_000;
export const QUOTE_NOTE = "Final price depends on scope; you get a fixed quote before we start.";
export const TIMELINE_NOTE = "The timeline starts once we have your content and the deposit.";

/** What we sell, smallest first: starting price (EGP) and typical timeline. `service` is the SERVICES slug it belongs to. */
export const OFFERS = [
  { name: "Landing page", service: "websites", from: 10_000, timeline: "1–2 weeks" },
  { name: "Business website (5–8 pages)", service: "websites", from: 18_000, timeline: "2–4 weeks" },
  { name: "Shopify store", service: "ecommerce", from: 25_000, timeline: "3–5 weeks" },
  { name: "Custom e-commerce", service: "ecommerce", from: 45_000, timeline: "5–8 weeks" },
  { name: "3D / interactive website", service: "3d", from: 35_000, timeline: "4–8 weeks" },
  { name: "Branding / UI-UX (add-on)", service: "branding", from: 8_000, timeline: "1–3 weeks" },
] as const;

export const PAYMENT = {
  schedule: "50% deposit to start, 50% before launch.",
  largeProjects: `Projects above ${egp(40_000)}: 40% to start, 30% at design approval, 30% before launch.`,
  methods: "InstaPay, bank transfer or Vodafone Cash. International clients: bank transfer or PayPal.",
  terms: [
    "Quotes are valid for 14 days.",
    "Prices exclude the domain, hosting, the Shopify subscription, paid apps or plugins and stock assets. We help you set them up.",
    "Two rounds of revisions per phase are included; extra rounds are billed at the hourly rate.",
    "Source files and full ownership are handed over after the final payment.",
  ],
};

export const HOURLY_RATE = 400;

export const SUPPORT = {
  freeDays: 30,
  plans: [
    { name: "Care", monthly: 1_500, response: "48-hour response", includes: ["Security and plugin updates", "Backups and uptime monitoring", "2 hours of small edits a month"] },
    { name: "Growth", monthly: 3_500, response: "24-hour response", includes: ["Everything in Care", "6 hours of edits or new content a month", "Basic SEO and speed checks", "A monthly report"] },
    { name: "Priority", monthly: 6_500, response: "Same-day response", includes: ["Everything in Growth", "12 hours a month", "Priority support", "Small feature additions"] },
  ],
  cancel: "Cancel anytime with 30 days' notice.",
  outside: `Work outside a plan: ${egp(HOURLY_RATE)} an hour.`,
};

const offersFor = (service: string) => OFFERS.filter((o) => o.service === service);
/** "Landing page: 1–2 weeks · Business website (5–8 pages): 2–4 weeks." for a service's sub-section. */
export const timelineFor = (service: string) => `${offersFor(service).map((o) => `${o.name}: ${o.timeline}`).join(" · ")}. ${TIMELINE_NOTE}`;
export const priceFor = (service: string) => offersFor(service).map((o) => `${o.name} from ${egp(o.from)}`).join(" · ");
