import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { scrollToStage } from "@/lib/scroll-stage";
import { useSceneState, type SectionId } from "@/lib/scene-store";

const LINKS: { id: SectionId; label: string; index: number }[] = [
  { id: "home", label: "Home", index: 0 },
  { id: "work", label: "Work", index: 1 },
  { id: "services", label: "Services", index: 2 },
  { id: "about", label: "About", index: 3 },
  { id: "contact", label: "Contact", index: 5 },
];

export function Nav() {
  const section = useSceneState((s) => s.section);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (id: SectionId) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    scrollToStage(id);
    // Move keyboard focus with the visitor so screen readers land in the new section.
    document.getElementById(id)?.focus({ preventScroll: true });
  };

  // Process sits between About and Contact, so About stays highlighted there.
  const activeIndex = section === 4 ? 3 : section;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${
        scrolled ? "bg-[rgb(5_6_12/0.72)] backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:h-20 lg:px-8">
        <a href="#home" onClick={go("home")} className="flex items-center gap-3" aria-label="Webix — home">
          <img src="/brand/webix-badge.webp" alt="" width={40} height={40} className="h-9 w-9 rounded-full object-cover lg:h-10 lg:w-10" />
          <span className="font-display text-lg font-bold tracking-tight text-white">
            webix<span className="text-sun">.</span>
          </span>
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => {
            const active = activeIndex === l.index;
            return (
              <li key={l.id}>
                <a
                  href={`#${l.id}`}
                  onClick={go(l.id)}
                  aria-current={active ? "location" : undefined}
                  className={`relative rounded-full px-4 py-2 font-display text-sm font-medium transition-colors ${
                    active ? "text-white" : "text-mist/70 hover:text-white"
                  }`}
                >
                  {l.label}
                  <span
                    className={`absolute inset-x-4 -bottom-0.5 h-px bg-sun shadow-[0_0_10px_#ffda24] transition-transform duration-500 ${
                      active ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </a>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <a href="#contact" onClick={go("contact")} className="btn-primary hidden !px-5 !py-2.5 !text-sm sm:inline-flex">
            Start a Project
          </a>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white md:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      {open && (
        <div id="mobile-menu" className="border-t border-white/10 bg-[rgb(5_6_12/0.96)] px-4 pb-6 pt-2 backdrop-blur-md md:hidden">
          <ul className="flex flex-col">
            {LINKS.map((l) => (
              <li key={l.id}>
                <a href={`#${l.id}`} onClick={go(l.id)} className="block border-b border-white/5 py-4 font-display text-lg text-white">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <a href="#contact" onClick={go("contact")} className="btn-primary mt-5 w-full">
            Start a Project
          </a>
        </div>
      )}
    </header>
  );
}
