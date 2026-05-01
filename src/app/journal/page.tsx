import { createClient } from "@/lib/supabase/server";
import { canContribute, getCurrentUserAndRole } from "@/lib/auth";
import { Empty, LinkButton, PageTitle } from "@/components/ui";
import type { Day } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import Link from "next/link";



export default async function JournalPage() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { role } = await getCurrentUserAndRole();
  const canEdit = canContribute(role);

  const { data } = await supabase
    .from("days")
    .select("*")
    .order("date", { ascending: false });
  const days = (data ?? []) as Day[];

  return (
    <div>
      <PageTitle
        title="Journal"
        subtitle="Récits jour par jour de la vie d'Eitan."
        action={
          canEdit && <LinkButton href="/journal/new">Nouveau jour</LinkButton>
        }
      />

      {days.length === 0 ? (
        <Empty>Aucun jour documenté pour l&apos;instant.</Empty>
      ) : (
        <div className="space-y-4">
          {days.map((d) => (
            <Link
              key={d.id}
              href={`/journal/${d.id}`}
              className="card p-5 hover:border-accent/60 transition-colors flex gap-6 items-start block"
            >
              <div className="text-center font-serif text-foreground shrink-0 w-24">
                {d.day_number ? (
                  <>
                    <div className="text-3xl leading-none text-gradient">
                      {d.day_number}
                    </div>
                    <div className="text-xs text-muted uppercase tracking-wider mt-1">
                      Jour
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-3xl leading-none">
                      {new Date(d.date).getDate()}
                    </div>
                    <div className="text-xs text-muted uppercase tracking-wider mt-1">
                      {new Date(d.date).toLocaleDateString("fr-FR", {
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-serif text-2xl text-foreground">
                  {d.title}
                </div>
                <div className="text-xs text-muted mt-0.5">
                  {d.day_number ? `Jour ${d.day_number} · ` : ""}{formatDate(d.date)}
                </div>
                {d.summary && (
                  <p className="text-foreground/80 mt-2 text-sm">
                    {d.summary}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
