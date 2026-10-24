import { createFileRoute } from "@tanstack/react-router";
import { SceneLayer } from "@/components/site/SceneLayer";
import { Navbar } from "@/components/site/Navbar";
import { LineMap } from "@/components/site/LineMap";
import { StationSign } from "@/components/site/StationSign";
import { Hud } from "@/components/site/Hud";
import { Loader } from "@/components/site/Loader";
import { Stations } from "@/components/site/Stations";
import { CaseStudyDialog } from "@/components/site/CaseStudyDialog";
import { useJourneyTracker } from "@/lib/journey";

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
      { property: "og:image", content: "/brand/webix-wordmark.png" },
      { name: "twitter:image", content: "/brand/webix-wordmark.png" },
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
      <Navbar />
      <StationSign />
      <LineMap />
      <Hud />
      <main className="relative z-10">
        <Stations />
      </main>
      <CaseStudyDialog />
      <Loader />
    </>
  );
}
