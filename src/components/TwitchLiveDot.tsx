/**
 * Visual streaming indicator next to a Twitch username.
 *   isLive  = true  → pulsing GREEN dot
 *   isLive  = false → static  RED   dot
 */
export function TwitchLiveDot({
  isLive,
  size = 8,
}: {
  isLive: boolean;
  /** Kept for backwards-compat with earlier calls; the dot is always shown now. */
  showOffline?: boolean;
  size?: number;
}) {
  if (isLive) {
    return (
      <span
        className="relative inline-flex items-center justify-center"
        style={{ width: size, height: size }}
        title="En live sur Twitch"
        aria-label="En live"
      >
        <span
          className="absolute inset-0 rounded-full bg-green-500 opacity-75 animate-ping"
          style={{ width: size, height: size }}
        />
        <span
          className="relative rounded-full bg-green-500 ring-2 ring-green-500/30"
          style={{ width: size, height: size }}
        />
      </span>
    );
  }
  return (
    <span
      className="inline-block rounded-full bg-red-500 ring-1 ring-red-500/30"
      style={{ width: size, height: size }}
      title="Hors ligne"
      aria-label="Hors ligne"
    />
  );
}
