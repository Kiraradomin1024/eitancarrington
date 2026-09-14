import { createClient } from "@/lib/supabase/server";
import { canContribute, getCurrentUserAndRole } from "@/lib/auth";
import { LinkButton } from "@/components/ui";
import type { Investigation, Npc, Clue, NpcStatus } from "@/lib/types";
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
import { PageNumber, Sheet, Spread, Stamp } from "@/components/paper";
import { INVESTIGATION_STAMP } from "../stamps";
import { tilt, typedDate } from "@/lib/ink";

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

const ROLE_WORD: Record<string, { word: string; tone: string }> = {
  investigator: { word: "enquête avec moi", tone: "var(--pen-violet)" },
  suspect: { word: "suspect", tone: "var(--pen-red)" },
  witness: { word: "témoin", tone: "var(--ink-soft)" },
  victim: { word: "victime", tone: "var(--pen-amber)" },
  informant: { word: "informateur", tone: "var(--pen-green)" },
  accomplice: { word: "complice", tone: "var(--pen-red)" },
  other: { word: "autre", tone: "var(--pen-dust)" },
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
        .select("npc_id, role, npcs(id, name, slug, status)")
        .eq("investigation_id", i.id),
      supabase.from("npcs").select("id, name").order("name"),
    ]);
  const clueList = (clues ?? []) as Clue[];
  const linked =
    (linkedRaw as
      | {
          npc_id: string;
          role: string;
          npcs: { id: string; name: string; slug: string | null; status: NpcStatus } | null;
        }[]
      | null) ?? [];
  const npcList = (npcs ?? []) as Pick<Npc, "id" | "name">[];

  const addClueBound = addClue.bind(null, i.id);
  const linkNpcBound = linkNpc.bind(null, i.id);
  const stamp = INVESTIGATION_STAMP[i.status];

  return (
    <div>
      {canEdit && (
        <div className="flex justify-end items-center gap-5 mb-6 flex-wrap">
          <LinkButton href={`/enquetes/${invKey}/edit`} variant="ghost">
            reprendre le dossier
          </LinkButton>
          <DeleteButton
            action={async () => {
              "use server";
              await deleteInvestigation(i.id);
            }}
            label="Brûler le dossier"
          />
        </div>
      )}

      <Spread
        left={
          <div>
            <span className="label-kraft">Dossier d&apos;enquête · ouvert le {typedDate(i.created_at, true)}</span>
            <div className="mt-5 flex items-start justify-between gap-4 flex-wrap">
              <h1 className="hand text-[40px] md:text-[48px] font-semibold leading-[0.95] max-w-[16ch]">
                {i.title}
              </h1>
              <Stamp tone={stamp.tone} border={stamp.border} rotate="-6deg" className="mt-2">
                {stamp.word}
              </Stamp>
            </div>

            <Sheet className="mt-8 !pt-8" rotate="-0.6deg" label="Ce qu'on sait">
              {i.description ? (
                <p className="print text-[16px] leading-[1.78] whitespace-pre-line">
                  {i.description}
                </p>
              ) : (
                <p className="hand text-[21px] text-ink-faint">rien de tapé.</p>
              )}
            </Sheet>

            <div className="mt-10">
              <div className="hand text-[26px] font-semibold hand-under inline-block">
                qui est dedans
              </div>
              {linked.filter((l) => l.npcs).length === 0 ? (
                <p className="hand text-[21px] text-ink-faint mt-2">
                  personne pour le moment.
                </p>
              ) : (
                <ul className="mt-3 hand text-[22px] leading-[34px]">
                  {linked
                    .filter((l) => l.npcs)
                    .map((l) => {
                      const r = ROLE_WORD[l.role] ?? ROLE_WORD.other;
                      const dead = l.npcs!.status === "dead";
                      return (
                        <li key={l.npc_id} className="flex items-baseline gap-2 flex-wrap">
                          <Link
                            href={`/wiki/${l.npcs!.slug ?? l.npc_id}`}
                            className={"hover:underline underline-offset-4 " + (dead ? "text-pen-black" : "")}
                          >
                            {l.npcs!.name}
                          </Link>
                          <span className="text-ink-faint">—</span>
                          <span style={{ color: r.tone, borderBottom: `2px solid ${r.tone}` }}>
                            {r.word}
                          </span>
                          {canEdit && (
                            <span className="ml-auto">
                              <DeleteButton
                                action={async () => {
                                  "use server";
                                  await unlinkNpc(i.id, l.npc_id);
                                }}
                                label="retirer"
                                quiet
                              />
                            </span>
                          )}
                        </li>
                      );
                    })}
                </ul>
              )}
              {canAdd && npcList.length > 0 && (
                <Sheet className="mt-6 max-w-[380px] !pt-8" rotate="0.8deg" label="Ajouter quelqu'un au dossier">
                  <NpcLinker npcs={npcList} action={linkNpcBound} />
                </Sheet>
              )}
            </div>

            <PageNumber>6</PageNumber>
          </div>
        }
        right={
          <div>
            <h2 className="hand text-[30px] md:text-[32px] font-semibold leading-none">
              les pièces au dossier
            </h2>
            <p className="typed mt-1.5">
              {clueList.length} {clueList.length > 1 ? "pièces" : "pièce"}
            </p>

            {canAdd && (
              <Sheet className="mt-5 !pt-8" rotate="-0.4deg" stapled>
                <ClueForm action={addClueBound} />
              </Sheet>
            )}

            {clueList.length === 0 ? (
              <p className="hand text-[21px] text-ink-faint mt-6">
                rien de trouvé pour l&apos;instant.
              </p>
            ) : (
              <ol className="mt-7 space-y-7">
                {clueList.map((c, idx) => (
                  <li key={c.id}>
                    <Sheet
                      className="!pt-8"
                      rotate={tilt(c.id, 1.2)}
                      label={`Pièce n° ${clueList.length - idx}`}
                      labelRight={c.found_at ? `trouvée le ${typedDate(c.found_at, true)}` : undefined}
                    >
                      <div className="flex flex-col sm:flex-row gap-4 items-start">
                        {c.image_url && (
                          <div className="polaroid w-[170px] shrink-0 !pb-3" style={{ transform: "rotate(-2deg)" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={c.image_url} alt="Cliché de la pièce" className="h-[120px]" />
                          </div>
                        )}
                        <p className="font-typed text-[14px] leading-[1.7] text-typed-strong flex-1 min-w-0 whitespace-pre-line">
                          {c.content}
                        </p>
                      </div>
                      {canEdit && (
                        <div className="mt-3 flex justify-end">
                          <DeleteButton
                            action={async () => {
                              "use server";
                              await deleteClue(c.id, i.id);
                            }}
                            label="retirer la pièce"
                            quiet
                          />
                        </div>
                      )}
                    </Sheet>
                  </li>
                ))}
              </ol>
            )}

            <div className="mt-10">
              <HistoryPanel entityType="investigations" entityId={i.id} />
            </div>

            <PageNumber align="right">7</PageNumber>
          </div>
        }
      />
    </div>
  );
}
