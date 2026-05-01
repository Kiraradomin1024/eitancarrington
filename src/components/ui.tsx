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
        "inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-medium transition-all",
        variant === "primary" &&
          "bg-foreground text-background hover:opacity-90 shadow-sm hover:shadow-md",
        variant === "ghost" &&
          "text-foreground hover:bg-accent-soft border border-border",
        variant === "danger" &&
          "bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20",
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
        "inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-medium transition-all",
        variant === "primary" &&
          "bg-foreground text-background hover:opacity-90 shadow-sm hover:shadow-md",
        variant === "ghost" &&
          "text-foreground hover:bg-accent-soft border border-border",
        variant === "gradient" &&
          "text-white bg-gradient-to-r from-accent via-accent-2 to-accent-3 hover:opacity-95 shadow-md hover:shadow-lg",
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
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  scribble?: string;
}) {
  return (
    <div className="mb-10 flex items-end justify-between gap-4 flex-wrap">
      <div>
        {scribble && (
          <p className="scribble mb-1">{scribble}</p>
        )}
        <h1 className="font-display text-4xl md:text-5xl text-foreground tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 text-muted text-sm max-w-2xl leading-relaxed">
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
    <div className="text-center py-20 text-muted card !bg-transparent border-dashed">
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
        "inline-block px-2.5 py-0.5 rounded-full text-xs border font-medium",
        tone === "neutral" && "bg-surface-2 border-border text-muted",
        tone === "accent" && "bg-accent-soft border-accent/30 text-accent",
        tone === "danger" && "bg-danger/10 border-danger/30 text-danger",
        tone === "ok" && "bg-success/10 border-success/30 text-success",
        tone === "warn" && "bg-warn/10 border-warn/30 text-warn"
      )}
    >
      {children}
    </span>
  );
}
