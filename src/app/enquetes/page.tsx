import { createClient } from "@/lib/supabase/server";
import { canContribute, getCurrentUserAndRole } from "@/lib/auth";
import { Empty, LinkButton } from "@/components/ui";
import type { Investigation } from "@/lib/types";
import Link from "next/link";
import { HandTitle, PageNumber, Stamp } from "@/components/paper";
import { INVESTIGATION_STAMP } from "./stamps";
import { tilt, typedDate } from "@/lib/ink";

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
  const open = items.filter((i) => i.status === "open" || i.status === "in_progress");
  const rest = items.filter((i) => !(i.status === "open" || i.status === "in_progress"));

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <HandTitle sub="tout ce sur quoi je creuse. une chemise par affaire.">
          les enquêtes
        </HandTitle>
        {canEdit && <LinkButton href="/enquetes/new">Ouvrir un dossier</LinkButton>}
      </div>

      {items.length === 0 ? (
        <Empty>aucune enquête en cours.</Empty>
      ) : (
        <>
          <Folders items={open} />
          {rest.length > 0 && (
            <>
              <p className="hand text-[24px] font-semibold hand-under inline-block mt-16 mb-6">
                les dossiers rangés
              </p>
              <Folders items={rest} faded />
            </>
          )}
        </>
      )}

      <PageNumber>6</PageNumber>
    </div>
  );
}

function Folders({ items, faded = false }: { items: Investigation[]; faded?: boolean }) {
  if (items.length === 0) {
    return (
      <p className="hand text-[21px] text-ink-faint">rien d&apos;ouvert en ce moment.</p>
    );
  }
  return (
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-10">
      {items.map((i) => {
        const stamp = INVESTIGATION_STAMP[i.status];
        return (
          <Link
            key={i.id}
            href={`/enquetes/${i.slug ?? i.id}`}
            className={"block group relative " + (faded ? "opacity-75 hover:opacity-100" : "")}
            style={{ transform: `rotate(${tilt(i.id, 1.4)})` }}
          >
            {/* onglet de la chemise */}
            <span
              className="absolute -top-5 left-5 h-6 w-28"
              style={{ background: "var(--kraft)", boxShadow: "0 -2px 4px rgba(50,40,25,.15)" }}
              aria-hidden
            />
            <div
              className="relative px-5 pt-5 pb-12 min-h-[190px] transition-transform group-hover:-translate-y-1"
              style={{ background: "var(--kraft)", boxShadow: "var(--shadow-sheet)" }}
            >
              <div className="font-typed text-[10.5px] tracking-[0.14em] uppercase" style={{ color: "var(--kraft-ink)" }}>
                dossier · {typedDate(i.updated_at, true)}
              </div>
              <h3 className="hand text-[27px] font-semibold leading-[1.05] mt-2 pr-4" style={{ color: "var(--kraft-ink)" }}>
                {i.title}
              </h3>
              {i.description && (
                <p className="print text-[14px] leading-[1.55] mt-2 line-clamp-3" style={{ color: "var(--kraft-ink)", opacity: 0.85 }}>
                  {i.description}
                </p>
              )}
              <div className="absolute right-4 bottom-4">
                <Stamp tone={stamp.tone} border={stamp.border} rotate="-7deg" size="sm">
                  {stamp.word}
                </Stamp>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
