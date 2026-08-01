-- ============================================================================
-- HOOMY.MA — Répertoire propriétaires : accès PAR AGENT (fin du partage global)
-- À EXÉCUTER dans Supabase Dashboard → SQL Editor. Idempotent.
--
-- Règle : un agent voit/modifie UNIQUEMENT ses propres fiches OU celles dont un
-- bien lui est affecté (biens.vendeur_id + biens.agent_id). L'admin voit tout.
--
-- ⚠️ Les fiches EXISTANTES ont cree_par = NULL (aucun historique de l'auteur) →
-- elles deviennent visibles par l'admin, et par l'agent qui a un bien affecté.
-- Assumé (pas de backfill fiable).
-- ============================================================================

-- 1. Colonne de propriété — auto-renseignée avec l'utilisateur courant.
alter table public.proprietaires
  add column if not exists cree_par uuid references public.profils(id) on delete set null;

alter table public.proprietaires
  alter column cree_par set default auth.uid();

create index if not exists proprietaires_cree_par_idx
  on public.proprietaires (cree_par);

-- 2. RLS par agent.
drop policy if exists "Pros et admin lisent les proprietaires"    on public.proprietaires;
drop policy if exists "Pros et admin modifient les proprietaires" on public.proprietaires;
drop policy if exists "Pros et admin creent les proprietaires"    on public.proprietaires;
-- Nouveaux noms aussi, pour que le script soit rejouable sans erreur 42710.
drop policy if exists "Lecture proprietaires par agent"           on public.proprietaires;
drop policy if exists "Modification proprietaires par agent"      on public.proprietaires;
drop policy if exists "Creation proprietaires par agent"          on public.proprietaires;

create policy "Lecture proprietaires par agent"
  on public.proprietaires for select
  using (
    is_admin()
    or cree_par = auth.uid()
    or exists (
      select 1 from public.biens b
      where b.vendeur_id = proprietaires.id and b.agent_id = auth.uid()
    )
  );

create policy "Modification proprietaires par agent"
  on public.proprietaires for update
  using (
    is_admin()
    or cree_par = auth.uid()
    or exists (
      select 1 from public.biens b
      where b.vendeur_id = proprietaires.id and b.agent_id = auth.uid()
    )
  );

create policy "Creation proprietaires par agent"
  on public.proprietaires for insert
  with check (
    is_admin() or (est_pro() and cree_par = auth.uid())
  );

-- La policy DELETE (admin uniquement) reste celle de proprietaires.sql.
-- ============================================================================
