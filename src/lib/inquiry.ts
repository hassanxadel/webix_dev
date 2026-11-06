import { z } from "zod";
import { SERVICES } from "./webix-data";
import { normalizeInstagram } from "./instagram";

const SERVICE_OPTIONS = [...SERVICES.map((s) => s.name), "Not sure yet"];

export const BUDGETS = ["EGP 10,000 – 20,000", "EGP 20,000 – 40,000", "EGP 40,000 – 75,000", "EGP 75,000+", "Not sure yet"] as const;

const PHONE = /^\+?[\d\s()-]{7,}$/;

export const inquirySchema = z.object({
  name: z.string().trim().min(2, "Please tell us your name."),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z
    .string()
    .trim()
    .refine((v) => !v || PHONE.test(v), "Enter a valid phone number, including the country code."),
  business: z.string().trim().min(2, "Please add your business or brand name."),
  instagram: z
    .string()
    .trim()
    .refine((v) => !v || normalizeInstagram(v), "Enter @yourbrand or an instagram.com link.")
    .transform((v) => (v && normalizeInstagram(v)) || ""),
  service: z.string().refine((s) => SERVICE_OPTIONS.includes(s), "Choose the service you're interested in."),
  budget: z.string(),
  details: z.string().trim().min(20, "A couple of sentences helps us prepare — at least 20 characters."),
});

export type Inquiry = z.infer<typeof inquirySchema>;

/** The message text for the WhatsApp / email fallback, when the form can't send. */
export function buildInquiryMessage(v: Inquiry) {
  return [
    `Hi Webix, I'd like to start a project.`,
    ``,
    `Name: ${v.name}`,
    `Email: ${v.email}`,
    v.phone ? `Phone / WhatsApp: ${v.phone}` : null,
    `Business: ${v.business}`,
    v.instagram ? `Instagram: ${v.instagram}` : null,
    `Service: ${v.service}`,
    v.budget ? `Budget: ${v.budget}` : null,
    ``,
    `Project details:`,
    v.details,
  ]
    .filter((l) => l !== null)
    .join("\n");
}

/** Posts the inquiry to Web3Forms, which emails it to Webix. `bot` = the hidden honeypot was ticked. */
export async function sendInquiry(v: Inquiry, bot: boolean) {
  const res = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      access_key: import.meta.env.VITE_WEB3FORMS_KEY,
      subject: `New Webix inquiry — ${v.name} (${v.service})`,
      from_name: "Webix Website",
      replyto: v.email,
      name: v.name,
      email: v.email,
      phone: v.phone,
      company: v.business,
      instagram: v.instagram,
      service: v.service,
      budget: v.budget,
      message: v.details,
      botcheck: bot ? "on" : "",
    }),
  });
  const data = (await res.json()) as { success?: boolean };
  if (!data.success) throw new Error("Web3Forms rejected the inquiry");
}
