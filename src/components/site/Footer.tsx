import { SITE_CONFIG, whatsappLink } from "@/lib/site-config";

const LINKS = [
  ["Home", "/"],
  ["Projects", "/projects"],
  ["Who we are", "/about-webix"],
  ["Contact", "/contact"],
] as const;

/** Copyright, quick links and contact. Plain links: pages outside the journey load the home page fresh. */
export function Footer({ className = "" }: { className?: string }) {
  return (
    <footer className={`text-[13px] leading-relaxed text-paper/55 ${className}`}>
      <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
        <span>© 2026 {SITE_CONFIG.brand}</span>
        {LINKS.map(([label, href]) => (
          <a key={href} href={href} className="hover:text-paper">
            {label}
          </a>
        ))}
        <a href={`mailto:${SITE_CONFIG.email}`} className="hover:text-paper">
          {SITE_CONFIG.email}
        </a>
        <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="hover:text-paper">
          WhatsApp {SITE_CONFIG.whatsappDisplay}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </nav>
    </footer>
  );
}
