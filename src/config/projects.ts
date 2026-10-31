/**
 * Work — one floating panel per project, in order. Derived from the real project
 * list in lib/webix-data.ts; nothing here is invented.
 */
import { PROJECTS } from "@/lib/webix-data";

export type WorkProject = {
  id: string;
  name: string;
  type: string;
  /** One line. */
  description: string;
  /** Tech tags. TODO: replace with each project's real stack (only the platform is known today). */
  tech: string[];
  /** Screenshot shown through the window (≤250 KB). */
  image: string;
  url: string;
  /** Index into PROJECTS, for the case-study dialog. */
  index: number;
};

export const WORK: WorkProject[] = PROJECTS.map((p, index) => ({
  id: p.slug,
  name: p.name,
  type: p.type,
  description: p.summary,
  tech: p.platform.split("·").map((t) => t.trim()),
  image: p.image,
  url: p.url,
  index,
}));
