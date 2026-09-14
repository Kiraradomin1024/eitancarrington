"use client";

import { useState } from "react";

/** Replier un chapitre : on ferme l'intercalaire */
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
        className="absolute top-1 right-0 hand text-[19px] text-ink-faint hover:text-ink underline underline-offset-4"
        aria-expanded={open}
        aria-label={open ? "Replier le chapitre" : "Déplier le chapitre"}
      >
        {open ? "replier" : "déplier"}
      </button>
      <div hidden={!open}>{children}</div>
    </div>
  );
}
