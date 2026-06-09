import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/wiki",
    "/wiki/eitan",
    "/journal",
    "/mindmap",
    "/enquetes",
    "/soucis",
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  const supabase = await createClient();
  if (!supabase) return staticRoutes;

  const [{ data: npcs }, { data: days }, { data: investigations }] =
    await Promise.all([
      supabase.from("npcs").select("id, slug, updated_at"),
      supabase.from("days").select("id, slug, updated_at"),
      supabase.from("investigations").select("id, slug, updated_at"),
    ]);

  const npcRoutes: MetadataRoute.Sitemap = (npcs ?? []).map(
    (n: { id: string; slug: string | null; updated_at: string }) => ({
      url: `${SITE_URL}/wiki/${n.slug ?? n.id}`,
      lastModified: new Date(n.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })
  );

  const dayRoutes: MetadataRoute.Sitemap = (days ?? []).map(
    (d: { id: string; slug: string | null; updated_at: string }) => ({
      url: `${SITE_URL}/journal/${d.slug ?? d.id}`,
      lastModified: new Date(d.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })
  );

  const investigationRoutes: MetadataRoute.Sitemap = (investigations ?? []).map(
    (i: { id: string; slug: string | null; updated_at: string }) => ({
      url: `${SITE_URL}/enquetes/${i.slug ?? i.id}`,
      lastModified: new Date(i.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })
  );

  return [...staticRoutes, ...npcRoutes, ...dayRoutes, ...investigationRoutes];
}
