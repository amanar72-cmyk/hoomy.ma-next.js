-- ============================================================================
-- Webhook Meta Lead Ads direct — traçabilité publicitaire sur les leads
-- À VALIDER puis exécuter dans Supabase (SQL Editor) AVANT d'activer le
-- webhook /api/meta/leads-webhook (sinon l'insertion échouera : colonnes
-- inconnues). Non destructif et rejouable (IF NOT EXISTS).
--
-- meta_ad_id   : identifiant de la publicité Meta qui a généré le lead
-- meta_form_id : identifiant du formulaire Instant Form
-- (le leadgen_id anti-doublon existe déjà : colonne meta_lead_id UNIQUE)
-- ============================================================================

alter table public.leads
  add column if not exists meta_ad_id text,
  add column if not exists meta_form_id text;
