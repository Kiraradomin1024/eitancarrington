import { createClient } from "@/lib/supabase/server";
import { canContribute, getCurrentUserAndRole } from "@/lib/auth";
import {
  Badge,
  Empty,
  LinkButton,
  PageTitle,
} from "@/components/ui";
import type { Investigation } from "@/lib/types";
import { INVESTIGATION_STATUS_LABELS } from "@/lib/types";
import Link from "next/link";



const STATUS_TONE = {
  open: "warn",
  in_progress: "accent",
  closed: "ok",
  cold: "neutral",
} as const;

export default async function InvestigationsPage() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { role } = await getCurrentUserAndRole();
  const canEdit = canContribute(role);

  const { data } = await supabase
    .from("investigations")
    .select("*")
    .order("updated_at", { ascending: false });

  const items = (data ?? []) as Investigation[];

  return (
    <div>
      <PageTitle
        title="Enquêtes"
        subtitle="Tout ce sur quoi Eitan creuse en ce moment."
        action={
          canEdit && (
            <LinkButton href="/enquetes/new">Nouvelle enquête</LinkButton>
          )
        }
      />

      {items.length === 0 ? (
        <Empty>Aucune enquête en cours.</Empty>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((i) => (
            <Link
              key={i.id}
              href={`/enquetes/${i.id}`}
              className="card p-5 hover:border-accent/60 transition-colors block"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-serif text-2xl text-foreground">
                  {i.title}
                </h3>
                <Badge tone={STATUS_TONE[i.status]}>
                  {INVESTIGATION_STATUS_LABELS[i.status]}
                </Badge>
              </div>
              {i.description && (
                <p className="text-sm text-foreground/80 mt-2 line-clamp-3">
                  {i.description}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
