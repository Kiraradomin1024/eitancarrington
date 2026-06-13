/**
 * Twitch live-status helper.
 * Server-only (uses TWITCH_CLIENT_SECRET — never expose to the browser).
 *
 * Setup:
 *   1. Register an app on https://dev.twitch.tv/console
 *   2. Set TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET in .env.local
 *
 * Usage:
 *   const live = await getLiveStatuses(["pseudo1", "pseudo2"]);
 *   if (live.has("pseudo1")) { ... }
 */

import "server-only";
import { unstable_cache } from "next/cache";

/**
 * Twitch game_id for "Grand Theft Auto V". A streamer is considered "live for
 * the RP" only if they're broadcasting under this category.
 */
const GTA_V_GAME_ID = "32982";

/** How long a live-status snapshot is reused across ALL requests (seconds). */
const STATUS_REVALIDATE = 90;

type TokenCache = {
  token: string;
  expiresAt: number;
};

let tokenCache: TokenCache | null = null;

async function getAppToken(): Promise<string | null> {
  const id = process.env.TWITCH_CLIENT_ID;
  const secret = process.env.TWITCH_CLIENT_SECRET;
  if (!id || !secret) return null;

  // Reuse a still-valid cached token (with 30s safety margin)
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.token;
  }

  const res = await fetch("https://id.twitch.tv/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: id,
      client_secret: secret,
      grant_type: "client_credentials",
    }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return tokenCache.token;
}

/**
 * Network call to Twitch, wrapped in Next's persistent data cache so the
 * result is SHARED across every request/instance and only refreshed every
 * STATUS_REVALIDATE seconds — even under heavy traffic, Twitch is hit ~once
 * per cycle instead of once per page render.
 *
 * `key` is the sorted, comma-joined username list (also the cache key).
 * Returns an array (Set isn't serializable for the cache).
 */
const fetchLiveArray = unstable_cache(
  async (key: string): Promise<string[]> => {
    const cleaned = key ? key.split(",") : [];
    if (cleaned.length === 0) return [];

    const id = process.env.TWITCH_CLIENT_ID;
    const token = await getAppToken();
    if (!id || !token) return [];

    // Helix accepts up to 100 user_login per request — chunk if more
    const live: string[] = [];
    for (let i = 0; i < cleaned.length; i += 100) {
      const chunk = cleaned.slice(i, i + 100);
      const params = new URLSearchParams();
      for (const u of chunk) params.append("user_login", u);
      const res = await fetch(
        `https://api.twitch.tv/helix/streams?${params.toString()}`,
        {
          headers: { "Client-Id": id, Authorization: `Bearer ${token}` },
          cache: "no-store",
        }
      );
      if (!res.ok) continue;
      const data = (await res.json()) as {
        data: { user_login: string; game_id: string }[];
      };
      for (const s of data.data) {
        if (s.game_id === GTA_V_GAME_ID) {
          live.push(s.user_login.toLowerCase());
        }
      }
    }
    return live;
  },
  ["twitch-live-statuses"],
  { revalidate: STATUS_REVALIDATE, tags: ["twitch-live"] }
);

/**
 * Returns a Set of lowercase usernames currently streaming GTA V.
 * Cached across all requests for ~STATUS_REVALIDATE seconds.
 * Returns an empty Set if Twitch is not configured or fails.
 */
export async function getLiveStatuses(
  usernames: (string | null | undefined)[]
): Promise<Set<string>> {
  const cleaned = Array.from(
    new Set(
      usernames
        .filter((u): u is string => !!u && typeof u === "string")
        .map((u) => u.trim().toLowerCase())
        .filter(Boolean)
    )
  ).sort();
  if (cleaned.length === 0) return new Set();

  const live = await fetchLiveArray(cleaned.join(","));
  return new Set(live);
}
