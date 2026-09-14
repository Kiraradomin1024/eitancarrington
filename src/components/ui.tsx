import { cn } from "@/lib/utils";
import Link from "next/link";
import * as React from "react";

/* Primitives d'interface, repeintes aux couleurs du cahier :
   les boutons sont des tampons, les cartes des feuilles tapées. */

const STAMP_BTN =
  "inline-flex items-center justify-center gap-2 px-5 py-2.5 font-stamp text-[12px] font-medium uppercase tracking-[0.16em] border-2 transition-colors whitespace-nowrap";

export function Button({
  children,
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
}) {
  return (
    <button
      {...props}
      className={cn(
        variant !== "ghost" && STAMP_BTN,
        variant === "primary" &&
          "border-ink text-ink hover:bg-ink hover:text-paper",
        variant === "ghost" &&
          "hand text-[21px] leading-none text-ink-soft underline decoration-2 underline-offset-4 hover:text-ink px-1 py-1",
        variant === "danger" &&
          "border-pen-red text-pen-red hover:bg-pen-red hover:text-paper",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  children,
  className,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "ghost" | "gradient";
}) {
  return (
    <Link
      href={href}
      className={cn(
        variant !== "ghost" && STAMP_BTN,
        variant === "primary" &&
          "border-ink text-ink hover:bg-ink hover:text-paper",
        variant === "ghost" &&
          "hand text-[21px] leading-none text-ink-soft underline decoration-2 underline-offset-4 hover:text-ink px-1 py-1 whitespace-nowrap",
        variant === "gradient" &&
          "border-ink bg-ink text-paper hover:bg-transparent hover:text-ink",
        className
      )}
    >
      {children}
    </Link>
  );
}

/** Une feuille tapée posée sur la page */
export function Card({
  children,
  className,
  glow,
}: {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div className={cn("card p-6", glow && "card-glow pt-8", className)}>
      {children}
    </div>
  );
}

export function PageTitle({
  title,
  subtitle,
  action,
  scribble,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  /** Annotation au stylo rouge, légèrement penchée */
  scribble?: string;
  /** Étiquette kraft collée au-dessus du titre */
  eyebrow?: string;
}) {
  return (
    <div className="mb-10 flex items-end justify-between gap-x-6 gap-y-4 flex-wrap">
      <div className="min-w-0">
        {eyebrow && <span className="label-kraft mb-4">{eyebrow}</span>}
        <h1 className="hand font-semibold text-[40px] md:text-[50px] leading-[0.95] text-ink">
          {title}
        </h1>
        {subtitle && (
          <p className="hand mt-2 text-[20px] md:text-[23px] leading-snug text-ink-soft max-w-[46ch]">
            {subtitle}
          </p>
        )}
        {scribble && (
          <p className="scribble mt-2 text-pen-red">{scribble}</p>
        )}
      </div>
      {action && <div className="flex items-center gap-3 flex-wrap">{action}</div>}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="block">
      <span className="typed mb-1 block">{label}</span>
      {children}
      {hint && (
        <span className="hand text-[17px] text-ink-faint mt-1 block">{hint}</span>
      )}
    </div>
  );
}

/** Page blanche du cahier */
export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="py-16 md:py-24 max-w-[40ch]">
      <p className="hand text-[26px] text-ink-faint leading-tight">
        page blanche.
      </p>
      <p className="hand text-[21px] text-ink-soft mt-1 leading-snug">
        {children}
      </p>
    </div>
  );
}

/** Petit tampon */
export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "danger" | "ok" | "warn";
}) {
  return (
    <span
      className={cn(
        "stamp stamp--sm",
        tone === "neutral" && "text-pen-grey",
        tone === "accent" && "text-pen-violet",
        tone === "danger" && "text-pen-red stamp--double",
        tone === "ok" && "text-pen-green",
        tone === "warn" && "text-pen-amber"
      )}
      style={{ transform: "rotate(-1.5deg)" }}
    >
      {children}
    </span>
  );
}
