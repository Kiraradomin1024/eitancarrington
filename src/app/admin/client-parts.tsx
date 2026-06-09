"use client";

import { Badge, Card, Button } from "@/components/ui";
import type { Profile } from "@/lib/types";
import { useState, useTransition } from "react";

const TONE = {
  pending: "warn",
  contributor: "accent",
  admin: "ok",
} as const;

export function ProfileRow({
  profile,
  setRoleAction,
}: {
  profile: Profile;
  setRoleAction: (id: string, role: string) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Card className="!p-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="text-foreground">
            {profile.display_name ?? profile.email}
          </div>
          <div className="text-xs text-muted">{profile.email}</div>
        </div>
        <Badge tone={TONE[profile.role]}>{profile.role}</Badge>
        <div className="flex gap-1">
          {profile.role !== "contributor" && (
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() =>
                startTransition(() =>
                  setRoleAction(profile.id, "contributor")
                )
              }
            >
              → Contributeur
            </Button>
          )}
          {profile.role !== "admin" && (
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() =>
                startTransition(() => setRoleAction(profile.id, "admin"))
              }
            >
              → Admin
            </Button>
          )}
          {profile.role !== "pending" && (
            <Button
              variant="danger"
              disabled={pending}
              onClick={() =>
                startTransition(() => setRoleAction(profile.id, "pending"))
              }
            >
              Retirer
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export function BackupButton({
  exportAction,
}: {
  exportAction: () => Promise<{ filename: string; json: string }>;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setMsg(null);
    try {
      const { filename, json } = await exportAction();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMsg("Backup téléchargé ✓");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 4000);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={handleClick} disabled={busy}>
        {busy ? "Export en cours…" : "Télécharger un backup JSON"}
      </Button>
      {msg && <span className="text-xs text-muted">{msg}</span>}
    </div>
  );
}
