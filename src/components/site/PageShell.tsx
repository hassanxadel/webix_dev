import type { ReactNode } from "react";
import { Menu } from "./Menu";

/** A page outside the journey: the CSS star sky and the Menu, no 3D. */
export function PageShell({ className, children }: { className: string; children: ReactNode }) {
  return (
    <>
      <div aria-hidden className="space-sky fixed inset-0">
        <div className="page-stars absolute inset-0" />
      </div>
      <Menu />
      <main className={`relative z-10 mx-auto grid gap-6 px-5 pb-28 pt-28 sm:px-8 ${className}`}>{children}</main>
    </>
  );
}

/** A fact the owner must fill in: visible in development only, so it can never ship. */
export function Todo({ children }: { children: ReactNode }) {
  return import.meta.env.DEV ? <p className="hud mt-3 border border-dashed border-signal/60 p-3 text-signal">TODO: {children}</p> : null;
}

export function Block({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="glass p-6 sm:p-8">
      <h2 id={id} className="text-2xl text-paper sm:text-3xl">
        {title}
      </h2>
      <div className="mt-4 leading-relaxed text-paper/70">{children}</div>
    </section>
  );
}

export function Pairs({ items }: { items: string[][] }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt className="font-heading font-semibold text-paper">{k}</dt>
          <dd className="mt-1 text-sm">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
