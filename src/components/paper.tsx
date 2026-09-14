import { cn } from "@/lib/utils";
import type { NpcStatus } from "@/lib/types";
import { STATUS_INK } from "@/lib/ink";
import * as React from "react";

/* Les objets du cahier : feuilles tapées, clichés, tampons, écriture. */

export function Sheet({
  children,
  className,
  rotate,
  stapled = true,
  label,
  labelRight,
  style,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  rotate?: string;
  stapled?: boolean;
  /** Intitulé tapé en tête de feuille */
  label?: React.ReactNode;
  labelRight?: React.ReactNode;
  style?: React.CSSProperties;
  as?: "div" | "section" | "article" | "aside";
}) {
  return (
    <Tag
      className={cn(
        "sheet px-5 py-6 sm:px-7 sm:py-7",
        stapled && "sheet--stapled",
        className
      )}
      style={{ ...(rotate ? { transform: `rotate(${rotate})` } : null), ...style }}
    >
      {(label || labelRight) && (
        <>
          <div className="typed flex justify-between gap-4 flex-wrap">
            <span>{label}</span>
            {labelRight && <span>{labelRight}</span>}
          </div>
          <div className="sheet__rule" />
        </>
      )}
      {children}
    </Tag>
  );
}

export function Photo({
  src,
  alt,
  status,
  className,
  corner = 20,
  fourCorners = false,
  live = false,
  rotate,
  initial,
}: {
  src: string | null | undefined;
  alt: string;
  status?: NpcStatus;
  className?: string;
  corner?: number;
  fourCorners?: boolean;
  live?: boolean;
  rotate?: string;
  /** Lettre à la main quand il n'y a pas de cliché */
  initial?: string;
}) {
  return (
    <div
      className={cn(
        "photo",
        status === "dead" && "photo--dead",
        status === "missing" && "photo--missing",
        status === "gone" && "photo--gone",
        className
      )}
      style={
        {
          "--corner": `${corner}px`,
          ...(rotate ? { transform: `rotate(${rotate})` } : null),
        } as React.CSSProperties
      }
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} loading="lazy" />
      ) : (
        <span className="photo__empty" aria-hidden>
          {status === "unknown" ? "?" : initial ?? ""}
        </span>
      )}
      {fourCorners && (
        <>
          <span className="photo__corner-tr" aria-hidden />
          <span className="photo__corner-bl" aria-hidden />
        </>
      )}
      {status === "jailed" && <span className="photo__bars" aria-hidden />}
      {status === "dead" && <span className="photo__mourning" aria-hidden />}
      {live && <span className="photo__live">en direct</span>}
    </div>
  );
}

export function StatusStamp({
  status,
  size = "md",
  sub,
  rotate = "-2deg",
  className,
}: {
  status: NpcStatus;
  size?: "sm" | "md";
  sub?: React.ReactNode;
  rotate?: string;
  className?: string;
}) {
  const ink = STATUS_INK[status];
  return (
    <span
      className={cn(
        "stamp",
        ink.border === "double" && "stamp--double",
        ink.border === "dashed" && "stamp--dashed",
        ink.faint && "stamp--faint",
        size === "sm" && "stamp--sm",
        className
      )}
      style={{ color: ink.tone, transform: `rotate(${rotate})` }}
    >
      {ink.stamp}
      {sub && <span className="stamp__sub">{sub}</span>}
    </span>
  );
}

export function Stamp({
  children,
  tone = "var(--ink)",
  border = "solid",
  rotate = "-2deg",
  size = "md",
  sub,
  className,
}: {
  children: React.ReactNode;
  tone?: string;
  border?: "solid" | "double" | "dashed";
  rotate?: string;
  size?: "sm" | "md";
  sub?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "stamp",
        border === "double" && "stamp--double",
        border === "dashed" && "stamp--dashed",
        size === "sm" && "stamp--sm",
        className
      )}
      style={{ color: tone, transform: `rotate(${rotate})` }}
    >
      {children}
      {sub && <span className="stamp__sub">{sub}</span>}
    </span>
  );
}

/** Numéro de page, au crayon, en bas */
export function PageNumber({
  children,
  align = "left",
  className,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "hand text-[19px] text-ink-faint mt-10 hidden lg:block",
        align === "right" && "text-right",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Double page. En mobile, une seule page du cahier à la fois. */
export function Spread({
  left,
  right,
  className,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("spread", className)}>
      <div className="spread__left min-w-0">{left}</div>
      <div className="spread__right min-w-0">{right}</div>
    </div>
  );
}

/** Titre de page écrit à la main */
export function HandTitle({
  children,
  sub,
  className,
  size = "lg",
}: {
  children: React.ReactNode;
  sub?: React.ReactNode;
  className?: string;
  size?: "md" | "lg";
}) {
  return (
    <div className={className}>
      <h1
        className={cn(
          "hand font-semibold leading-[0.95]",
          size === "lg" ? "text-[40px] md:text-[48px]" : "text-[31px] md:text-[36px]"
        )}
      >
        {children}
      </h1>
      {sub && (
        <p className="hand text-[20px] md:text-[22px] leading-snug text-ink-soft mt-2 max-w-[44ch]">
          {sub}
        </p>
      )}
    </div>
  );
}
