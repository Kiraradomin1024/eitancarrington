import { createClient } from "@/lib/supabase/server";
import { canContribute, getCurrentUserAndRole } from "@/lib/auth";
import { Badge, Card, Empty, PageTitle } from "@/components/ui";
import type { Issue, IssueSeverity, IssueStatus } from "@/lib/types";
import {
  ISSUE_SEVERITY_LABELS,
  ISSUE_STATUS_LABELS,
} from "@/lib/types";
import { IssueForm, IssueRowActions } from "./client-parts";
import { createIssue, deleteIssue, updateIssueStatus } from "./actions";



const SEVERITY_TONE: Record<IssueSeverity, "neutral" | "accent" | "warn" | "danger"> = {
  low: "neutral",
  medium: "accent",
  high: "warn",
  critical: "danger",
};

const STATUS_TONE: Record<IssueStatus, "warn" | "ok" | "neutral"> = {
  active: "warn",
  resolved: "ok",
  paused: "neutral",
};

export default async function IssuesPage() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { role } = await getCurrentUserAndRole();
  const canEdit = canContribute(role);

  const { data } = await supabase
    .from("issues")
    .select("*")
    .order("created_at", { ascending: false });
  const issues = (data ?? []) as Issue[];

  const active = issues.filter((i) => i.status !== "resolved");
  const resolved = issues.filter((i) => i.status === "resolved");

  return (
    <div>
      <PageTitle
        title="Soucis"
        subtitle="Les problèmes, dilemmes et arcs narratifs en cours."
      />

      {canEdit && (
        <div className="mb-8">
          <h2 className="font-serif text-xl text-accent mb-3">
            Ajouter un souci
          </h2>
          <IssueForm action={createIssue} />
        </div>
      )}

      <h2 className="font-serif text-2xl text-accent mb-3 title-rule">
        En cours ({active.length})
      </h2>
      {active.length === 0 ? (
        <Empty>Rien à signaler. Tout va bien… pour l&apos;instant.</Empty>
      ) : (
        <div className="space-y-3 mb-10">
          {active.map((i) => (
            <Card key={i.id} className="!p-5">
              <div className="flex items-start gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-serif text-xl text-foreground">
                      {i.title}
                    </h3>
                    <Badge tone={SEVERITY_TONE[i.severity]}>
                      {ISSUE_SEVERITY_LABELS[i.severity]}
                    </Badge>
                    <Badge tone={STATUS_TONE[i.status]}>
                      {ISSUE_STATUS_LABELS[i.status]}
                    </Badge>
                  </div>
                  {i.description && (
                    <p className="text-foreground/80 text-sm mt-2 whitespace-pre-line">
                      {i.description}
                    </p>
                  )}
                </div>
                {canEdit && (
                  <IssueRowActions
                    id={i.id}
                    status={i.status}
                    onUpdateStatus={updateIssueStatus}
                    onDelete={deleteIssue}
                  />
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <>
          <h2 className="font-serif text-2xl text-muted mb-3 title-rule">
            Résolus ({resolved.length})
          </h2>
          <div className="space-y-2 opacity-60">
            {resolved.map((i) => (
              <Card key={i.id} className="!p-3">
                <div className="flex items-center gap-2">
                  <span className="line-through text-muted">{i.title}</span>
                  <Badge tone="ok">résolu</Badge>
                  {canEdit && (
                    <div className="ml-auto">
                      <IssueRowActions
                        id={i.id}
                        status={i.status}
                        onUpdateStatus={updateIssueStatus}
                        onDelete={deleteIssue}
                      />
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
