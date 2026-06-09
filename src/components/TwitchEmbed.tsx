"use client";

/**
 * Embeds the Twitch live player using a plain iframe.
 * Automatically detects the current hostname for the required `parent` param.
 */
export function TwitchEmbed({ channel }: { channel: string }) {
  const parent =
    typeof window !== "undefined" ? window.location.hostname : "localhost";

  return (
    <div className="card card-glow overflow-hidden">
      <div className="flex items-center gap-3 px-5 pt-4 pb-3">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
        <span className="text-sm font-medium text-foreground">
          En direct maintenant
        </span>
        <a
          href={`https://www.twitch.tv/${channel}`}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs text-muted hover:text-accent transition"
        >
          Ouvrir sur Twitch ↗
        </a>
      </div>
      <iframe
        src={`https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${parent}&muted=true`}
        className="w-full aspect-video relative z-10"
        allowFullScreen
        allow="autoplay; encrypted-media"
      />
    </div>
  );
}
