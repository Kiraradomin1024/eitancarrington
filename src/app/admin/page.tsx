import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndRole, isAdmin } from "@/lib/auth";
import { Card, LinkButton, PageTitle } from "@/components/ui";
import { redirect } from "next/navigation";
import type { Profile } from "@/lib/types";
import { ProfileRow, BackupButton } from "./client-parts";
import { setRole, exportFullBackup } from "./actions";
import { ActivityFeed } from "@/components/ActivityFeed";

const KIRARA_UID = "ced3f4f5-39c2-468a-a405-39d6785b8e96";

export default async function AdminPage() {
  const { role } = await getCurrentUserAndRole();
  if (!isAdmin(role)) redirect("/");
  const supabase = await createClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isKirara = user?.id === KIRARA_UID;

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

      <section className="mb-10">
        <h2 className="font-serif text-2xl text-foreground mb-3 title-rule">
          Admins ({admins.length})
        </h2>
        <div className="space-y-2">
          {admins.map((p) => (
            <ProfileRow key={p.id} profile={p} setRoleAction={setRole} />
          ))}
        </div>
      </section>

      {isKirara && (
        <section className="mb-10">
          <h2 className="font-serif text-2xl text-foreground mb-3 title-rule">
            Backup
          </h2>
          <p className="text-muted text-sm mb-4">
            Télécharge un instantané JSON de toutes les tables de contenu
            (profils, NPCs, relations, journal, enquêtes, soucis, layouts
            mindmap). Réservé à toi.
          </p>
          <BackupButton exportAction={exportFullBackup} />
        </section>
      )}

      <section>
        <h2 className="font-serif text-2xl text-foreground mb-3 title-rule">
          Activité récente
        </h2>
        <p className="text-muted text-sm mb-4">
          Les 50 dernières modifications sur le contenu, tous contributeurs
          confondus.
        </p>
        <ActivityFeed limit={50} />
      </section>
    </div>
  );
}
