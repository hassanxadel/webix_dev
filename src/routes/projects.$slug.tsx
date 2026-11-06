import { useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, ArrowUpRight, Instagram } from "lucide-react";
import { Button } from "@/components/site/Button";
import { Lightbox } from "@/components/site/Lightbox";
import { LogoWord } from "@/components/site/LogoWord";
import { Block, PageShell, Pairs, Todo } from "@/components/site/PageShell";
import { WORK } from "@/config/projects";
import { PROJECTS } from "@/lib/webix-data";

export const Route = createFileRoute("/projects/$slug")({
  loader: ({ params }) => {
    const index = PROJECTS.findIndex((p) => p.slug === params.slug);
    if (index < 0) throw notFound();
    return index;
  },
  head: ({ loaderData }) => {
    if (loaderData === undefined) return {};
    const p = PROJECTS[loaderData];
    const title = `${p.name} — ${p.type} | Webix`;
    return {
      meta: [
        { title },
        { name: "description", content: p.summary },
        { property: "og:title", content: title },
        { property: "og:description", content: p.summary },
        { property: "og:image", content: WORK[loaderData].image },
      ],
    };
  },
  component: ProjectPage,
});

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="grid list-inside list-disc gap-2 text-sm">
      {items.map((it) => (
        <li key={it}>{it}</li>
      ))}
    </ul>
  );
}

/** One project, from the same data as the Work carousel and /projects. Missing facts stay dev-only TODOs. */
function ProjectPage() {
  const index = Route.useLoaderData();
  const p = PROJECTS[index];
  const { image, tech } = WORK[index];
  const prev = PROJECTS[(index + PROJECTS.length - 1) % PROJECTS.length];
  const next = PROJECTS[(index + 1) % PROJECTS.length];
  const shots = [image, ...p.gallery];
  const [shot, setShot] = useState<number | null>(null);

  return (
    <PageShell className="max-w-4xl">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link to="/projects">
          <ArrowLeft size={16} aria-hidden /> All projects
        </Link>
      </Button>

      <button type="button" onClick={() => setShot(0)} aria-label={`Enlarge the ${p.name} screenshot`} className="block overflow-hidden rounded-xl">
        <img src={image} alt={`Homepage of the ${p.name} website`} width={1280} height={720} fetchPriority="high" className="aspect-video w-full object-cover object-top" />
      </button>

      <header>
        <p className="hud text-sun">{p.type}</p>
        <h1 className="work-title mt-3">
          <LogoWord w={p.name} />
        </h1>
      </header>

      <Block id="overview" title="Overview">
        <p>{p.summary}</p>
        <p className="mt-3">{p.objective}</p>
        <div className="mt-6">
          <Pairs
            items={[
              ["Client", p.name],
              ["Industry", p.industry],
            ]}
          />
        </div>
      </Block>

      <Block id="did" title="What we did">
        <div className="grid gap-6 sm:grid-cols-2">
          <Bullets items={p.services} />
          <Bullets items={p.features} />
        </div>
        <Todo>add the results and a client quote once the client confirms them.</Todo>
      </Block>

      <Block id="decisions" title="Design decisions">
        <Bullets items={p.decisions} />
      </Block>

      <Block id="tech" title="Tech stack">
        <ul className="flex flex-wrap gap-2">
          {tech.map((t) => (
            <li key={t} className="tag">
              {t}
            </li>
          ))}
        </ul>
        <Todo>add the project's real stack (only the platform is known today).</Todo>
      </Block>

      {p.gallery.length > 0 ? (
        <Block id="gallery" title="Gallery">
          <ul className="grid gap-4 sm:grid-cols-2">
            {p.gallery.map((src, i) => (
              <li key={src}>
                <button type="button" onClick={() => setShot(i + 1)} aria-label={`Enlarge screenshot ${i + 1} of ${p.name}`} className="block overflow-hidden rounded-lg">
                  <img src={src} alt={`${p.name} website, screenshot ${i + 1}`} loading="lazy" decoding="async" className="aspect-video w-full object-cover object-top" />
                </button>
              </li>
            ))}
          </ul>
        </Block>
      ) : (
        <Todo>add extra screenshots to this project's gallery in src/lib/webix-data.ts.</Todo>
      )}

      <div className="flex flex-wrap gap-3">
        {p.url && (
          <Button asChild>
            <a href={p.url} target="_blank" rel="noopener noreferrer">
              Visit the live site <ArrowUpRight size={16} aria-hidden />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </Button>
        )}
        {p.instagram && (
          <Button asChild variant="ghost">
            <a href={p.instagram} target="_blank" rel="noopener noreferrer">
              <Instagram size={16} aria-hidden /> Instagram
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </Button>
        )}
      </div>

      <nav aria-label="More projects" className="flex flex-wrap justify-between gap-3 border-t border-paper/10 pt-6">
        <Button asChild variant="secondary" size="sm">
          <Link to="/projects/$slug" params={{ slug: prev.slug }} aria-label={`Previous project: ${prev.name}`}>
            <ArrowLeft size={16} aria-hidden /> {prev.name}
          </Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link to="/projects/$slug" params={{ slug: next.slug }} aria-label={`Next project: ${next.name}`}>
            {next.name} <ArrowRight size={16} aria-hidden />
          </Link>
        </Button>
      </nav>

      <Lightbox shots={shots} at={shot} onAt={setShot} label={`${p.name} website`} />
    </PageShell>
  );
}
