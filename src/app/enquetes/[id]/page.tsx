import { createClient } from "@/lib/supabase/server";
import { canContribute, getCurrentUserAndRole } from "@/lib/auth";
import {
  Badge,
  Card,
  LinkButton,
  PageTitle,
} from "@/components/ui";
import type { Investigation, Npc, Clue } from "@/lib/types";
import { INVESTIGATION_STATUS_LABELS } from "@/lib/types";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DeleteButton } from "@/components/DeleteButton";
import {
  addClue,
  deleteClue,
  deleteInvestigation,
  linkNpc,
  unlinkNpc,
} from "../actions";
import { ClueForm, NpcLinker } from "./client-parts";
import { slugOrIdColumn } from "@/lib/slug";
import type { Metadata } from "next";
import { truncateForMeta } from "@/lib/seo";
import { HistoryPanel } from "@/components/HistoryPanel";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return {};
  const { data } = await supabase
    .from("investigations")
    .select("title, description, status")
    .eq(slugOrIdColumn(id), id)
    .maybeSingle();
  if (!data) return { title: "Enquête introuvable" };
  const inv = data as { title: string; description: string | null; status: string };
  const description =
    truncateForMeta(inv.description) ??
    `Enquête en cours dans le dossier d'Eitan Carrington (${
      INVESTIGATION_STATUS_LABELS[
        inv.status as keyof typeof INVESTIGATION_STATUS_LABELS
      ] ?? inv.status
    }).`;
  return {
    title: inv.title,
    description,
    openGraph: { title: inv.title, description, type: "article" },
    twitter: { card: "summary", title: inv.title, description },
  };
}



const STATUS_TONE = {
  open: "warn",
  in_progress: "accent",
  closed: "ok",
  cold: "neutral",
} as const;

const ROLE_LABELS: Record<string, string> = {
  investigator: "🔍 Enquêteur",
  suspect: "Suspect",
  witness: "Témoin",
  victim: "Victime",
  informant: "Informateur",
  accomplice: "Complice",
  other: "Autre",
};

const ROLE_TONE: Record<string, "neutral" | "accent" | "warn" | "danger" | "ok"> = {
  investigator: "accent",
  suspect: "danger",
  witness: "neutral",
  victim: "warn",
  informant: "ok",
  accomplice: "danger",
  other: "neutral",
};

export default async function InvDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return null;
  const { role } = await getCurrentUserAndRole();
  const canAdd = canContribute(role);
  const canEdit = canContribute(role);

  const { data: inv } = await supabase
    .from("investigations")
    .select("*")
    .eq(slugOrIdColumn(id), id)
    .maybeSingle();
  if (!inv) notFound();
  const i = inv as Investigation;
  const invKey = i.slug ?? i.id;

  const [{ data: clues }, { data: linkedRaw }, { data: npcs }] =
    await Promise.all([
      supabase
        .from("investigation_clues")
        .select("*")
        .eq("investigation_id", i.id)
        .order("found_at", { ascending: false }),
      supabase
        .from("investigation_npcs")
        .select("npc_id, role, npcs(id, name, slug)")
        .eq("investigation_id", i.id),
      supabase.from("npcs").select("id, name").order("name"),
    ]);
  const clueList = (clues ?? []) as Clue[];
  const linked =
    (linkedRaw as
      | {
          npc_id: string;
          role: string;
          npcs: { id: string; name: string; slug: string | null } | null;
        }[]
      | null) ?? [];
  const npcList = (npcs ?? []) as Pick<Npc, "id" | "name">[];

  const addClueBound = addClue.bind(null, i.id);
  const linkNpcBound = linkNpc.bind(null, i.id);

  return (
    <div>
      <PageTitle
        title={i.title}
        action={
          <div className="flex gap-2 items-center">
            <Badge tone={STATUS_TONE[i.status]}>
              {INVESTIGATION_STATUS_LABELS[i.status]}
            </Badge>
            {canEdit && (
              <>
                <LinkButton
                  href={`/enquetes/${invKey}/edit`}
                  variant="ghost"
                >
                  Modifier
                </LinkButton>
                <DeleteButton
                  action={async () => {
                    "use server";
                    await deleteInvestigation(i.id);
                  }}
                />
              </>
            )}
          </div>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <h2 className="font-serif text-2xl text-accent mb-3 title-rule">
              Contexte
            </h2>
            <p className="whitespace-pre-line text-foreground/90 leading-relaxed">
              {i.description ?? (
                <span className="text-muted italic">Aucun contexte.</span>
              )}
            </p>
          </Card>

          <Card>
            <h2 className="font-serif text-2xl text-accent mb-3 title-rule">
              Indices ({clueList.length})
            </h2>
            {canAdd && <ClueForm action={addClueBound} />}
            {clueList.length === 0 ? (
              <p className="text-muted italic mt-4">Aucun indice.</p>
            ) : (
              <ul className="space-y-2 mt-4">
                {clueList.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-start gap-3 p-3 rounded bg-surface-2 border border-border"
                  >
                    <span className="text-accent mt-1">▸</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-foreground/90">
                        {c.content}
                      </span>
                      {c.image_url && (
                        <a
                          href={c.image_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block mt-2"
                        >
                          <img
                            src={c.image_url}
                            alt="Photo indice"
                            className="max-h-40 rounded-lg border border-border object-cover hover:opacity-80 transition-opacity"
                          />
                        </a>
                      )}
                    </div>
                    {canEdit && (
                      <DeleteButton
                        action={async () => {
                          "use server";
                          await deleteClue(c.id, i.id);
                        }}
                        label="×"
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card>
            <h2 className="font-serif text-2xl text-accent mb-3 title-rule">
              Personnes liées
            </h2>
            {linked.length === 0 ? (
              <p className="text-muted italic">Personne pour le moment.</p>
            ) : (
              <ul className="space-y-2">
                {linked
                  .filter((l) => l.npcs)
                  .map((l) => (
                    <li
                      key={l.npc_id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Badge tone={ROLE_TONE[l.role] ?? "neutral"}>
                        {ROLE_LABELS[l.role] ?? l.role}
                      </Badge>
                      <Link
                        href={`/wiki/${l.npcs!.slug ?? l.npc_id}`}
                        className="text-foreground hover:text-foreground flex-1"
                      >
                        {l.npcs!.name}
                      </Link>
                      {canEdit && (
                        <DeleteButton
                          action={async () => {
                            "use server";
                            await unlinkNpc(i.id, l.npc_id);
                          }}
                          label="×"
                        />
                      )}
                    </li>
                  ))}
              </ul>
            )}
            {canAdd && npcList.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <NpcLinker npcs={npcList} action={linkNpcBound} />
              </div>
            )}
          </Card>
        </div>
      </div>

      <div className="mt-6">
        <HistoryPanel entityType="investigations" entityId={i.id} />
      </div>
    </div>
  );
}
