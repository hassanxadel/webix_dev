/**
 * Work — one floating panel per project, in order. Derived from the real project
 * list in lib/webix-data.ts; nothing here is invented.
 */
import { PROJECTS, type Project } from "@/lib/webix-data";

export type WorkProject = {
  id: string;
  name: string;
  type: string;
  category: Project["category"];
  /** One line. */
  description: string;
  /** Tech tags: the real stack, read from the live site. */
  tech: string[];
  /** 16:9 WebP screenshot (top of the site), for the carousel, /projects and the detail page. */
  image: string;
  url: string;
  /** Index into PROJECTS, for the case-study dialog. */
  index: number;
};

export const WORK: WorkProject[] = PROJECTS.map((p, index) => ({
  id: p.slug,
  name: p.name,
  type: p.type,
  category: p.category,
  description: p.summary,
  tech: p.stack,
  image: `/work/film/${p.slug}.webp`,
  url: p.url,
  index,
}));
