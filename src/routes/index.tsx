import { createFileRoute } from "@tanstack/react-router";
import { SceneLayer } from "@/components/webix/SceneLayer";
import { Nav } from "@/components/webix/Nav";
import { About, Hero, Process, Services, Work } from "@/components/webix/Sections";
import { Contact } from "@/components/webix/Contact";
import { CaseStudyDialog } from "@/components/webix/CaseStudyDialog";
import { useScrollStage } from "@/lib/scroll-stage";

const TITLE = "Webix — Websites, E-commerce & Digital Experiences";
const DESCRIPTION =
  "Webix designs and builds modern websites, Shopify stores, UI/UX and brand identities for ambitious brands. Your ideas. Our digital playground.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:image", content: "/brand/webix-wordmark.webp" },
      { name: "twitter:image", content: "/brand/webix-wordmark.webp" },
    ],
  }),
  component: Page,
});

function Page() {
  useScrollStage();
  return (
    <>
      <a
        href="#work"
        className="sr-only z-[60] rounded-full bg-sun px-4 py-2 font-display text-sm font-semibold text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <SceneLayer />
      <Nav />
      <main className="relative z-10">
        <Hero />
        <Work />
        <Services />
        <About />
        <Process />
        <Contact />
      </main>
      <CaseStudyDialog />
    </>
  );
}
