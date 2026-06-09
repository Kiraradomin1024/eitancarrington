"use client";

import { useState } from "react";

export function CollapsibleChapter({
  children,
  defaultOpen = true,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="absolute top-0 right-0 p-1.5 rounded-md text-muted hover:text-foreground hover:bg-surface-2 transition-all"
        title={open ? "Replier" : "Déplier"}
        aria-label={open ? "Replier le chapitre" : "Déplier le chapitre"}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={
            "w-4 h-4 transition-transform duration-200 " +
            (open ? "rotate-0" : "-rotate-90")
          }
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div
        className={
          "transition-all duration-300 overflow-hidden " +
          (open ? "max-h-[10000px] opacity-100" : "max-h-0 opacity-0")
        }
      >
        {children}
      </div>
    </div>
  );
}
