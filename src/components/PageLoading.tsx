/** Pendant le chargement : on tourne les pages */
export function PageLoading({ what = "je feuillette le cahier" }: { what?: string }) {
  return (
    <div className="py-16" role="status" aria-live="polite">
      <p className="hand text-[28px] text-ink-faint leading-tight animate-pulse motion-reduce:animate-none">
        {what}…
      </p>
      <div className="mt-8 space-y-[22px] max-w-[520px]" aria-hidden>
        <div className="h-[2px] w-3/4" style={{ background: "var(--border)" }} />
        <div className="h-[2px] w-full" style={{ background: "var(--border)" }} />
        <div className="h-[2px] w-2/3" style={{ background: "var(--border)" }} />
      </div>
    </div>
  );
}
