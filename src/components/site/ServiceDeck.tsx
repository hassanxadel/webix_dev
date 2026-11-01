import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Box, Globe, Palette, ShoppingBag, Sparkles, type LucideIcon } from "lucide-react";
import { HERO_GLIDE } from "@/config/sections";
import { SERVICES } from "@/lib/webix-data";
import { deck } from "@/lib/deck";
import { journey, journeyStore, travelToSection } from "@/lib/journey";

const ICONS: Record<string, LucideIcon> = { Websites: Globe, "E-commerce": ShoppingBag, "3D / Interactive web": Box, Branding: Palette };

/**
 * The card's job in the hero: the Webix Pass is a deck. Hovering it (tapping on
 * touch, Enter/Space on the keyboard) deals out one pass per service; leaving
 * the group folds them back after 400 ms, as do Esc and a tap outside. This is
 * the HTML half: a real button over the card and real links over each pass
 * (crisp labels, Tab/Enter), placed every frame from what the card reports in
 * `deck` (lib/deck.ts). Clicking a pass flies it at the camera, then scrolls to
 * Services.
 */
export function ServiceDeck() {
  const [open, setOpenState] = useState(false);
  const [touch, setTouch] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const hint = useRef<HTMLParagraphElement>(null);
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
    const reduced = journeyStore.get().reducedMotion;
    deck.launch = i;
    gsap.fromTo(deck.fly, { v: 0 }, {
      v: 1,
      duration: reduced ? 0 : 0.45,
      ease: "power2.in",
      overwrite: true,
      onComplete: () => {
        travelToSection("services");
        setOpen(false);
        deck.launch = -1;
        deck.fly.v = 0;
      },
    });
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

  // Every frame: put the hit area, hint and links where the card says things are (hero only).
  useEffect(() => {
    const tick = () => {
      const inHero = journey.progress < HERO_GLIDE[0] * 0.5 && deck.card.w > 0;
      if (!inHero && deck.open) setOpen(false);
      const b = button.current, h = hint.current;
      if (b) {
        b.style.visibility = inHero ? "visible" : "hidden";
        b.style.transform = `translate3d(${deck.card.x}px, ${deck.card.y}px, 0)`;
        b.style.width = `${deck.card.w}px`;
        b.style.height = `${deck.card.h}px`;
      }
      if (h) {
        h.style.transform = `translate3d(${deck.card.x + deck.card.w / 2}px, ${deck.card.y + deck.card.h + 14}px, 0) translateX(-50%)`;
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
      <p ref={hint} aria-hidden className="hud deck-hint pointer-events-none fixed left-0 top-0 z-30">
        {touch ? "tap the pass" : "hover the pass"}
      </p>
      <ul id="hero-services" aria-label="Our services" inert={!open}>
        {SERVICES.map((s, i) => {
          const Icon = ICONS[s.name] ?? Sparkles;
          return (
            <li key={s.name}>
              <a
                ref={(el) => void (links.current[i] = el)}
                href="#services"
                className="deck-pass pointer-events-auto fixed left-0 top-0 z-30"
                onPointerEnter={() => (deck.hover = i)}
                onPointerLeave={() => deck.hover === i && (deck.hover = -1)}
                onFocus={() => {
                  deck.hover = i;
                  setOpen(true);
                }}
                onBlur={() => deck.hover === i && (deck.hover = -1)}
                onClick={(e) => {
                  e.preventDefault();
                  launch(i);
                }}
              >
                <Icon aria-hidden className="deck-icon" />
                <span className="deck-name">{s.short}</span>
                <span className="deck-line">{s.line}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
