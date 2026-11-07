import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/site/Button";
import { ContactForm } from "@/components/site/ContactForm";
import { LogoWord } from "@/components/site/LogoWord";
import { PageShell } from "@/components/site/PageShell";
import { SITE_CONFIG, SITE_URL, whatsappLink } from "@/lib/site-config";

const TITLE = "Start a project — Webix";
const DESCRIPTION = "Tell Webix about your website, online store or 3D project. Projects start from EGP 10,000, with a fixed quote before work begins.";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:image", content: `${SITE_URL}/brand/webix-wordmark.png` },
    ],
  }),
  component: ContactPage,
});

/** The inquiry form on its own page: phones reach it from the Contact card; it also works on desktop. `?service=<slug>` presets the service. */
function ContactPage() {
  return (
    <PageShell className="max-w-3xl">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <a href="/#contact">
          <ArrowLeft size={16} aria-hidden /> Back
        </a>
      </Button>
      <header>
        <h1 className="work-title">
          <LogoWord w="Start" /> <LogoWord w="a" /> <LogoWord w="project." variant="ix" />
        </h1>
        <p className="mt-3 text-[15px] leading-[1.45] text-paper/70 sm:text-base">
          Tell us what you&apos;re building and we&apos;ll reply by email or WhatsApp with the next steps.
        </p>
      </header>
      <div className="glass p-5 sm:p-7">
        <ContactForm />
      </div>
      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <li>
          <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-paper/80 hover:text-paper">
            <MessageCircle size={16} className="text-sun" aria-hidden /> WhatsApp {SITE_CONFIG.whatsappDisplay} <span className="sr-only">(opens in a new tab)</span>
          </a>
        </li>
        <li>
          <a href={`mailto:${SITE_CONFIG.email}`} className="inline-flex items-center gap-2 text-paper/80 hover:text-paper">
            <Mail size={16} className="text-sun" aria-hidden /> {SITE_CONFIG.email}
          </a>
        </li>
      </ul>
    </PageShell>
  );
}
