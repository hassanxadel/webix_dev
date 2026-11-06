import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ArrowLeft, ArrowRight, Box, Check, Clock, Globe, Palette, ShoppingBag, Sparkles, Users, type LucideIcon } from "lucide-react";
import { SERVICES } from "@/lib/webix-data";
import { deck } from "@/lib/deck";
import { journeyStore, lockScroll, travelToSection, useJourney } from "@/lib/journey";
import { Button } from "./Button";

const ICONS: Record<string, LucideIcon> = { Websites: Globe, "E-commerce": ShoppingBag, "3D / Interactive web": Box, Branding: Palette };
const HASH = "#service-";
const fromHash = () => SERVICES.findIndex((s) => location.hash === HASH + s.slug);

/** Opens a service sub-section (`#service-<slug>`); `push` adds a history entry so the browser's Back closes it. */
export function openService(i: number, push = true) {
  if (push) history.pushState({ service: i }, "", HASH + SERVICES[i].slug);
  journeyStore.set({ openService: i });
}

/**
 * One sub-section per service, over the scene: the clicked pass grows into the
 * header (shared-element FLIP from `deck.origin`), then the content fades in.
 * "← Back" (or Esc, or the browser's Back) folds it back toward the card.
 * "Get started" closes it, presets the contact form's service, and travels to Contact.
 */
export function ServiceDetail() {
  const open = useJourney((s) => s.openService);
  const reduced = useJourney((s) => s.reducedMotion);
  const [shown, setShown] = useState<number | null>(null);
  const shade = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const closing = useRef(false);
  const after = useRef<(() => void) | null>(null);

  // Deep links and the browser's Back / Forward.
  useEffect(() => {
    const sync = () => {
      const i = fromHash();
      if (i >= 0) openService(i, false);
      else if (journeyStore.get().openService !== null) journeyStore.set({ openService: null });
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  // Store → panel: mount on open; animate out (then unmount) on close.
  useEffect(() => {
    if (open !== null) {
      closing.current = false;
      setShown(open);
      return;
    }
    if (shown === null || closing.current) return;
    closing.current = true;
    const done = () => {
      setShown(null);
      closing.current = false;
      lockScroll(false);
      (document.querySelector(".deck-hit") as HTMLElement | null)?.focus({ preventScroll: true });
      after.current?.();
      after.current = null;
    };
    const h = head.current;
    if (reduced || !h) {
      gsap.to([shade.current, body.current, h], { opacity: 0, duration: 0.2, onComplete: done });
      return;
    }
    // Fold back toward the card.
    const r = h.getBoundingClientRect();
    const c = deck.card;
    const to = c.w > 0 ? { x: c.x + c.w / 2 - (r.left + r.width / 2), y: c.y + c.h / 2 - (r.top + r.height / 2), s: Math.max(0.12, c.w / r.width) } : { x: 0, y: 40, s: 0.6 };
    gsap.to(body.current, { opacity: 0, y: 12, duration: 0.2 });
    gsap.to(h, { x: to.x, y: to.y, scale: to.s, opacity: 0, duration: 0.5, ease: "power3.in" });
    gsap.to(shade.current, { opacity: 0, duration: 0.5, delay: 0.1, onComplete: done });
  }, [open, shown, reduced]);

  // Grow out of the clicked pass.
  useLayoutEffect(() => {
    if (shown === null) return;
    lockScroll(true);
    const h = head.current!;
    gsap.set([shade.current, body.current, h], { clearProps: "all" });
    const o = deck.origin;
    deck.origin = null;
    gsap.fromTo(shade.current, { opacity: 0 }, { opacity: 1, duration: reduced ? 0.2 : 0.4 });
    if (o && !reduced) {
      const r = h.getBoundingClientRect();
      gsap.fromTo(
        h,
        { x: o.left - r.left, y: o.top - r.top, scaleX: o.width / r.width, scaleY: o.height / r.height, transformOrigin: "0 0" },
        { x: 0, y: 0, scaleX: 1, scaleY: 1, duration: 0.65, ease: "power3.inOut" },
      );
    } else gsap.fromTo(h, { opacity: 0 }, { opacity: 1, duration: 0.25 });
    gsap.fromTo(body.current, { opacity: 0, y: reduced ? 0 : 18 }, { opacity: 1, y: 0, duration: 0.45, delay: o && !reduced ? 0.5 : 0.1, ease: "power2.out" });
    back.current?.focus({ preventScroll: true });
  }, [shown, reduced]);

  const close = (then?: () => void) => {
    after.current = then ?? null;
    if (history.state?.service !== undefined) history.back(); // popstate clears the store
    else {
      history.replaceState(null, "", location.pathname + location.search);
      journeyStore.set({ openService: null });
    }
  };

  useEffect(() => {
    if (shown === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [shown]);

  if (shown === null) return null;
  const s = SERVICES[shown];
  const Icon = ICONS[s.name] ?? Sparkles;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="service-title" className="fixed inset-0 z-[70] overflow-y-auto overscroll-contain" data-lenis-prevent>
      <div ref={shade} aria-hidden className="fixed inset-0 bg-night/75 backdrop-blur-md" onClick={() => close()} />
      <div className="relative mx-auto max-w-3xl px-5 pb-16 pt-6 sm:px-8 sm:pt-10">
        <Button ref={back} variant="ghost" size="sm" onClick={() => close()} className="mb-6">
          <ArrowLeft size={16} aria-hidden /> Back
        </Button>
        <div ref={head} className={`svc-card svc-hero svc-${s.face}`}>
          <Icon aria-hidden className="svc-icon" strokeWidth={2.2} />
          <p className="hud svc-kicker">Service {String(shown + 1).padStart(2, "0")} / {String(SERVICES.length).padStart(2, "0")}</p>
          <h2 id="service-title" className="svc-title">
            {s.name}
          </h2>
          <p className="svc-intro">{s.intro}</p>
        </div>
        <div ref={body} className="glass mt-6 grid gap-8 p-6 sm:grid-cols-2 sm:p-9">
          <div className="sm:col-span-2">
            <p className="hud text-sun">What&apos;s included</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {s.items.map((it) => (
                <li key={it} className="flex gap-3 text-paper/85">
                  <Check size={18} className="mt-0.5 shrink-0 text-sun" aria-hidden /> {it}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="hud flex items-center gap-2 text-sun">
              <Users size={14} aria-hidden /> Who it&apos;s for
            </p>
            <p className="mt-3 leading-relaxed text-paper/70">{s.forWho}</p>
          </div>
          <div>
            <p className="hud flex items-center gap-2 text-sun">
              <Clock size={14} aria-hidden /> Typical timeline
            </p>
            <p className="mt-3 leading-relaxed text-paper/70">{s.timeline}</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
            <Button asChild>
              <a
                href={`?service=${s.slug}#contact`}
                onClick={(e) => {
                  e.preventDefault();
                  journeyStore.set({ servicePreset: s.name });
                  close(() => {
                    history.replaceState(null, "", `${location.pathname}?service=${s.slug}`);
                    travelToSection("contact");
                  });
                }}
              >
                Get started <ArrowRight aria-hidden size={18} strokeWidth={2.6} />
              </a>
            </Button>
            <p className="text-sm text-paper/55">We&apos;ll preselect {s.name} in the contact form.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
