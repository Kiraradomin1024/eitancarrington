import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndRole, isAdmin } from "@/lib/auth";
import { Card, LinkButton, PageTitle } from "@/components/ui";
import { redirect } from "next/navigation";
import type { Profile } from "@/lib/types";
import { ProfileRow } from "./client-parts";
import { setRole } from "./actions";



export default async function AdminPage() {
  const { role } = await getCurrentUserAndRole();
  if (!isAdmin(role)) redirect("/");
  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  const profiles = (data ?? []) as Profile[];

  const pending = profiles.filter((p) => p.role === "pending");
  const contributors = profiles.filter((p) => p.role === "contributor");
  const admins = profiles.filter((p) => p.role === "admin");

  return (
    <div>
      <PageTitle
        title="Admin"
        subtitle="Gestion des contributeurs et de la fiche d'Eitan."
        action={
          <LinkButton href="/admin/character">Modifier la fiche</LinkButton>
        }
      />

      {pending.length > 0 && (
        <section className="mb-10">
          <h2 className="font-serif text-2xl text-warn mb-3 title-rule">
            En attente d&apos;approbation ({pending.length})
          </h2>
          <p className="text-muted text-sm mb-4">
            Ces personnes ont créé un compte. Approuve-les pour qu&apos;elles
            puissent contribuer, ou laisse-les en lecture seule.
          </p>
          <div className="space-y-2">
            {pending.map((p) => (
              <ProfileRow key={p.id} profile={p} setRoleAction={setRole} />
            ))}
          </div>
        </section>
      )}

      <section className="mb-10">
        <h2 className="font-serif text-2xl text-accent mb-3 title-rule">
          Contributeurs ({contributors.length})
        </h2>
        {contributors.length === 0 ? (
          <Card>
            <p className="text-muted italic">
              Aucun contributeur pour le moment.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {contributors.map((p) => (
              <ProfileRow key={p.id} profile={p} setRoleAction={setRole} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-serif text-2xl text-foreground mb-3 title-rule">
          Admins ({admins.length})
        </h2>
        <div className="space-y-2">
          {admins.map((p) => (
            <ProfileRow key={p.id} profile={p} setRoleAction={setRole} />
          ))}
        </div>
      </section>
    </div>
  );
}
