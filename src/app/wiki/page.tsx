import { createClient } from "@/lib/supabase/server";
import { canContribute, getCurrentUserAndRole } from "@/lib/auth";
import { LinkButton } from "@/components/ui";
import type { Npc } from "@/lib/types";
import { getLiveStatuses } from "@/lib/twitch";
import { Photo, PageNumber } from "@/components/paper";
import Link from "next/link";
import { Album, type AlbumPerson } from "./album";

export default async function WikiPage() {
  const supabase = await createClient();
  if (!supabase) return null;
  const { role } = await getCurrentUserAndRole();
  const canEdit = canContribute(role);

  const [{ data }, { data: charData }] = await Promise.all([
    supabase.from("npcs").select("*").order("name", { ascending: true }),
    supabase
      .from("character")
      .select("photo_url, twitch_username")
      .eq("is_main", true)
      .maybeSingle(),
  ]);
  const npcs = (data ?? []) as Npc[];
  const eitan = charData as
    | { photo_url: string | null; twitch_username: string | null }
    | null;

  // Statut live de tous les pseudos Twitch (Eitan + personnages), en cache
  const liveSet = await getLiveStatuses([
    eitan?.twitch_username ?? null,
    ...npcs.map((n) => n.twitch_username),
  ]);
  const isLive = (u: string | null | undefined) =>
    u ? liveSet.has(u.toLowerCase()) : false;

  const people: AlbumPerson[] = npcs.map((n) => ({
    id: n.id,
    href: `/wiki/${n.slug ?? n.id}`,
    name: n.name,
    photo: n.photo_url,
    status: n.status,
    occupation: n.occupation,
    family: n.family,
    neighborhood: n.neighborhood,
    tags: n.tags ?? [],
    live: isLive(n.twitch_username),
  }));

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
        <Link href="/wiki/eitan" className="flex items-center gap-3 group">
          <Photo
            src={eitan?.photo_url}
            alt="Eitan Carrington"
            className="w-11 h-11 shrink-0"
            corner={9}
            initial="E"
          />
          <span className="hand text-[21px] text-ink-soft group-hover:text-ink leading-tight">
            et moi, sur ma propre fiche →
            {isLive(eitan?.twitch_username) && (
              <span className="text-pen-red"> (en direct)</span>
            )}
          </span>
        </Link>
        {canEdit && <LinkButton href="/wiki/new">coller une fiche</LinkButton>}
      </div>

      <Album people={people} />

      <PageNumber>12</PageNumber>
    </div>
  );
}
