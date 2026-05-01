"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

const links = [
  { href: "/", label: "Eitan" },
  { href: "/wiki", label: "Wiki" },
  { href: "/journal", label: "Journal" },
  { href: "/relations", label: "Relations" },
  { href: "/mindmap", label: "Mindmap" },
  { href: "/enquetes", label: "Enquêtes" },
  { href: "/soucis", label: "Soucis" },
];

export function Nav({
  userEmail,
  role,
  displayName,
}: {
  userEmail: string | null;
  role: string | null;
  displayName: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50">
      <div className="bg-background/70 backdrop-blur-xl border-b border-border/60">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent via-accent-2 to-accent-3 flex items-center justify-center text-white font-display font-semibold shadow-md group-hover:shadow-lg transition-shadow">
              E
            </span>
            <span className="font-display text-lg text-foreground tracking-tight">
              Journal d'Eitan
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {links.map((l) => {
              const active =
                l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  data-active={active}
                  className={cn(
                    "tab px-3.5 py-1.5 rounded-full text-sm transition-all",
                    active
                      ? "text-foreground font-medium"
                      : "text-muted hover:text-foreground"
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3 text-sm">
            {role === "admin" && (
              <Link
                href="/admin"
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs transition-colors hidden sm:inline-block",
                  pathname.startsWith("/admin")
                    ? "bg-accent-soft text-accent"
                    : "text-muted hover:text-accent"
                )}
              >
                Admin
              </Link>
            )}
            {userEmail ? (
              <>
                <span className="hidden sm:flex items-center gap-2 text-muted">
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-accent-2 to-accent-3 text-white text-xs flex items-center justify-center">
                    {(displayName ?? userEmail)[0]?.toUpperCase()}
                  </span>
                  <span className="text-foreground/80">
                    {displayName ?? userEmail}
                  </span>
                  {role === "pending" && (
                    <span className="text-xs text-warn">en attente</span>
                  )}
                </span>
                <form action="/auth/signout" method="post">
                  <button className="text-muted hover:text-accent text-xs">
                    Sortir
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                className="px-4 py-1.5 rounded-full bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity"
              >
                Connexion
              </Link>
            )}
            <ThemeToggle />
            <button
              className="md:hidden text-foreground"
              onClick={() => setOpen((o) => !o)}
              aria-label="menu"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border/60">
          <nav className="px-6 py-3 flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-accent-soft text-sm"
              >
                {l.label}
              </Link>
            ))}
            {role === "admin" && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-accent-soft text-sm text-accent"
              >
                Admin
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
