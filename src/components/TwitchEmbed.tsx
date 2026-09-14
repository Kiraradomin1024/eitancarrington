"use client";

/**
 * Le billet agrafé : le lecteur Twitch s'ouvre dans la page, sur une feuille
 * marquée d'un trait rouge. Iframe simple, le `parent` suit le domaine courant.
 */
export function TwitchEmbed({
  channel,
  className = "",
  rotate = "1.2deg",
}: {
  channel: string;
  className?: string;
  rotate?: string;
}) {
  const parent =
    typeof window !== "undefined" ? window.location.hostname : "localhost";

  return (
    <div
      className={`sheet sheet--stapled sheet--flag px-3.5 pt-7 pb-3.5 ${className}`}
      style={{ transform: `rotate(${rotate})` }}
    >
      <div className="typed flex justify-between items-baseline gap-3">
        <a
          href={`https://www.twitch.tv/${channel}`}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-ink truncate"
        >
          il streame — {channel} ↗
        </a>
        <span className="text-pen-red shrink-0">GTA V · en direct</span>
      </div>
      <iframe
        src={`https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${parent}&muted=true`}
        className="w-full aspect-video mt-2 block"
        allowFullScreen
        allow="autoplay; encrypted-media"
        title={`Stream de ${channel}`}
      />
    </div>
  );
}
