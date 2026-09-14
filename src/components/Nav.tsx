"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { openSearch } from "@/components/SearchPalette";

/* Les intercalaires du cahier. « Moi » couvre l'accueil et ma fiche. */
export const NOTEBOOK_TABS = [
  { href: "/", label: "Moi" },
  { href: "/journal", label: "Journal" },
  { href: "/wiki", label: "Les gens" },
  { href: "/enquetes", label: "Enquêtes" },
  { href: "/soucis", label: "Soucis" },
  { href: "/map", label: "Carte" },
  { href: "/mindmap", label: "Liens" },
  { href: "/quizz", label: "Quizz" },
];

export function isTabActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/" || pathname.startsWith("/wiki/eitan");
  if (href === "/wiki")
    return pathname.startsWith("/wiki") && !pathname.startsWith("/wiki/eitan");
  if (href === "/mindmap")
    return pathname.startsWith("/mindmap") || pathname.startsWith("/relations");
  return pathname.startsWith(href);
}

/** En-tête discret en haut de page : le nom du cahier, la recherche, la lampe, le compte */
export function NotebookHead({
  userId,
  userEmail,
  role,
  displayName,
}: {
  userId: string | null;
  userEmail: string | null;
  role: string | null;
  displayName: string | null;
}) {
  return (
    <div className="notebook__head">
      <Link href="/" className="shrink-0 min-w-0">
        <span
          className="site-glitch hand text-[23px] md:text-[25px] font-semibold text-ink leading-none whitespace-nowrap"
          data-text="Journal d'Eitan"
        >
          Journal d&apos;Eitan
        </span>
      </Link>

      <div className="flex-1" />

      <button
        type="button"
        onClick={openSearch}
        className="hidden lg:flex items-baseline gap-3 border-b-2 border-ink pb-0.5 w-[260px] text-left"
        title="Chercher dans le cahier (Ctrl K)"
      >
        <span className="hand text-[19px] text-ink-faint flex-1">
          je cherche…
        </span>
        <span className="font-stamp text-[10px] tracking-[0.18em] text-pen-dust">
          ⌘K
        </span>
      </button>

      <ThemeToggle />

      <div className="hidden sm:flex items-center gap-4 typed">
        {role === "admin" && (
          <Link href="/admin" className="hover:text-ink">
            admin
          </Link>
        )}
        {userEmail ? (
          <>
            <Link
              href={userId ? `/u/${userId}` : "/u/edit"}
              className="hover:text-ink max-w-[16ch] truncate"
              title="Mon profil"
            >
              {displayName ?? userEmail}
              {role === "pending" && (
                <span className="text-pen-amber"> · en attente</span>
              )}
            </Link>
            <form action="/auth/signout" method="post">
              <button className="typed hover:text-pen-red">sortir</button>
            </form>
          </>
        ) : (
          <Link href="/login" className="hover:text-ink">
            connexion
          </Link>
        )}
      </div>
    </div>
  );
}

/** Onglets verticaux sur la tranche droite (desktop) */
export function NotebookTabs() {
  const pathname = usePathname();
  return (
    <nav className="notebook__tabs" aria-label="Sections du cahier">
      <div className="notebook__tabs-inner">
        {NOTEBOOK_TABS.map((t) => {
          const active = isTabActive(t.href, pathname);
          return (
            <Link
              key={t.href}
              href={t.href}
              data-active={active}
              aria-current={active ? "page" : undefined}
              className="tab-divider"
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Onglets du bas, à portée de pouce (mobile) */
export function ThumbTabs() {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "Moi" },
    { href: "/journal", label: "Journal" },
    { href: "/wiki", label: "Les gens" },
    { href: "/map", label: "Carte" },
  ];
  return (
    <nav className="thumb-tabs" aria-label="Sections du cahier">
      {items.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          data-active={isTabActive(t.href, pathname)}
        >
          {t.label}
        </Link>
      ))}
      <button type="button" onClick={openSearch}>
        Chercher
      </button>
    </nav>
  );
}

/** Compat : l'ancien composant de navigation n'existe plus */
export const Nav = NotebookHead;
