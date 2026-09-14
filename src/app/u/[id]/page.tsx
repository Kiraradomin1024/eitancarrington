import { createClient } from "@/lib/supabase/server";
import { Card, LinkButton, PageTitle } from "@/components/ui";
import { ActivityFeed } from "@/components/ActivityFeed";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return {};
  const { data } = await supabase
    .from("public_profiles")
    .select("display_name, bio")
    .eq("id", id)
    .maybeSingle();
  if (!data) return { title: "Profil introuvable" };
  const name = (data.display_name as string | null) ?? "Anonyme";
  const bio = (data.bio as string | null) ?? `Profil de ${name}.`;
  return { title: name, description: bio };
}

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("public_profiles")
    .select("id, display_name, avatar_url, bio")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();

  const profile = data as {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    bio: string | null;
  };
  const name = profile.display_name ?? "Anonyme";

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isSelf = user?.id === profile.id;

  return (
    <div>
      <PageTitle
        title={name}
        subtitle="une des mains qui tiennent ce cahier"
        action={
          isSelf && (
            <LinkButton href="/u/edit" variant="ghost">
              corriger mon profil
            </LinkButton>
          )
        }
      />

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={name}
                className="w-full aspect-square object-cover mb-4"
              />
            ) : (
              <div className="w-full aspect-square flex items-center justify-center hand text-7xl text-ink-faint mb-4" style={{ background: "var(--photo-empty)" }}>
                {name[0]?.toUpperCase()}
              </div>
            )}
            {profile.bio ? (
              <p className="text-sm text-foreground/90 whitespace-pre-line">
                {profile.bio}
              </p>
            ) : (
              <p className="hand text-[19px] text-ink-faint">
                pas de bio pour l&apos;instant.
              </p>
            )}
          </Card>
        </div>

        <div className="md:col-span-2 space-y-4">
          <h2 className="hand text-[28px] font-semibold text-ink mb-3 ">
            ce qu&apos;elle ou il a écrit dernièrement
          </h2>
          <ActivityFeed userId={profile.id} limit={50} />
        </div>
      </div>
    </div>
  );
}
