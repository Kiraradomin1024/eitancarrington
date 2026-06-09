"use client";

import { togglePin } from "./actions";

export function PinButton({
  dayId,
  pinned,
}: {
  dayId: string;
  pinned: boolean;
}) {
  return (
    <form
      action={async () => {
        await togglePin(dayId);
      }}
    >
      <button
        type="submit"
        title={pinned ? "Désépingler" : "Épingler"}
        className={
          "p-1.5 rounded-md border transition-all " +
          (pinned
            ? "bg-accent/20 border-accent/40 text-accent hover:bg-accent/30"
            : "bg-surface-2 border-border text-muted hover:text-accent hover:border-accent/40")
        }
        onClick={(e) => e.stopPropagation()}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
          <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
        </svg>
      </button>
    </form>
  );
}
