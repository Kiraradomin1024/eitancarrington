import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import { getCurrentUserAndRole, isAdmin } from "@/lib/auth";
import { revertAuditEntry } from "@/app/admin/revert-action";
import Link from "next/link";

type AuditRow = {
  id: number;
  user_id: string | null;
  entity_type: string;
  entity_id: string;
  action: "insert" | "update" | "delete";
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  created_at: string;
};

const FIELD_LABELS: Record<string, string> = {
  name: "Nom",
  photo_url: "Photo",
  description: "Description",
  age: "Âge",
  family: "Famille",
  neighborhood: "Quartier",
  occupation: "Occupation",
  status: "Statut",
  tags: "Tags",
  phone_number: "Téléphone",
  twitch_username: "Twitch",
  mindmap_note: "Note mindmap",
  slug: "Slug",
  title: "Titre",
  summary: "Résumé",
  content: "Contenu",
  date: "Date",
  day_number: "N° de jour",
  vod_url: "VOD",
  type: "Type",
  intensity: "Intensité",
  source_npc_id: "Source",
  target_npc_id: "Cible",
  severity: "Gravité",
  bio: "Bio",
  background: "Background",
  traits: "Traits",
  found_at: "Trouvé le",
  is_main: "Principal",
};

// Fields we never want to show in diffs (noise / auto-managed)
const IGNORED_FIELDS = new Set([
  "id",
  "created_at",
  "updated_at",
  "created_by",
]);

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.round((now - then) / 1000);
  if (diffSec < 60) return "à l'instant";
  if (diffSec < 3600) return `il y a ${Math.floor(diffSec / 60)} min`;
  if (diffSec < 86400) return `il y a ${Math.floor(diffSec / 3600)} h`;
  if (diffSec < 86400 * 7) return `il y a ${Math.floor(diffSec / 86400)} j`;
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function previewValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") {
    const s = v.replace(/\s+/g, " ").trim();
    return s.length > 80 ? s.slice(0, 79) + "…" : s || "—";
  }
  if (Array.isArray(v)) return v.length === 0 ? "[]" : `[${v.join(", ")}]`;
  if (typeof v === "object") return JSON.stringify(v).slice(0, 80);
  return String(v);
}

function diffFields(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
): { field: string; from: unknown; to: unknown }[] {
  const out: { field: string; from: unknown; to: unknown }[] = [];
  const keys = new Set<string>([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);
  for (const k of keys) {
    if (IGNORED_FIELDS.has(k)) continue;
    const a = before?.[k];
    const b = after?.[k];
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    out.push({ field: k, from: a, to: b });
  }
  return out;
}

const ACTION_LABEL: Record<AuditRow["action"], string> = {
  insert: "création",
  update: "modification",
  delete: "suppression",
};

const ACTION_TONE: Record<AuditRow["action"], string> = {
  insert: "text-emerald-600 dark:text-emerald-400",
  update: "text-accent",
  delete: "text-danger",
};

export async function HistoryPanel({
  entityType,
  entityId,
  limit = 30,
  title = "Historique",
}: {
  entityType: string;
  entityId: string;
  limit?: number;
  title?: string;
}) {
  const supabase = await createClient();
  if (!supabase) return null;

  const { role } = await getCurrentUserAndRole();
  if (!isAdmin(role)) return null;
  const canRevert = true;

  const { data, error } = await supabase
    .from("audit_log")
    .select("id, user_id, entity_type, entity_id, action, before, after, created_at")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = (data ?? []) as AuditRow[];

  if (error) {
    return (
      <Card>
        <h2 className="font-display text-2xl text-accent title-rule m-0">
          {title}
        </h2>
        <p className="text-muted text-sm mt-2 italic">
          Historique indisponible (migration 013 non appliquée ?).
        </p>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <h2 className="font-display text-2xl text-accent title-rule m-0">
          {title}
        </h2>
        <p className="text-muted text-sm mt-2 italic">
          Aucune modification enregistrée pour le moment.
        </p>
      </Card>
    );
  }

  const userIds = Array.from(
    new Set(rows.map((r) => r.user_id).filter((x): x is string => !!x))
  );
  const profilesMap = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profs } = await supabase
      .from("public_profiles")
      .select("id, display_name")
      .in("id", userIds);
    for (const p of (profs ?? []) as {
      id: string;
      display_name: string | null;
    }[]) {
      profilesMap.set(p.id, p.display_name ?? "Anonyme");
    }
  }

  return (
    <Card>
      <details>
        <summary className="cursor-pointer select-none flex items-center gap-2">
          <h2 className="font-display text-2xl text-accent title-rule flex-1 m-0">
            {title} ({rows.length}
            {rows.length === limit ? "+" : ""})
          </h2>
          <span className="text-xs text-muted">▾ déplier</span>
        </summary>
        <ul className="mt-4 space-y-3">
          {rows.map((r) => {
            const author =
              (r.user_id && profilesMap.get(r.user_id)) ?? "Inconnu";
            const authorEl = r.user_id ? (
              <Link
                href={`/u/${r.user_id}`}
                className="text-foreground hover:text-accent"
              >
                par {author}
              </Link>
            ) : (
              <span className="text-foreground">par {author}</span>
            );
            const changes = r.action === "update" ? diffFields(r.before, r.after) : [];
            return (
              <li
                key={r.id}
                className="border-l-2 border-border pl-3 text-sm"
              >
                <div className="flex flex-wrap gap-x-2 items-baseline">
                  <span className={`font-medium ${ACTION_TONE[r.action]}`}>
                    {ACTION_LABEL[r.action]}
                  </span>
                  {authorEl}
                  <span className="text-muted text-xs">
                    · {formatRelativeTime(r.created_at)}
                  </span>
                  {canRevert && (
                    <form
                      action={async () => {
                        "use server";
                        await revertAuditEntry(r.id);
                      }}
                      className="ml-auto"
                    >
                      <button
                        type="submit"
                        className="text-xs text-muted hover:text-danger transition-colors"
                        title="Annuler cette modification"
                      >
                        ↶ annuler
                      </button>
                    </form>
                  )}
                </div>
                {r.action === "update" && changes.length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-xs text-muted">
                    {changes.map((c) => (
                      <li key={c.field}>
                        <span className="text-foreground/80">
                          {FIELD_LABELS[c.field] ?? c.field}
                        </span>
                        {": "}
                        <span className="line-through">
                          {previewValue(c.from)}
                        </span>
                        {" → "}
                        <span className="text-foreground">
                          {previewValue(c.to)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </details>
    </Card>
  );
}
