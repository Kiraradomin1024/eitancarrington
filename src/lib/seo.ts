/**
 * SEO helpers — site URL and metadata builders.
 *
 * Set NEXT_PUBLIC_SITE_URL in your env (e.g. https://eitan.example.com) so
 * canonical URLs and Open Graph cards point at the right place when the site
 * is shared on Discord, Twitter, etc.
 */

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

export const SITE_NAME = "Journal d'Eitan";

export function absoluteUrl(path: string): string {
  if (!path) return SITE_URL;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

/**
 * Trim long markdown/text down to a clean ~160-char description for meta tags.
 * Strips markdown markers and collapses whitespace.
 */
export function truncateForMeta(input: string | null | undefined, max = 160): string | undefined {
  if (!input) return undefined;
  const cleaned = input
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[*_~`#>]+/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= max) return cleaned;
  return cleaned.slice(0, max - 1).trimEnd() + "…";
}
