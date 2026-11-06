import type { ComponentProps } from "react";
import { Slot } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "secondary" | "ghost" | "icon";
  size?: "sm" | "md" | "lg";
  /** Disables it and shows a spinner (buttons only, not `asChild`). */
  loading?: boolean;
  /** Styles its one child (a link, a router Link, a Radix trigger) instead of rendering a <button>. */
  asChild?: boolean;
};

/** The one button on the site: a rounded Webix pill with an extruded edge (`.btn` in styles.css). */
export function Button({ variant = "primary", size = "md", loading = false, asChild = false, className = "", type = "button", disabled, children, ...rest }: ButtonProps) {
  const style = `btn btn-${variant} btn-${size} ${className}`;
  if (asChild)
    return (
      <Slot className={style} {...rest}>
        {children}
      </Slot>
    );
  return (
    <button type={type} disabled={disabled || loading} className={style} {...rest}>
      {children}
      {loading && <Loader2 size={16} className="animate-spin" aria-hidden />}
    </button>
  );
}
