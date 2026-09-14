import { createClient } from "@/lib/supabase/server";
import { canContribute, getCurrentUserAndRole, isAdmin } from "@/lib/auth";
import { Empty } from "@/components/ui";
import type { Issue } from "@/lib/types";
import { IssueForm, EditableIssueCard } from "./client-parts";
import { createIssue, deleteIssue, updateIssue, updateIssueStatus } from "./actions";
import { HandTitle, PageNumber } from "@/components/paper";

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
      <HandTitle
        className="mb-10"
        sub="la liste de ce qui ne va pas. je coche quand c'est réglé, je ne l'efface jamais."
      >
        les soucis
      </HandTitle>

      <div className={"grid gap-12 items-start " + (canAdd ? "lg:grid-cols-[1fr_380px]" : "max-w-[820px]")}>
        <div className="min-w-0">
          <p className="typed mb-2">en cours · {active.length}</p>
          {active.length === 0 ? (
            <Empty>rien à signaler. tout va bien… pour l&apos;instant.</Empty>
          ) : (
            <div>
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
              <p className="typed mt-12 mb-2">réglés · {resolved.length}</p>
              <div>
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

        {canAdd && (
          <div className="lg:sticky lg:top-6">
            <p className="hand text-[24px] font-semibold mb-3">noter un nouveau souci</p>
            <IssueForm action={createIssue} />
          </div>
        )}
      </div>

      <PageNumber>8</PageNumber>
    </div>
  );
}
