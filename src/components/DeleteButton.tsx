"use client";

import { Button } from "@/components/ui";
import { useState, useTransition } from "react";

export function DeleteButton({
  action,
  label = "Supprimer",
  confirm = "Tu es sûr ? Action irréversible.",
}: {
  action: () => Promise<void>;
  label?: string;
  confirm?: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end">
      <Button
        type="button"
        variant="danger"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(confirm)) return;
          startTransition(async () => {
            try {
              await action();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Erreur");
            }
          });
        }}
      >
        {pending ? "..." : label}
      </Button>
      {error && <span className="text-xs text-danger mt-1">{error}</span>}
    </div>
  );
}
