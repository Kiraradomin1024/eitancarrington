-- Add an RP phone number to NPCs.
alter table public.npcs
  add column if not exists phone_number text;
