"use client";

import { Button } from "@/components/ui";
import { useState, useTransition } from "react";

export function DeleteButton({
  action,
  label = "Supprimer",
  confirm = "Tu es sûr ? Action irréversible.",
  quiet = false,
}: {
  action: () => Promise<void>;
  label?: string;
  confirm?: string;
  /** Un simple mot rayé au stylo rouge plutôt qu'un tampon */
  quiet?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Les anciens « × » deviennent un mot écrit à la main
  const isQuiet = quiet || label.trim().length <= 1;
  const text = isQuiet && label.trim().length <= 1 ? "rayer" : label;

  function run() {
    if (!window.confirm(confirm)) return;
    startTransition(async () => {
      try {
        await action();
      } catch (e) {
        if (e instanceof Error && e.message === "NEXT_REDIRECT") throw e;
        setError(e instanceof Error ? e.message : "Erreur");
      }
    });
  }

  return (
    <div className="flex flex-col items-end shrink-0">
      {isQuiet ? (
        <button
          type="button"
          disabled={pending}
          onClick={run}
          className="hand text-[18px] leading-none text-pen-red/80 hover:text-pen-red underline underline-offset-4 disabled:opacity-50"
        >
          {pending ? "…" : text}
        </button>
      ) : (
        <Button type="button" variant="danger" disabled={pending} onClick={run}>
          {pending ? "..." : label}
        </Button>
      )}
      {error && <span className="hand text-[16px] text-pen-red mt-1">{error}</span>}
    </div>
  );
}
