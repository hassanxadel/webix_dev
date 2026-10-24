import { useRef, useState, type CSSProperties } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Instagram, Mail, MessageCircle } from "lucide-react";
import { BUDGETS, buildInquiryMessage, inquirySchema, type Inquiry } from "@/lib/inquiry";
import { SERVICES } from "@/lib/webix-data";
import { SITE_CONFIG, mailtoLink, whatsappLink } from "@/lib/site-config";
import { useReveal } from "@/lib/reveal";

function Field({ id, label, error, optional, children }: { id: string; label: string; error?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-display text-[0.8rem] font-medium text-white/90">
        {label} {optional && <span className="font-normal text-mist/50">(optional)</span>}
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

export function Contact() {
  const ref = useRef<HTMLElement>(null);
  useReveal(ref);
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

  return (
    <section ref={ref} id="contact" tabIndex={-1} aria-label="Start a project" className="relative min-h-screen outline-none">
      <div className="mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-4 pb-10 pt-28 sm:px-6 lg:grid-cols-[1fr_minmax(0,34rem)] lg:px-8">
        <div className="max-w-md lg:self-end lg:pb-24">
          <p className="eyebrow" style={{ "--eyebrow-color": "#FF007F" } as CSSProperties} data-reveal>
            Start a project
          </p>
          <h2 className="mt-5 text-4xl font-bold leading-tight text-white sm:text-5xl" data-reveal>
            Have an idea? <span className="neon-text-sun">Let&apos;s build it.</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-mist" data-reveal>
            Tell us what you&apos;re planning, and let&apos;s explore how Webix can bring it to life.
          </p>
          <ul className="mt-8 space-y-3 text-sm" data-reveal>
            <li>
              <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 text-white/85 hover:text-white">
                <MessageCircle size={18} className="text-sun" aria-hidden /> WhatsApp <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
            <li>
              <a href={`mailto:${SITE_CONFIG.email}`} className="inline-flex items-center gap-3 text-white/85 hover:text-white">
                <Mail size={18} className="text-sun" aria-hidden /> {SITE_CONFIG.email}
              </a>
            </li>
            <li>
              <a href={SITE_CONFIG.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 text-white/85 hover:text-white">
                <Instagram size={18} className="text-sun" aria-hidden /> {SITE_CONFIG.instagramHandle} <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          </ul>
        </div>

        <div className="panel p-5 sm:p-8" style={{ "--panel-accent": "#FFDA24" } as CSSProperties} data-reveal>
          {sent ? (
            <div role="status" className="py-10 text-center">
              <p className="font-jp text-sm tracking-[0.4em] text-neon" lang="ja">
                出発
              </p>
              <h3 className="mt-4 text-2xl font-bold text-white">Your message is ready to send.</h3>
              <p className="mx-auto mt-3 max-w-sm text-mist">
                {sent === "whatsapp"
                  ? "We opened WhatsApp with your project details filled in — just press send."
                  : "We opened your email app with your project details filled in — just press send."}
              </p>
              <button type="button" onClick={() => setSent(null)} className="btn-ghost mt-7">
                Write another inquiry
              </button>
            </div>
          ) : (
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
                    <option key={s.name} value={s.name} className="bg-ink">
                      {s.name}
                    </option>
                  ))}
                  <option value="Not sure yet" className="bg-ink">
                    Not sure yet
                  </option>
                </select>
              </Field>
              <Field id="budget" label="Budget range" optional>
                <select id="budget" className="field" {...register("budget")}>
                  <option value="">Prefer not to say</option>
                  {BUDGETS.map((b) => (
                    <option key={b} value={b} className="bg-ink">
                      {b}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="sm:col-span-2">
                <Field id="details" label="Project details" error={err("details")}>
                  <textarea
                    id="details"
                    rows={4}
                    className="field resize-y"
                    placeholder="What are you building, who is it for, and when would you like to launch?"
                    {...register("details")}
                    {...aria("details")}
                  />
                </Field>
              </div>

              <fieldset className="sm:col-span-2">
                <legend className="mb-2 font-display text-[0.8rem] font-medium text-white/90">Preferred contact method</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(["whatsapp", "email"] as const).map((m) => (
                    <label
                      key={m}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-4 py-3 text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-sun ${
                        method === m ? "border-sun/60 bg-sun/[0.07] text-white" : "border-white/12 text-mist hover:border-white/25"
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
                <p className="text-xs text-mist/60">
                  Sending opens {method === "email" ? "your email app" : "WhatsApp"} with your message ready.
                </p>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  Send inquiry <ArrowRight size={18} aria-hidden />
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      <footer className="relative border-t border-white/10 bg-[rgb(5_6_12/0.85)]">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 py-8 text-sm text-mist/60 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img src="/brand/webix-badge.webp" alt="" width={28} height={28} className="h-7 w-7 rounded-full" />
            <span>© {new Date().getFullYear()} Webix. Websites, e-commerce &amp; digital experiences.</span>
          </div>
          <span className="font-jp text-xs tracking-[0.3em]" lang="ja">
            ウェビックス · 8番線
          </span>
        </div>
      </footer>
    </section>
  );
}
