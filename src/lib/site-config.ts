/**
 * Webix's contact details: the inquiry form, Contact and About sections, the
 * ID badge, the floating WhatsApp button and every Get started CTA read them here.
 */
export const SITE_CONFIG = {
  brand: "Webix",
  // TODO: confirm name and title (given as "[CONFIRM: …]" in the brief).
  owner: "Hassan Adel",
  ownerTitle: "Founder & Lead Developer, Webix",
  /** Badge photo (About Me): src/assets/me.png, cropped to the subject → public/about/me.webp. */
  ownerPhoto: "/about/me.webp" as string | null,
  city: "Cairo, EG",
  email: "hassanadelh@outlook.com",
  /** International format, digits only (no +, spaces or leading zeros), e.g. "201001234567". */
  whatsapp: "966597976116",
  /** Shown as written next to WhatsApp. */
  whatsappDisplay: "+966 59 797 6116",
  handle: "@webix_dev",
} as const;

export const whatsappLink = (text?: string) =>
  `https://wa.me/${SITE_CONFIG.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

export const mailtoLink = (subject: string, body: string) =>
  `mailto:${SITE_CONFIG.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
