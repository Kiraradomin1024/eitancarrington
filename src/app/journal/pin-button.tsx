"use client";

import { togglePin } from "./actions";

/** Une punaise : épingler un jour en haut de son chapitre */
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
        aria-label={pinned ? "Désépingler ce jour" : "Épingler ce jour"}
        className={
          "hand text-[18px] leading-none underline underline-offset-4 " +
          (pinned ? "text-pen-red" : "text-ink-soft hover:text-ink")
        }
        onClick={(e) => e.stopPropagation()}
      >
        {pinned ? "désépingler" : "épingler"}
      </button>
    </form>
  );
}
