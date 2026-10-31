/**
 * Portfolio, services and process content.
 *
 * Case-study copy describes what is visible on each live site. It deliberately
 * contains no client quotes or performance numbers — add real ones only once
 * they are confirmed with the client.
 */

export type Project = {
  slug: string;
  name: string;
  industry: string;
  type: string;
  platform: string;
  url: string;
  instagram?: string;
  image: string;
  /** Neon accent for the project's lightbox in the 3D scene. */
  accent: string;
  summary: string;
  objective: string;
  services: string[];
  decisions: string[];
  features: string[];
};

export const PROJECTS: Project[] = [
  {
    slug: "valgara",
    name: "Valgara",
    industry: "Fashion",
    type: "Fashion e-commerce website",
    platform: "Custom build · Vercel",
    url: "https://valgara-website.vercel.app/",
    instagram: "https://www.instagram.com/valgara_eg/",
    image: "/work/valgara.jpg",
    accent: "#FFDA24",
    summary: "An online storefront for a fashion label with a bold statement: “Not made to blend in.”",
    objective:
      "Give Valgara a dedicated online home that carries the label's confident attitude and leads visitors straight into the shop.",
    services: ["Custom web development", "E-commerce UX", "Visual direction"],
    decisions: [
      "A deep forest-green and gold palette that matches the brand mark.",
      "A subtle map texture and starfield behind the hero for atmosphere without clutter.",
      "One clear call to action — Shop Now — directly under the brand statement.",
    ],
    features: ["Shop and product browsing", "Cart access from every page", "Responsive, mobile-first layout"],
  },
  {
    slug: "styledrop",
    name: "StyleDrop",
    industry: "Fashion",
    type: "Multi-brand fashion e-commerce store",
    platform: "Shopify",
    url: "https://styledroppp.myshopify.com/",
    instagram: "https://www.instagram.com/styledrop.eg/",
    image: "/work/styledrop.jpg",
    accent: "#FF007F",
    summary: "A Shopify store for multi-brand fashion, built around new drops and same-day delivery.",
    objective:
      "Launch a Shopify store where shoppers can discover trending pieces across brands quickly — and that the StyleDrop team can run from the Shopify dashboard.",
    services: ["Shopify store setup", "Theme customisation", "Product & navigation design"],
    decisions: [
      "Condensed, bold headlines with a single red accent for an energetic retail feel.",
      "An announcement ticker and delivery badges that put key offers up front.",
      "Navigation split by Shop, New In, Women, Men and Brands to match how people browse.",
    ],
    features: ["Shopify collections and brand pages", "Search, wishlist and cart", "Trust badges for delivery and secure checkout"],
  },
  {
    slug: "construct-core",
    name: "CONSTRUCT_CORE",
    industry: "Construction",
    type: "Construction industry website",
    platform: "Custom build · Vercel",
    url: "https://premium-website-olive.vercel.app/home_construct_core/code.html",
    image: "/work/construct-core.jpg",
    accent: "#FF007F",
    summary: "A premium website for a construction firm, pairing architectural imagery with an engineered visual language.",
    objective:
      "Present a construction company as precise and established, and make requesting a quote the obvious next step.",
    services: ["UI/UX design", "Custom web development", "Visual direction"],
    decisions: [
      "Dark architectural photography with a single orange accent for focus.",
      "A serif headline paired with widely tracked labels for a premium, technical tone.",
      "A persistent “Get a Quote” button and a floating contact shortcut.",
    ],
    features: ["Projects and gallery sections", "About and contact pages", "Quote request entry points"],
  },
  {
    slug: "steel-stone",
    name: "STEEL & STONE",
    industry: "Construction & industrial",
    type: "Construction and industrial website",
    platform: "Custom build · Vercel",
    url: "https://professional-website-vert.vercel.app/",
    image: "/work/steel-stone.jpg",
    accent: "#FFDA24",
    summary: "A professional site for a construction and industrial business, built to turn visitors into leads.",
    objective:
      "Communicate long-standing experience and give prospective clients several clear ways to start a conversation.",
    services: ["Custom web development", "UI/UX design", "Lead-focused layout"],
    decisions: [
      "A dark palette with safety-yellow accents drawn from the trade.",
      "Separate “Submit a Lead” and “Get a Quote” actions for different kinds of enquiries.",
      "A strong left-aligned hero with a yellow rule guiding the eye to the actions.",
    ],
    features: ["Projects and gallery pages", "Lead and quote request actions", "Click-to-call contact"],
  },
  {
    slug: "buildcrop",
    name: "BuildCrop",
    industry: "Construction",
    type: "Construction industry website",
    platform: "Custom build · Vercel",
    url: "https://basic-website-dun.vercel.app/",
    image: "/work/buildcrop.jpg",
    accent: "#FFDA24",
    summary: "A clean, corporate website for a construction company serving government, commercial and residential projects.",
    objective:
      "Deliver a clear, trustworthy site that introduces the company, outlines its services and invites enquiries.",
    services: ["Web development", "Responsive design", "Content structure"],
    decisions: [
      "A light, corporate layout with a confident blue accent.",
      "Large site photography behind a direct headline and two calls to action.",
      "Service cards that keep each offering easy to scan.",
    ],
    features: ["Services overview", "Projects and gallery pages", "Contact section"],
  },
  {
    slug: "ma-the-store",
    name: "MA the store",
    industry: "Fashion & retail",
    type: "Fashion and retail e-commerce store",
    platform: "Shopify",
    url: "https://ma-atelier-2.myshopify.com/",
    instagram: "https://www.instagram.com/ma.thestore/",
    image: "/work/ma-the-store.jpg",
    accent: "#FF007F",
    summary: "An editorial Shopify storefront for a Cairo fashion house selling dresses and accessories.",
    objective:
      "Create a store that feels like the brand's boutique — calm, considered and premium — while making both product lines easy to shop.",
    services: ["Shopify store setup", "Theme customisation", "Brand-aligned UI"],
    decisions: [
      "An editorial serif headline and warm neutral palette for a boutique feel.",
      "Two equal entry points — Shop Accessories and Shop Dresses — straight from the hero.",
      "Generous spacing that lets the photography breathe.",
    ],
    features: ["Catalog, Accessories and Dresses collections", "Search, account and cart", "Shopify checkout"],
  },
];

export type Service = {
  name: string;
  short: string;
  /** One line for the Services panel. */
  line: string;
  description: string;
  items: string[];
};

export const SERVICES: Service[] = [
  {
    name: "Websites",
    short: "Websites",
    line: "Fast, responsive sites designed around your customers.",
    description:
      "Marketing and company websites, designed and built end to end — user journeys, interface design and clean, maintainable code.",
    items: ["UI/UX design & user journeys", "Marketing & company websites", "Responsive, accessible builds", "Performance and SEO foundations"],
  },
  {
    name: "E-commerce",
    short: "E-commerce",
    line: "Shopify stores that are easy to run and easy to buy from.",
    description:
      "Shopify stores and online shopping experiences — product pages, collections and checkout that your team can manage day to day.",
    items: ["Shopify store setup & theming", "Product & collection pages", "Cart and checkout experience", "Store migration & cleanup"],
  },
  {
    name: "3D / Interactive web",
    short: "3D & Interactive",
    line: "Real-time 3D and motion that make a brand unforgettable.",
    description:
      "Interactive and real-time 3D web experiences — like the one you're scrolling through right now — built to run in any modern browser.",
    items: ["Three.js & WebGL experiences", "Scroll-driven storytelling", "Product visualisation", "Interactive campaigns"],
  },
  {
    name: "Branding",
    short: "Branding",
    line: "Visual identities that stay consistent everywhere online.",
    description:
      "Visual direction that keeps your brand consistent online — from logo usage and colour to how every page looks and sounds.",
    items: ["Visual direction", "Logo & identity assets", "Colour and typography systems", "Online brand guidelines"],
  },
];

export const PROCESS = [
  { name: "Discover", text: "We learn how your business works, who your customers are and what the website needs to achieve." },
  { name: "Design", text: "We set the visual direction and shape the user experience, then refine it with you before building." },
  { name: "Build", text: "We develop the site, test it across devices and refine every detail until it feels right." },
  { name: "Launch", text: "We deliver the finished experience, go live and make sure your team is ready to run it." },
] as const;

/** Results: verifiable facts only — every figure is derived from the project list above. */
export const RESULT_STATS = [
  { label: "Live projects", value: PROJECTS.length },
  { label: "Shopify stores", value: PROJECTS.filter((p) => p.platform.includes("Shopify")).length },
  { label: "Custom builds", value: PROJECTS.filter((p) => !p.platform.includes("Shopify")).length },
  { label: "Industries", value: new Set(PROJECTS.map((p) => p.industry.split(" ")[0])).size },
];
