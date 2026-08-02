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
        <div className="max-w-6xl mx-auto px-5 lg:px-6 min-h-[62px] min-[1140px]:min-h-[74px] py-2.5 flex items-center gap-2.5 min-[1140px]:gap-8">
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            {eitanPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={eitanPhotoUrl}
                alt="Eitan"
                className="w-[34px] h-[34px] min-[1140px]:w-[38px] min-[1140px]:h-[38px] object-cover border border-border-strong"
                data-no-lightbox=""
              />
            ) : (
              <span className="w-[34px] h-[34px] min-[1140px]:w-[38px] min-[1140px]:h-[38px] border border-border-strong flex items-center justify-center font-display text-lg text-accent">
                E
              </span>
            )}
            <span
              className="site-glitch font-display text-[15px] min-[1140px]:text-base text-foreground tracking-tight whitespace-nowrap"
              data-text="Journal d'Eitan"
            >
              Journal d&apos;Eitan
            </span>
          </Link>

          {/* Nav complète — à partir de 1140px */}
          <nav className="nav-scroll hidden min-[1140px]:flex items-center gap-5 flex-1 min-w-0 overflow-x-auto">
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

          {/* Espaceur uniquement quand la nav est masquée */}
          <div className="flex-1 min-[1140px]:hidden" />

          <div className="flex items-center gap-2.5 min-[1140px]:gap-3 text-sm shrink-0">
            {role === "admin" && (
              <Link
                href="/admin"
                className={cn(
                  "px-3 py-1.5 text-[10px] uppercase tracking-[0.2em] transition-colors hidden min-[1140px]:inline-block",
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
                  className="hidden min-[1140px]:flex items-center gap-2 text-muted hover:text-foreground"
                  title="Mon profil"
                >
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt=""
                      className="w-7 h-7 object-cover border border-border"
                    />
                  ) : (
                    <span className="w-7 h-7 border border-border text-accent text-xs flex items-center justify-center">
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
                <form action="/auth/signout" method="post" className="hidden min-[1140px]:block">
                  <button className="text-muted hover:text-accent text-[10px] uppercase tracking-[0.2em]">
                    Sortir
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                className="hidden min-[1140px]:inline-block px-3.5 py-2 border border-accent text-accent text-[10px] uppercase tracking-[0.2em] hover:bg-accent hover:text-background transition-colors whitespace-nowrap"
              >
                Connexion
              </Link>
            )}

            <ThemeToggle />

            {/* Burger — encadré 44px, trois filets */}
            <button
              className={cn(
                "min-[1140px]:hidden w-11 h-11 border flex flex-col items-center justify-center gap-1 transition-colors shrink-0",
                open ? "border-accent" : "border-border"
              )}
              onClick={() => setOpen((o) => !o)}
              aria-label="menu"
              aria-expanded={open}
            >
              <span
                className={cn(
                  "w-[18px] h-px transition-colors",
                  open ? "bg-accent" : "bg-muted"
                )}
              />
              <span
                className={cn(
                  "w-[18px] h-px transition-colors",
                  open ? "bg-accent" : "bg-muted"
                )}
              />
              <span
                className={cn(
                  "w-[18px] h-px transition-colors",
                  open ? "bg-accent" : "bg-muted"
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Tiroir mobile */}
      {open && (
        <div className="min-[1140px]:hidden bg-background border-t border-border nav-drawer max-h-[calc(100vh-62px)] overflow-y-auto">
          {links.map((l, i) => {
            const active =
              l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex justify-between items-center px-5 py-4 min-h-[52px] border-t border-border first:border-t-0"
              >
                <span
                  className={cn(
                    "font-display text-xl",
                    active ? "text-accent" : "text-foreground"
                  )}
                >
                  {l.label}
                </span>
                <span className="text-[10px] tracking-[0.2em] text-muted">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </Link>
            );
          })}

          {userId && (
            <Link
              href={`/u/${userId}`}
              onClick={() => setOpen(false)}
              className="flex justify-between items-center px-5 py-4 min-h-[52px] border-t border-border"
            >
              <span className="font-display text-xl text-foreground">
                Mon profil
              </span>
              <span className="text-[10px] tracking-[0.2em] text-muted">
                {String(links.length + 1).padStart(2, "0")}
              </span>
            </Link>
          )}
          {role === "admin" && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex justify-between items-center px-5 py-4 min-h-[52px] border-t border-border"
            >
              <span className="font-display text-xl text-accent">Admin</span>
              <span className="text-[10px] tracking-[0.2em] text-muted">
                {String(links.length + (userId ? 2 : 1)).padStart(2, "0")}
              </span>
            </Link>
          )}
          {userEmail ? (
            <form
              action="/auth/signout"
              method="post"
              className="border-t border-border"
            >
              <button className="w-full text-left px-5 py-4 min-h-[52px] font-display text-xl text-muted">
                Sortir
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="flex justify-between items-center px-5 py-4 min-h-[52px] border-t border-border"
            >
              <span className="font-display text-xl text-accent">Connexion</span>
            </Link>
          )}

          <div className="px-5 py-5 border-t border-border meta-label">
            Dossier n° EC-021
          </div>
        </div>
      )}
    </header>
  );
}
