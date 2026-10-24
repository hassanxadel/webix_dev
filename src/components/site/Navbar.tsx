import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { STATIONS, type NavId } from "@/config/stations";
import { travelTo, useJourney } from "@/lib/journey";

const LINKS: { id: NavId; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "work", label: "Work" },
  { id: "services", label: "Services" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
];

const anchorFor = (id: NavId) => STATIONS.find((s) => s.nav === id)!;

/** The nav link that owns the current station (Process and Results belong to Work). */
function activeNav(station: number): NavId {
  for (let i = station; i >= 0; i--) {
    const nav = STATIONS[i].nav;
    if (nav) return nav;
  }
  return "home";
}

export function Navbar() {
  const station = useJourney((s) => s.station);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const active = activeNav(station);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (id: NavId) => (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(false);
    const s = anchorFor(id);
    travelTo(s.anchor);
    document.getElementById(s.id)?.focus({ preventScroll: true });
  };

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ${scrolled ? "bg-[rgb(7_11_20/0.55)] backdrop-blur-md" : ""}`}>
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:h-[76px] lg:px-12">
        <a href="#departure" onClick={go("home")} aria-label="Webix — home" className="shrink-0">
          <img src="/brand/webix-wordmark.png" alt="Webix" width={640} height={311} className="h-8 w-auto lg:h-10" />
        </a>

        <ul className="hidden items-center gap-10 md:flex">
          {LINKS.map((l) => (
            <li key={l.id}>
              <a
                href={`#${anchorFor(l.id).id}`}
                onClick={go(l.id)}
                aria-current={active === l.id ? "location" : undefined}
                className={`relative py-2 text-[0.8rem] font-medium uppercase tracking-[0.12em] transition-colors ${
                  active === l.id ? "text-sun" : "text-paper/85 hover:text-paper"
                }`}
              >
                {l.label}
                <span className={`absolute inset-x-0 -bottom-0.5 h-px bg-sun transition-transform duration-500 ${active === l.id ? "scale-x-100" : "scale-x-0"}`} />
              </a>
            </li>
          ))}
        </ul>

        <p className="hud hidden items-center gap-3 text-paper/70 lg:flex">
          <span className="h-px w-6 bg-sun" aria-hidden />
          We build digital experiences
        </p>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center border border-paper/20 text-paper md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </nav>

      {open && (
        <div id="mobile-menu" className="border-t border-paper/10 bg-[rgb(7_11_20/0.97)] px-5 pb-6 md:hidden">
          <ul>
            {LINKS.map((l) => (
              <li key={l.id}>
                <a href={`#${anchorFor(l.id).id}`} onClick={go(l.id)} className={`block border-b border-paper/5 py-4 text-sm uppercase tracking-[0.14em] ${active === l.id ? "text-sun" : "text-paper"}`}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
