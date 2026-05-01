import { createClient } from "@/lib/supabase/server";
import { canContribute, getCurrentUserAndRole, isAdmin } from "@/lib/auth";
import { Badge, Card, Empty, PageTitle } from "@/components/ui";
import type { Issue } from "@/lib/types";
import { IssueForm, EditableIssueCard, IssueRowActions } from "./client-parts";
import { createIssue, deleteIssue, updateIssue, updateIssueStatus } from "./actions";

export default async function IssuesPage() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { role } = await getCurrentUserAndRole();
  const canAdd = canContribute(role);
  const canEdit = isAdmin(role);

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

      {canAdd && (
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
            <EditableIssueCard
              key={i.id}
              issue={i}
              canEdit={canEdit}
              updateAction={updateIssue.bind(null, i.id)}
              onUpdateStatus={updateIssueStatus}
              onDelete={deleteIssue}
            />
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
              <EditableIssueCard
                key={i.id}
                issue={i}
                canEdit={canEdit}
                updateAction={updateIssue.bind(null, i.id)}
                onUpdateStatus={updateIssueStatus}
                onDelete={deleteIssue}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
