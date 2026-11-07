import { createFileRoute } from "@tanstack/react-router";
import { SceneLayer } from "@/components/site/SceneLayer";
import { Menu } from "@/components/site/Menu";
import { Loader } from "@/components/site/Loader";
import { Sections } from "@/components/site/Sections";
import { CaseStudyDialog } from "@/components/site/CaseStudyDialog";
import { ServiceDetail } from "@/components/site/ServiceDetail";
import { Loupe } from "@/components/site/Loupe";
import { useJourneyTracker } from "@/lib/journey";
import { SITE_URL } from "@/lib/site-config";

const TITLE = "Webix — Websites, E-commerce & 3D Digital Experiences";
const DESCRIPTION =
  "Webix designs and builds modern websites, Shopify e-commerce stores, 3D interactive web experiences and brand identities for ambitious brands. Your ideas. Our digital playground.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:image", content: `${SITE_URL}/brand/webix-wordmark.png` },
      { name: "twitter:image", content: `${SITE_URL}/brand/webix-wordmark.png` },
    ],
  }),
  component: Page,
});

function Page() {
  useJourneyTracker();
  return (
    <>
      <a href="#work" className="sr-only z-[80] bg-sun px-4 py-2 text-sm font-semibold text-indigo focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to projects
      </a>
      <SceneLayer />
      <Menu />
      <main className="relative z-10">
        <Sections />
      </main>
      <CaseStudyDialog />
      <Loupe />
      <ServiceDetail />
      <Loader />
    </>
  );
}
