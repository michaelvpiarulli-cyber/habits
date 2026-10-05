-- Tally — cover images on life notes (pages) and board cards
-- Run once in the Supabase SQL editor, or via apply_migration.
-- Safe to re-run. Same client-side JPEG data-URL pattern as books.cover_url.

alter table public.life_notes
  add column if not exists cover_url text;

alter table public.board_cards
  add column if not exists cover_url text;
