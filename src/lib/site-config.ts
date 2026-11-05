/**
 * Contact details used by the inquiry form, footer and contact section.
 * Replace these placeholders with Webix's real details before launch.
 */
export const SITE_CONFIG = {
  brand: "Webix",
  // TODO: confirm name and title (given as "[CONFIRM: …]" in the brief).
  owner: "Hassan Adel",
  ownerTitle: "Founder & Lead Developer, Webix",
  /** Badge photo (About). null = placeholder silhouette; set to e.g. "/about/me.jpg" once the photo is in public/about/. */
  ownerPhoto: null as string | null,
  city: "Cairo, EG",
  email: "hello@example.com",
  /** International format, digits only (no +, spaces or leading zeros), e.g. "201001234567". */
  whatsapp: "200000000000",
  instagram: "https://www.instagram.com/",
  instagramHandle: "@webix",
} as const;

export const whatsappLink = (text?: string) =>
  `https://wa.me/${SITE_CONFIG.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

export const mailtoLink = (subject: string, body: string) =>
  `mailto:${SITE_CONFIG.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
