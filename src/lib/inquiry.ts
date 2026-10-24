import { z } from "zod";
import { SERVICES } from "./webix-data";

const SERVICE_OPTIONS = [...SERVICES.map((s) => s.name), "Not sure yet"];

export const BUDGETS = ["Under $1,000", "$1,000 – $3,000", "$3,000 – $7,000", "$7,000+", "Not sure yet"] as const;

export const inquirySchema = z
  .object({
    name: z.string().trim().min(2, "Please tell us your name."),
    business: z.string().trim().min(2, "Please add your business or brand name."),
    service: z.string().refine((s) => SERVICE_OPTIONS.includes(s), "Choose the service you're interested in."),
    budget: z.string().optional(),
    details: z.string().trim().min(20, "A couple of sentences helps us prepare — at least 20 characters."),
    method: z.enum(["whatsapp", "email"]),
    reply: z.string().trim().min(5, "Add where we can reply to you."),
  })
  .superRefine((v, ctx) => {
    if (v.method === "email" && !z.string().email().safeParse(v.reply).success)
      ctx.addIssue({ code: "custom", path: ["reply"], message: "Enter a valid email address." });
    if (v.method === "whatsapp" && !/^\+?[\d\s()-]{7,}$/.test(v.reply))
      ctx.addIssue({ code: "custom", path: ["reply"], message: "Enter a valid phone number, including the country code." });
  });

export type Inquiry = z.infer<typeof inquirySchema>;

/** The message text sent to Webix through WhatsApp or the visitor's email app. */
export function buildInquiryMessage(v: Inquiry) {
  return [
    `Hi Webix, I'd like to start a project.`,
    ``,
    `Name: ${v.name}`,
    `Business: ${v.business}`,
    `Service: ${v.service}`,
    v.budget ? `Budget: ${v.budget}` : null,
    `Preferred contact: ${v.method === "whatsapp" ? "WhatsApp" : "Email"} — ${v.reply}`,
    ``,
    `Project details:`,
    v.details,
  ]
    .filter((l) => l !== null)
    .join("\n");
}
