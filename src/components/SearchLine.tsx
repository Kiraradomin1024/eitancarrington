"use client";

import { openSearch } from "@/components/SearchPalette";

/** « je cherche… » écrit sur une ligne de la page, ouvre la recherche */
export function SearchLine({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <div className="hand text-[20px] text-ink-faint mb-0.5">je cherche…</div>
      <button
        type="button"
        onClick={openSearch}
        className="w-full flex items-baseline gap-2.5 border-b-2 border-ink pb-1 text-left"
      >
        <span className="hand text-[24px] md:text-[26px] text-ink-faint flex-1">
          un nom, un jour, un lieu
        </span>
        <span className="font-stamp text-[10px] tracking-[0.18em] text-pen-dust">
          ⌘K
        </span>
      </button>
    </div>
  );
}
