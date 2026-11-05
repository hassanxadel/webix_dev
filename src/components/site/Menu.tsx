import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import gsap from "gsap";
import { X } from "lucide-react";
import { HERO_GLIDE, type SectionId } from "@/config/sections";
import { journey, travelTo, travelToSection } from "@/lib/journey";
import { LoupeToggle } from "./Loupe";

const LINKS: { id: SectionId; label: string }[] = [
  { id: "hero", label: "Home" },
  { id: "work", label: "Work" },
  { id: "services", label: "Services" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
];

/**
 * Site chrome: the Webix W top-left (back to top) and a "Menu" button
 * top-right (full-screen overlay with the links), on every section. The hero
 * adds a "Scroll down to discover" hint bottom-left and the wordmark
 * bottom-right; both fade out as the card glides away.
 */
export function Menu() {
  const [open, setOpen] = useState(false);
  const heroOnly = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tick = () => {
      const el = heroOnly.current;
      if (!el) return;
      const k = Math.min(1, Math.max(0, (journey.progress - HERO_GLIDE[0] * 0.6) / (HERO_GLIDE[0] * 0.8)));
      el.style.opacity = String(1 - k);
      el.style.visibility = k >= 1 ? "hidden" : "visible";
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  const go = (id: SectionId) => () => {
    setOpen(false);
    travelToSection(id);
  };

  return (
    <>
      <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-start justify-between p-5 sm:p-8">
        <a
          href="#hero"
          aria-label="Webix — back to top"
          className="pointer-events-auto"
          onClick={(e) => {
            e.preventDefault();
            travelTo(0);
          }}
        >
          <img src="/brand/webix-w.svg" alt="" width={1000} height={724} className="h-10 w-auto sm:h-11" />
        </a>
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger className="hud pointer-events-auto flex items-center gap-3 py-2 text-paper/85 transition-colors hover:text-sun">
            <span className="flex flex-col gap-[5px]" aria-hidden>
              <span className="h-px w-6 bg-current" />
              <span className="h-px w-4 bg-current" />
            </span>
            Menu
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-[60] bg-[#0b1638]/80 backdrop-blur-xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
            <Dialog.Content className="fixed inset-0 z-[61] flex flex-col p-5 outline-none sm:p-8 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0">
              <Dialog.Title className="sr-only">Menu</Dialog.Title>
              <Dialog.Description className="sr-only">Jump to a section of the page.</Dialog.Description>
              <Dialog.Close className="hud ml-auto flex w-fit items-center gap-3 py-2 text-paper/85 transition-colors hover:text-sun">
                <X size={18} aria-hidden /> Close
              </Dialog.Close>
              <nav aria-label="Main" className="my-auto">
                <ul className="space-y-2 sm:space-y-4">
                  {LINKS.map((l, i) => (
                    <li key={l.id}>
                      <a
                        href={`#${l.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          go(l.id)();
                        }}
                        className="group flex items-baseline gap-5 font-heading text-5xl font-bold text-paper transition-colors hover:text-sun sm:text-7xl"
                      >
                        <span className="hud text-sm text-paper/40 group-hover:text-sun">{String(i + 1).padStart(2, "0")}</span>
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </header>

      <div ref={heroOnly} className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex items-end justify-between p-5 sm:p-8">
        <span className="flex items-center gap-4">
        <LoupeToggle />
        <span aria-hidden className="hud mb-1 flex items-center gap-3 text-[0.62rem] text-paper/60">
          <span className="relative h-px w-10 overflow-hidden bg-paper/20">
            <span className="absolute inset-y-0 left-0 w-1/2 animate-[scroll-hint-x_2.4s_ease-in-out_infinite] bg-sun" />
          </span>
          Scroll down to discover
        </span>
        </span>
        <img aria-hidden src="/brand/webix-wordmark-trim.webp" alt="" width={1175} height={571} className="w-[40vw] select-none md:w-[18vw]" />
      </div>
    </>
  );
}
