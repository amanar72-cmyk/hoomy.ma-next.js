-- ============================================================================
-- HOOMY.MA — Caractéristiques spécifiques par type de bien
-- À EXÉCUTER dans Supabase Dashboard → SQL Editor. Idempotent, non bloquant.
--
-- Tous les champs propres à un type (étage, surface terrain, titre juridique,
-- constructible, vitrine…) vivent dans cette colonne jsonb. La structure exacte
-- est portée côté code par src/lib/biens/caracteristiques.ts.
-- ============================================================================

alter table public.biens
  add column if not exists caracteristiques jsonb not null default '{}'::jsonb;
