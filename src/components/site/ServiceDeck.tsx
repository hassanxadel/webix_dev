import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ArrowRight, Box, Globe, Palette, ShoppingBag, Sparkles, X, type LucideIcon } from "lucide-react";
import { HERO_GLIDE } from "@/config/sections";
import { SERVICES } from "@/lib/webix-data";
import { deck } from "@/lib/deck";
import { journey, journeyStore, travelToSection } from "@/lib/journey";
import { openService } from "./ServiceDetail";
import { Button } from "./Button";

const ICONS: Record<string, LucideIcon> = { Websites: Globe, "E-commerce": ShoppingBag, "3D / Interactive web": Box, Branding: Palette };

/**
 * The card's job in the hero: the Webix Pass is a deck. Hovering it (tapping on
 * touch, Enter/Space on the keyboard) deals out one pass per service; leaving
 * the group folds them back after 400 ms, as do Esc and a tap outside. This is
 * the HTML half: a real button over the card and real links over each pass
 * (crisp labels, Tab/Enter), placed every frame from what the card reports in
 * `deck` (lib/deck.ts). Each dealt pass is a brand-coloured card (its HTML
 * face fades in over the 3D slab, so text is crisp and never shows through the
 * stack); hovering one brings it forward and dims the rest. Clicking a pass
 * opens that service's sub-section (#service-<slug>), growing out of the card.
 * Under the card: the "Get started" pill (to Contact).
 */
export function ServiceDeck() {
  const [open, setOpenState] = useState(false);
  const [touch, setTouch] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const hint = useRef<HTMLParagraphElement>(null);
  const cta = useRef<HTMLAnchorElement>(null);
  const shut = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const links = useRef<(HTMLAnchorElement | null)[]>([]);
  const closeTimer = useRef(0);
  const lastInput = useRef("mouse");

  const setOpen = (v: boolean) => {
    window.clearTimeout(closeTimer.current);
    if (deck.open === v) return;
    deck.open = v;
    if (!v) deck.hover = -1;
    setOpenState(v);
    const reduced = journeyStore.get().reducedMotion;
    const n = deck.progress.length;
    // Dealt left to right with a springy ease; folded back in reverse. Reduced motion: a quick fade in place.
    deck.progress.forEach((p, i) =>
      gsap.to(p, {
        v: v ? 1 : 0,
        delay: reduced ? 0 : (v ? i : n - 1 - i) * 0.06,
        duration: reduced ? 0.2 : v ? 0.55 : 0.35,
        ease: reduced ? "none" : v ? "back.out(1.7)" : "power2.in",
        overwrite: true,
      }),
    );
  };
  const closeSoon = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), 400);
  };

  const launch = (i: number) => {
    deck.origin = links.current[i]?.getBoundingClientRect() ?? null;
    openService(i);
    setOpen(false);
  };
  // Which pass is in front; others dim (an attribute on the list, so no React render per hover).
  const front = (i: number) => {
    deck.hover = i;
    list.current?.setAttribute("data-front", String(i));
  };
  const unfront = (i: number) => {
    if (deck.hover !== i) return;
    deck.hover = -1;
    list.current?.removeAttribute("data-front");
  };

  useEffect(() => setTouch(matchMedia("(hover: none)").matches), []);

  // Esc folds the deck (focus back on the card); a tap or click outside folds it too.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, [open]);

  // Every frame: put the hit area, hint, Get started pill and links where the card says things are (hero only).
  useEffect(() => {
    const tick = () => {
      const inHero = journey.progress < HERO_GLIDE[0] * 0.5 && deck.card.w > 0;
      if (!inHero && deck.open) setOpen(false);
      const b = button.current, h = hint.current, c = cta.current;
      if (b) {
        b.style.visibility = inHero ? "visible" : "hidden";
        b.style.transform = `translate3d(${deck.card.x}px, ${deck.card.y}px, 0)`;
        b.style.width = `${deck.card.w}px`;
        b.style.height = `${deck.card.h}px`;
      }
      // The pill sits centred under the card; it steps aside (fades) only when the phone grid deals below the card.
      const below = deck.card.y + deck.card.h + Math.max(14, deck.card.h * 0.07);
      const ctaOn = inHero && !(deck.open && deck.layout === "grid");
      if (c) {
        c.style.transform = `translate3d(${deck.card.x + deck.card.w / 2}px, ${below}px, 0) translateX(-50%)`;
        c.style.opacity = ctaOn ? "1" : "0";
        c.style.visibility = ctaOn ? "visible" : "hidden";
      }
      // Touch: a ✕ on the card's top-right corner folds the deck (also: tap outside).
      if (shut.current) {
        shut.current.style.transform = `translate3d(${deck.card.x + deck.card.w - 52}px, ${deck.card.y + 8}px, 0)`;
        shut.current.style.visibility = inHero && deck.open ? "visible" : "hidden";
      }
      if (h) {
        h.style.transform = `translate3d(${deck.card.x + deck.card.w / 2}px, ${below + (c?.offsetHeight ?? 44) + 12}px, 0) translateX(-50%)`;
        h.style.opacity = inHero && !deck.open ? "1" : "0";
      }
      links.current.forEach((a, i) => {
        if (!a) return;
        const p = deck.passes[i];
        a.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) translate(-50%, -50%) rotate(${p.rot}rad)`;
        a.style.width = `${p.w}px`;
        a.style.height = `${p.h}px`;
        a.style.opacity = String(p.alpha);
        a.style.visibility = inHero && p.alpha > 0.01 ? "visible" : "hidden";
        a.style.setProperty("--pw", `${p.w}px`);
      });
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <div
      ref={root}
      onPointerEnter={(e) => {
        lastInput.current = e.pointerType;
        if (e.pointerType !== "touch") setOpen(true);
      }}
      onPointerLeave={(e) => e.pointerType !== "touch" && closeSoon()}
      onBlur={(e) => !root.current?.contains(e.relatedTarget as Node) && setOpen(false)}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls="hero-services"
        aria-label="Webix Pass: show our services"
        className="deck-hit pointer-events-auto fixed left-0 top-0 z-30"
        onPointerDown={(e) => (lastInput.current = e.pointerType)}
        onKeyDown={() => (lastInput.current = "keyboard")}
        // Mouse: hovering already opened it, so a click keeps it open. Touch / keyboard: toggle.
        onClick={() => setOpen(lastInput.current === "mouse" ? true : !deck.open)}
      />
      <Button asChild className="pointer-events-auto fixed left-0 top-0 z-30">
        <a
          ref={cta}
          href="#contact"
          onClick={(e) => {
            e.preventDefault();
            setOpen(false);
            travelToSection("contact");
          }}
        >
          Get started <ArrowRight aria-hidden size={18} strokeWidth={2.6} />
        </a>
      </Button>
      {touch && (
        <Button ref={shut} variant="icon" aria-label="Fold the services" className="pointer-events-auto fixed left-0 top-0 z-[32]" onClick={() => setOpen(false)}>
          <X size={18} strokeWidth={2.6} aria-hidden />
        </Button>
      )}
      <p ref={hint} aria-hidden className="hud deck-hint pointer-events-none fixed left-0 top-0 z-30">
        {touch ? "tap the pass" : "hover the pass"}
      </p>
      <ul ref={list} id="hero-services" aria-label="Our services" inert={!open} data-touch={touch || undefined}>
        {SERVICES.map((s, i) => {
          const Icon = ICONS[s.name] ?? Sparkles;
          return (
            <li key={s.name}>
              <a
                ref={(el) => void (links.current[i] = el)}
                href={`#service-${s.slug}`}
                className={`svc-card svc-${s.face} pointer-events-auto fixed left-0 top-0 z-30`}
                data-i={i}
                onPointerEnter={() => front(i)}
                onPointerLeave={() => unfront(i)}
                onFocus={() => {
                  front(i);
                  setOpen(true);
                }}
                onBlur={() => unfront(i)}
                onClick={(e) => {
                  e.preventDefault();
                  launch(i);
                }}
              >
                <Icon aria-hidden className="svc-icon" strokeWidth={2.2} />
                <span className="svc-title">{s.short}</span>
                <span className="svc-line">{s.line}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
