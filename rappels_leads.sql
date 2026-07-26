-- ═══════════════════════════════════════════════════════════════════════════
-- Rappels programmés sur les leads
-- ═══════════════════════════════════════════════════════════════════════════
-- Un client demande souvent à être rappelé à un moment précis. Jusqu'ici la
-- seule trace possible était le texte libre de notes_interne : rien
-- d'exploitable pour trier, alerter ou afficher dans un calendrier.
--
-- Aucune policy RLS à ajouter : la table leads est écrite exclusivement via
-- le client service_role, après vérification du rôle côté application
-- (admin/leads/actions.ts et pro/actions.ts). Voir admin_policies.sql.
--
-- Script idempotent : réexécutable sans effet de bord.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.leads
  -- Date ET heure du rappel (timestamptz : « rappeler à 14h » doit être exact)
  add column if not exists date_rappel     timestamptz,
  -- Précision facultative saisie par le conseiller (« préfère l'après-midi »)
  add column if not exists rappel_note     text,
  -- Horodatage du moment où le rappel a été marqué fait. NULL = encore dû.
  -- Colonne séparée plutôt qu'un booléen : garde la trace du « quand ».
  add column if not exists rappel_fait_le  timestamptz;

-- Index partiel : seuls les rappels ENCORE DUS sont interrogés (liste du jour,
-- retards, calendrier). Les rappels traités n'alourdissent pas l'index.
create index if not exists idx_leads_rappel_du
  on public.leads (date_rappel)
  where date_rappel is not null and rappel_fait_le is null;
