import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Mail, MessageCircle } from "lucide-react";
import { BUDGETS, buildInquiryMessage, inquirySchema, type Inquiry } from "@/lib/inquiry";
import { SERVICES } from "@/lib/webix-data";
import { mailtoLink, whatsappLink } from "@/lib/site-config";

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

/** Project inquiry: validates, then opens WhatsApp or the visitor's email app with the message filled in. */
export function ContactForm() {
  const [sent, setSent] = useState<null | "whatsapp" | "email">(null);
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Inquiry>({
    resolver: zodResolver(inquirySchema),
    defaultValues: { method: "whatsapp", service: "", budget: "" } as Partial<Inquiry>,
  });
  const method = watch("method");

  const onSubmit = (v: Inquiry) => {
    const message = buildInquiryMessage(v);
    if (v.method === "whatsapp") window.open(whatsappLink(message), "_blank", "noopener");
    else window.location.href = mailtoLink(`New project inquiry — ${v.business}`, message);
    setSent(v.method);
    reset();
  };

  const err = (k: keyof Inquiry) => errors[k]?.message as string | undefined;
  const aria = (k: keyof Inquiry) => ({ "aria-invalid": !!errors[k], "aria-describedby": errors[k] ? `${k}-error` : undefined });

  if (sent)
    return (
      <div role="status" className="py-10 text-center">
        <p className="hud text-sun">All set</p>
        <h3 className="mt-4 text-2xl text-paper">Your message is ready to send.</h3>
        <p className="mx-auto mt-3 max-w-sm text-paper/65">
          {sent === "whatsapp" ? "We opened WhatsApp with your project details filled in — just press send." : "We opened your email app with your project details filled in — just press send."}
        </p>
        <button type="button" onClick={() => setSent(null)} className="btn-secondary mt-7">
          Write another inquiry
        </button>
      </div>
    );

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
      <Field id="name" label="Your name" error={err("name")}>
        <input id="name" className="field" autoComplete="name" {...register("name")} {...aria("name")} />
      </Field>
      <Field id="business" label="Business name" error={err("business")}>
        <input id="business" className="field" autoComplete="organization" {...register("business")} {...aria("business")} />
      </Field>
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
          <option value="">Prefer not to say</option>
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
      <fieldset className="sm:col-span-2">
        <legend className="hud mb-2 text-paper/75">Preferred contact method</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["whatsapp", "email"] as const).map((m) => (
            <label
              key={m}
              className={`flex cursor-pointer items-center gap-2.5 border px-4 py-3 text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-sun ${
                method === m ? "border-sun/70 bg-sun/[0.07] text-paper" : "border-paper/15 text-paper/65 hover:border-paper/30"
              }`}
            >
              <input type="radio" value={m} className="sr-only" {...register("method")} />
              {m === "whatsapp" ? <MessageCircle size={16} aria-hidden /> : <Mail size={16} aria-hidden />}
              {m === "whatsapp" ? "WhatsApp" : "Email"}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="sm:col-span-2">
        <Field id="reply" label={method === "email" ? "Your email" : "Your WhatsApp number"} error={err("reply")}>
          <input
            id="reply"
            className="field"
            type={method === "email" ? "email" : "tel"}
            autoComplete={method === "email" ? "email" : "tel"}
            placeholder={method === "email" ? "you@company.com" : "+20 100 000 0000"}
            {...register("reply")}
            {...aria("reply")}
          />
        </Field>
      </div>
      <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-paper/45">Sending opens {method === "email" ? "your email app" : "WhatsApp"} with your message ready.</p>
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          Send inquiry <ArrowRight size={16} aria-hidden />
        </button>
      </div>
    </form>
  );
}
