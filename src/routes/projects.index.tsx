import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/site/Button";
import { LogoWord } from "@/components/site/LogoWord";
import { PageShell } from "@/components/site/PageShell";
import { WORK } from "@/config/projects";

const TITLE = "Our work — Webix";
const DESCRIPTION = "Websites and Shopify stores Webix has designed and built for fashion, retail and construction brands.";
const ALL = "All";
const CATEGORIES = [ALL, ...new Set(WORK.map((w) => w.category))];

export const Route = createFileRoute("/projects/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
    ],
  }),
  component: Projects,
});

function Projects() {
  const [category, setCategory] = useState(ALL);
  const shown = WORK.filter((w) => category === ALL || w.category === category);

  return (
    <PageShell className="max-w-6xl">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link to="/">
          <ArrowLeft size={16} aria-hidden /> Back to home
        </Link>
      </Button>
      <header>
        <h1 className="work-title">
          <LogoWord w="Our" /> <LogoWord w="work." variant="ix" />
        </h1>
        <p className="mt-4 max-w-xl leading-relaxed text-paper/70">Websites and online stores we have designed and built for real brands.</p>
      </header>

      <div role="group" aria-label="Filter projects by category" className="flex flex-wrap gap-3">
        {CATEGORIES.map((c) => (
          <Button key={c} variant={c === category ? "secondary" : "ghost"} size="sm" aria-pressed={c === category} onClick={() => setCategory(c)}>
            {c}
          </Button>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {shown.length} projects shown
      </p>

      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((w) => (
          <li key={w.id} className="project-card glass flex flex-col overflow-hidden">
            <img src={w.image} alt={`Homepage of the ${w.name} website`} width={1280} height={720} loading="lazy" decoding="async" className="aspect-video w-full object-cover object-top" />
            <div className="flex flex-1 flex-col p-5">
              <h2 className="font-heading text-xl font-semibold text-paper">{w.name}</h2>
              <p className="hud mt-1 text-sun">{w.type}</p>
              <p className="mt-3 text-sm leading-relaxed text-paper/70">{w.description}</p>
              <ul aria-label="Tech" className="mt-4 flex flex-wrap gap-2">
                {w.tech.map((t) => (
                  <li key={t} className="tag">
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex flex-wrap gap-3 pt-6">
                <Button asChild size="sm">
                  <Link to="/projects/$slug" params={{ slug: w.id }} aria-label={`View details of ${w.name}`}>
                    View details <ArrowRight size={16} aria-hidden />
                  </Link>
                </Button>
                {w.url && (
                  <Button asChild variant="ghost" size="sm">
                    <a href={w.url} target="_blank" rel="noopener noreferrer" aria-label={`Live site of ${w.name} (opens in a new tab)`}>
                      Live site <ArrowUpRight size={16} aria-hidden />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
