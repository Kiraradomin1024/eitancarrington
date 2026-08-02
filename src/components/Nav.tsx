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
  { href: "/mindmap", label: "Mindmap" },
  { href: "/map", label: "Carte" },
  { href: "/enquetes", label: "Enquêtes" },
  { href: "/soucis", label: "Soucis" },
  { href: "/quizz", label: "Quizz" },
];

export function Nav({
  userId,
  userEmail,
  role,
  displayName,
  avatarUrl,
  eitanPhotoUrl,
}: {
  userId: string | null;
  userEmail: string | null;
  role: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  eitanPhotoUrl: string | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50">
      <div className="bg-background border-b border-border">
        <div className="max-w-6xl mx-auto px-6 min-h-[74px] py-2.5 flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3.5 shrink-0 group">
            {eitanPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={eitanPhotoUrl}
                alt="Eitan"
                className="w-[38px] h-[38px] object-cover border border-border-strong"
                data-no-lightbox=""
              />
            ) : (
              <span className="w-[38px] h-[38px] border border-border-strong flex items-center justify-center font-display text-lg text-accent">
                E
              </span>
            )}
            <span
              className="site-glitch font-display text-base text-foreground tracking-tight whitespace-nowrap"
              data-text="Journal d'Eitan"
            >
              Journal d&apos;Eitan
            </span>
          </Link>

          <nav className="nav-scroll hidden md:flex items-center gap-6 flex-1 min-w-0 overflow-x-auto">
            {links.map((l) => {
              const active =
                l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  data-active={active}
                  className={cn(
                    "tab py-4 whitespace-nowrap transition-colors",
                    active ? "text-accent" : "text-muted hover:text-foreground"
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
                  "px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] transition-colors hidden sm:inline-block",
                  pathname.startsWith("/admin")
                    ? "text-accent"
                    : "text-muted hover:text-accent"
                )}
              >
                Admin
              </Link>
            )}
            {userEmail ? (
              <>
                <Link
                  href={userId ? `/u/${userId}` : "/u/edit"}
                  className="hidden sm:flex items-center gap-2 text-muted hover:text-foreground"
                  title="Mon profil"
                >
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover border border-border"
                    />
                  ) : (
                    <span className="w-7 h-7 rounded-full bg-gradient-to-br from-accent-2 to-accent-3 text-white text-xs flex items-center justify-center">
                      {(displayName ?? userEmail)[0]?.toUpperCase()}
                    </span>
                  )}
                  <span className="text-foreground/80">
                    {displayName ?? userEmail}
                  </span>
                  {role === "pending" && (
                    <span className="text-xs text-warn">en attente</span>
                  )}
                </Link>
                <form action="/auth/signout" method="post">
                  <button className="text-muted hover:text-accent text-xs">
                    Sortir
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 border border-accent text-accent text-[10px] uppercase tracking-[0.2em] hover:bg-accent hover:text-background transition-colors"
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
        <div className="md:hidden bg-background border-b border-border">
          <nav className="px-6 py-3 flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-none hover:bg-accent-soft text-sm"
              >
                {l.label}
              </Link>
            ))}
            {userId && (
              <Link
                href={`/u/${userId}`}
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-none hover:bg-accent-soft text-sm"
              >
                Mon profil
              </Link>
            )}
            {role === "admin" && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded-none hover:bg-accent-soft text-sm text-accent"
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
