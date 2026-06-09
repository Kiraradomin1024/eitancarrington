export type ChatAlias = "Eitan" | "sc292";

/** Maps a real display name to its RP alias in the private channel. */
const ALIAS_MAP: Record<string, ChatAlias> = {
  ridzer69: "Eitan",
  kirara: "sc292",
};

export function chatAlias(displayName: string | null): ChatAlias | null {
  if (!displayName) return null;
  return ALIAS_MAP[displayName.trim().toLowerCase()] ?? null;
}

export function isChatParticipant(displayName: string | null): boolean {
  return chatAlias(displayName) !== null;
}
