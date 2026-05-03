import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui";
import Link from "next/link";
import { getCurrentUserAndRole, isAdmin } from "@/lib/auth";
import { revertAuditEntry } from "@/app/admin/revert-action";

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

const ENTITY_LABELS: Record<string, string> = {
  npcs: "Personnage",
  days: "Session",
  investigations: "Enquête",
  investigation_clues: "Indice",
  relations: "Relation",
  issues: "Souci",
  character: "Eitan",
};

const ACTION_LABEL: Record<AuditRow["action"], string> = {
  insert: "créé",
  update: "modifié",
  delete: "supprimé",
};

const ACTION_TONE: Record<AuditRow["action"], string> = {
  insert: "text-emerald-600 dark:text-emerald-400",
  update: "text-accent",
  delete: "text-danger",
};

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

/**
 * Resolve a link to the affected entity. Investigation_clues link to their
 * parent investigation. Relations and character don't have detail pages.
 */
function entityLink(row: AuditRow): { href: string; label: string } | null {
  const snap = (row.after ?? row.before) as Record<string, unknown> | null;
  if (!snap) return null;
  const slug = typeof snap.slug === "string" ? snap.slug : null;
  const idKey = slug ?? row.entity_id;

  switch (row.entity_type) {
    case "npcs":
      return {
        href: `/wiki/${idKey}`,
        label: typeof snap.name === "string" ? snap.name : row.entity_id,
      };
    case "days":
      return {
        href: `/journal/${idKey}`,
        label: typeof snap.title === "string" ? snap.title : row.entity_id,
      };
    case "investigations":
      return {
        href: `/enquetes/${idKey}`,
        label: typeof snap.title === "string" ? snap.title : row.entity_id,
      };
    case "investigation_clues": {
      const invId =
        typeof snap.investigation_id === "string" ? snap.investigation_id : null;
      const content =
        typeof snap.content === "string" && snap.content.length > 60
          ? snap.content.slice(0, 60) + "…"
          : (snap.content as string | undefined) ?? "indice";
      return invId
        ? { href: `/enquetes/${invId}`, label: content }
        : { href: "/enquetes", label: content };
    }
    case "issues":
      return {
        href: "/soucis",
        label: typeof snap.title === "string" ? snap.title : row.entity_id,
      };
    case "character":
      return {
        href: "/wiki/eitan",
        label: typeof snap.name === "string" ? snap.name : "Eitan",
      };
    case "relations":
      return null;
    default:
      return null;
  }
}

export async function ActivityFeed({
  limit = 50,
  userId,
}: {
  limit?: number;
  userId?: string;
}) {
  const supabase = await createClient();
  if (!supabase) return null;

  const { role } = await getCurrentUserAndRole();
  const canRevert = isAdmin(role);

  let query = supabase
    .from("audit_log")
    .select("id, user_id, entity_type, entity_id, action, before, after, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (userId) query = query.eq("user_id", userId);
  const { data } = await query;

  const rows = (data ?? []) as AuditRow[];
  if (rows.length === 0) {
    return (
      <Card>
        <p className="text-muted italic">Aucune activité enregistrée.</p>
      </Card>
    );
  }

  const userIds = Array.from(
    new Set(rows.map((r) => r.user_id).filter((x): x is string => !!x))
  );
  const profilesMap = new Map<string, { name: string; avatar: string | null }>();
  if (userIds.length > 0) {
    const { data: profs } = await supabase
      .from("public_profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIds);
    for (const p of (profs ?? []) as {
      id: string;
      display_name: string | null;
      avatar_url: string | null;
    }[]) {
      profilesMap.set(p.id, {
        name: p.display_name ?? "Anonyme",
        avatar: p.avatar_url,
      });
    }
  }

  return (
    <Card>
      <ul className="space-y-2">
        {rows.map((r) => {
          const authorInfo = r.user_id ? profilesMap.get(r.user_id) : null;
          const authorName = authorInfo?.name ?? "Inconnu";
          const link = entityLink(r);
          const entityLabel = ENTITY_LABELS[r.entity_type] ?? r.entity_type;
          return (
            <li
              key={r.id}
              className="flex flex-wrap gap-x-2 items-baseline text-sm py-1.5 border-b border-border/40 last:border-0"
            >
              {r.user_id ? (
                <Link
                  href={`/u/${r.user_id}`}
                  className="text-foreground font-medium hover:text-accent inline-flex items-center gap-1.5"
                >
                  {authorInfo?.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={authorInfo.avatar}
                      alt=""
                      className="w-5 h-5 rounded-full object-cover border border-border"
                    />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-gradient-to-br from-accent-2 to-accent-3 text-white text-[10px] flex items-center justify-center">
                      {authorName[0]?.toUpperCase()}
                    </span>
                  )}
                  {authorName}
                </Link>
              ) : (
                <span className="text-muted">Inconnu</span>
              )}
              <span className="text-muted">a</span>
              <span className={`font-medium ${ACTION_TONE[r.action]}`}>
                {ACTION_LABEL[r.action]}
              </span>
              <span className="text-muted">
                {r.action === "delete" ? "le" : "le"} {entityLabel.toLowerCase()}
              </span>
              {link ? (
                <Link
                  href={link.href}
                  className="text-accent hover:underline truncate max-w-[20em]"
                >
                  {link.label}
                </Link>
              ) : (
                <span className="text-foreground/80 truncate max-w-[20em]">
                  {r.entity_id.slice(0, 8)}
                </span>
              )}
              <span className="text-muted text-xs ml-auto">
                {formatRelativeTime(r.created_at)}
              </span>
              {canRevert && (
                <form
                  action={async () => {
                    "use server";
                    await revertAuditEntry(r.id);
                  }}
                >
                  <button
                    type="submit"
                    className="text-xs text-muted hover:text-danger transition-colors ml-2"
                    title="Annuler cette modification"
                  >
                    ↶
                  </button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
