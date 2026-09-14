"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SearchEntry } from "@/app/api/search-index/route";

const OPEN_EVENT = "cahier:open-search";

/** Ouvre la recherche depuis n'importe quel composant client */
export function openSearch() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const PAGES: { label: string; href: string; note: string }[] = [
  { label: "Moi", href: "/", note: "l'accueil du cahier" },
  { label: "Journal", href: "/journal", note: "jour après jour" },
  { label: "Les gens", href: "/wiki", note: "l'album" },
  { label: "Enquêtes", href: "/enquetes", note: "ce que je creuse" },
  { label: "Soucis", href: "/soucis", note: "ce qui ne va pas" },
  { label: "Carte", href: "/map", note: "Los Santos, ce que j'en connais" },
  { label: "Liens", href: "/mindmap", note: "comment tout se tient" },
  { label: "Relations", href: "/relations", note: "la liste, au propre" },
  { label: "Quizz", href: "/quizz", note: "combien tu sais ?" },
];

export function SearchPalette({
  userId,
  isAdmin,
  isLoggedIn,
}: {
  userId: string | null;
  isAdmin: boolean;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [entries, setEntries] = useState<SearchEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const loading = useRef(false);

  const load = useCallback(async () => {
    if (entries || loading.current) return;
    loading.current = true;
    try {
      const res = await fetch("/api/search-index");
      const json = (await res.json()) as { entries: SearchEntry[] };
      setEntries(json.entries ?? []);
    } catch {
      setFailed(true);
    } finally {
      loading.current = false;
    }
  }, [entries]);

  const show = useCallback(() => {
    setOpen(true);
    setCursor(0);
    load();
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => {
          if (!o) load();
          return !o;
        });
      }
    };
    window.addEventListener(OPEN_EVENT, show);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_EVENT, show);
      window.removeEventListener("keydown", onKey);
    };
  }, [show, load]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 20);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const results = useMemo(() => {
    const needle = norm(q.trim());
    if (!needle || !entries) return [];
    const scored: { e: SearchEntry; score: number }[] = [];
    for (const e of entries) {
      const label = norm(e.label);
      const hay = `${label} ${norm(e.kind)} ${norm(e.extra ?? "")} ${norm(e.meta)}`;
      const at = label.indexOf(needle);
      if (at === 0) scored.push({ e, score: 0 });
      else if (at > 0) scored.push({ e, score: 1 });
      else if (hay.includes(needle)) scored.push({ e, score: 2 });
    }
    return scored
      .sort((a, b) => a.score - b.score)
      .slice(0, 9)
      .map((s) => s.e);
  }, [q, entries]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQ("");
      router.push(href);
    },
    [router]
  );

  if (!open) return null;

  const needle = q.trim();
  const list = needle ? results : [];

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!list.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => (c + 1) % list.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (c - 1 + list.length) % list.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = list[Math.min(cursor, list.length - 1)];
      if (pick) go(pick.href);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[1300] flex items-start justify-center px-3 pt-[9vh] sm:pt-[12vh]"
      style={{ background: "rgba(20, 16, 10, 0.55)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Chercher dans le cahier"
      data-no-lightbox=""
    >
      <div className="sheet sheet--stapled palette-sheet w-full max-w-[620px] px-5 pt-8 pb-6 sm:px-8 max-h-[78vh] overflow-y-auto">
        <div className="typed flex justify-between">
          <span>chercher dans le cahier</span>
          <button
            type="button"
            className="typed hover:text-pen-red"
            onClick={() => setOpen(false)}
          >
            fermer · échap
          </button>
        </div>
        <div className="sheet__rule" />

        <div className="hand-line">
          <span className="hand-line__lead">je cherche…</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setCursor(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="un nom, un jour, un lieu"
            aria-label="Chercher"
            autoComplete="off"
            spellCheck={false}
          />
          <span className="font-stamp text-[10px] tracking-[0.18em] text-pen-dust hidden sm:inline">
            ⌘K
          </span>
        </div>

        <div className="mt-4 min-h-[64px]">
          {needle ? (
            entries === null && !failed ? (
              <p className="hand text-[21px] text-ink-faint">je feuillette…</p>
            ) : list.length === 0 ? (
              <p className="hand text-[21px] text-ink-faint">
                rien de noté là-dessus. page blanche.
              </p>
            ) : (
              <ul>
                {list.map((r, i) => (
                  <li key={`${r.kind}-${r.href}-${i}`}>
                    <button
                      type="button"
                      onMouseEnter={() => setCursor(i)}
                      onClick={() => go(r.href)}
                      className={
                        "w-full flex items-baseline gap-3 text-left py-1 px-1 -mx-1 " +
                        (i === cursor ? "bg-surface-2" : "")
                      }
                    >
                      <span className="font-stamp text-[9px] tracking-[0.14em] uppercase text-pen-dust w-[62px] shrink-0">
                        {r.kind}
                      </span>
                      <span className="hand text-[21px] leading-[29px] flex-1 min-w-0 truncate">
                        {r.label}
                      </span>
                      <span
                        className="font-stamp text-[9px] tracking-[0.12em] uppercase shrink-0"
                        style={{ color: r.tone }}
                      >
                        {r.meta}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <>
              <p className="typed mb-2">les pages du cahier</p>
              <ul className="grid sm:grid-cols-2 gap-x-6">
                {PAGES.map((p) => (
                  <li key={p.href}>
                    <button
                      type="button"
                      onClick={() => go(p.href)}
                      className="w-full text-left flex items-baseline gap-2 py-0.5"
                    >
                      <span className="hand text-[22px] font-semibold">{p.label}</span>
                      <span className="hand text-[17px] text-ink-faint truncate">
                        {p.note}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="sheet__rule mt-4" />
              <div className="flex flex-wrap gap-x-5 gap-y-1 typed">
                {isLoggedIn ? (
                  <>
                    <button type="button" className="typed hover:text-ink" onClick={() => go(userId ? `/u/${userId}` : "/u/edit")}>
                      mon profil
                    </button>
                    {isAdmin && (
                      <button type="button" className="typed hover:text-ink" onClick={() => go("/admin")}>
                        admin
                      </button>
                    )}
                    <form action="/auth/signout" method="post">
                      <button className="typed hover:text-pen-red">sortir</button>
                    </form>
                  </>
                ) : (
                  <button type="button" className="typed hover:text-ink" onClick={() => go("/login")}>
                    connexion
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
