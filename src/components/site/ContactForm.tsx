import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Instagram, Loader2 } from "lucide-react";
import type { z } from "zod";
import { BUDGETS, buildInquiryMessage, inquirySchema, sendInquiry, type Inquiry } from "@/lib/inquiry";
import { SERVICES } from "@/lib/webix-data";
import { mailtoLink, whatsappLink } from "@/lib/site-config";
import { useJourney } from "@/lib/journey";

function Field({ id, label, error, optional, children }: { id: string; label: string; error?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="hud mb-2 block text-paper/75">
        {label} {optional && <span className="normal-case tracking-normal text-paper/40">(optional)</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[0.8rem] text-[#ff6b7a]">
          {error}
        </p>
      )}
    </div>
  );
}

/** Project inquiry: validates, then emails it to Webix through Web3Forms, with a retry and WhatsApp / email fallbacks if that fails. */
export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState<Inquiry | null>(null);
  const honeypot = useRef<HTMLInputElement>(null);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof inquirySchema>, unknown, Inquiry>({
    resolver: zodResolver(inquirySchema),
    defaultValues: { name: "", email: "", phone: "", business: "", instagram: "", service: "", budget: "", details: "" },
  });

  // Service preset: from a service sub-section's Get started, or a `?service=<slug>` link.
  const preset = useJourney((s) => s.servicePreset);
  useEffect(() => {
    const slug = new URLSearchParams(location.search).get("service");
    const name = preset ?? SERVICES.find((s) => s.slug === slug)?.name;
    if (name) setValue("service", name);
  }, [preset, setValue]);

  const onSubmit = async (v: Inquiry) => {
    setFailed(null);
    try {
      await sendInquiry(v, !!honeypot.current?.checked);
      setSent(true);
      reset();
    } catch {
      setFailed(v);
    }
  };

  const err = (k: keyof Inquiry) => errors[k]?.message as string | undefined;
  const aria = (k: keyof Inquiry) => ({ "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `${k}-error` : undefined });

  if (sent)
    return (
      <div role="status" className="py-10 text-center">
        <p className="hud text-sun">Sent</p>
        <h3 className="mt-4 text-2xl text-paper">Thanks! We&apos;ll reply within 24 hours.</h3>
        <button type="button" onClick={() => setSent(false)} className="btn-secondary mt-7">
          Write another inquiry
        </button>
      </div>
    );

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
      {/* Web3Forms honeypot: people never see it, bots tick it. */}
      <input ref={honeypot} type="checkbox" name="botcheck" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <Field id="name" label="Your name" error={err("name")}>
        <input id="name" className="field" autoComplete="name" {...register("name")} {...aria("name")} />
      </Field>
      <Field id="email" label="Your email" error={err("email")}>
        <input id="email" className="field" type="email" autoComplete="email" placeholder="you@company.com" {...register("email")} {...aria("email")} />
      </Field>
      <Field id="phone" label="Phone / WhatsApp" optional error={err("phone")}>
        <input id="phone" className="field" type="tel" autoComplete="tel" placeholder="+20 100 000 0000" {...register("phone")} {...aria("phone")} />
      </Field>
      <Field id="business" label="Business name" error={err("business")}>
        <input id="business" className="field" autoComplete="organization" {...register("business")} {...aria("business")} />
      </Field>
      <div className="sm:col-span-2">
        <Field id="instagram" label="Instagram brand page" optional error={err("instagram")}>
          <div className="relative">
            <Instagram size={16} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-paper/50" />
            <input id="instagram" className="field !pl-10" placeholder="@yourbrand or instagram.com/yourbrand" {...register("instagram")} {...aria("instagram")} />
          </div>
        </Field>
      </div>
      <Field id="service" label="Service" error={err("service")}>
        <select id="service" className="field" {...register("service")} {...aria("service")}>
          <option value="" disabled>
            Choose a service
          </option>
          {SERVICES.map((s) => (
            <option key={s.name} value={s.name} className="bg-night">
              {s.name}
            </option>
          ))}
          <option value="Not sure yet" className="bg-night">
            Not sure yet
          </option>
        </select>
      </Field>
      <Field id="budget" label="Budget range" optional>
        <select id="budget" className="field" {...register("budget")}>
          <option value="">Choose a budget</option>
          {BUDGETS.map((b) => (
            <option key={b} value={b} className="bg-night">
              {b}
            </option>
          ))}
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field id="details" label="Project details" error={err("details")}>
          <textarea id="details" rows={3} className="field resize-y" placeholder="What are you building, who is it for, and when would you like to launch?" {...register("details")} {...aria("details")} />
        </Field>
      </div>
      {failed && (
        <p role="alert" className="text-sm text-[#ff6b7a] sm:col-span-2">
          We couldn&apos;t send that. Your details are still here: try again, or send them by{" "}
          <a className="underline" href={mailtoLink(`New project inquiry — ${failed.business}`, buildInquiryMessage(failed))}>
            email
          </a>{" "}
          or{" "}
          <a className="underline" href={whatsappLink(buildInquiryMessage(failed))} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
          .
        </p>
      )}
      <div className="flex justify-end sm:col-span-2">
        <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-60">
          {isSubmitting ? (
            <>
              Sending <Loader2 size={16} className="animate-spin" aria-hidden />
            </>
          ) : (
            <>
              {failed ? "Try again" : "Send inquiry"} <ArrowRight size={16} aria-hidden />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
