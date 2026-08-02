import { cn } from "@/lib/utils";
import Link from "next/link";
import * as React from "react";

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
        "inline-flex items-center justify-center px-6 py-3 text-[11px] uppercase tracking-[0.22em] transition-colors border",
        variant === "primary" &&
          "border-accent text-accent hover:bg-accent hover:text-background",
        variant === "ghost" &&
          "border-border text-muted hover:border-accent/60 hover:text-accent",
        variant === "danger" &&
          "border-danger/50 text-danger hover:bg-danger hover:text-background",
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
        "inline-flex items-center justify-center px-6 py-3 text-[11px] uppercase tracking-[0.22em] transition-colors border",
        variant === "primary" &&
          "border-accent text-accent hover:bg-accent hover:text-background",
        variant === "ghost" &&
          "border-border text-muted hover:border-accent/60 hover:text-accent",
        variant === "gradient" &&
          "border-accent bg-accent text-background hover:bg-accent-2 hover:border-accent-2",
        className
      )}
    >
      {children}
    </Link>
  );
}

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
    <div
      className={cn(
        "card p-6",
        glow && "card-glow",
        className
      )}
    >
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
  scribble?: string;
  /** Petit intitulé de section en capitales dorées, ex. "Section II · Registre" */
  eyebrow?: string;
}) {
  return (
    <div className="mb-12 flex items-end justify-between gap-6 flex-wrap">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
        {scribble && !eyebrow && <p className="scribble mb-2">{scribble}</p>}
        <h1 className="font-display font-light text-4xl md:text-6xl text-foreground tracking-tight leading-[1.02]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-5 text-muted text-base max-w-[56ch] leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {action}
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
      <span className="text-xs uppercase tracking-wider text-muted mb-1.5 block font-medium">
        {label}
      </span>
      {children}
      {hint && <span className="text-xs text-muted mt-1 block">{hint}</span>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center py-24 text-muted border border-border">
      <p className="font-hand text-2xl text-accent mb-2">vide pour l&apos;instant</p>
      <p className="text-sm">{children}</p>
    </div>
  );
}

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
        "inline-block px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] border",
        tone === "neutral" && "border-border text-muted",
        tone === "accent" && "border-accent/50 text-accent",
        tone === "danger" && "border-danger/50 text-danger",
        tone === "ok" && "border-success/50 text-success",
        tone === "warn" && "border-warn/50 text-warn"
      )}
    >
      {children}
    </span>
  );
}
