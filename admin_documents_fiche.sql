-- ============================================================================
-- HOOMY.MA — Autoriser l'ADMIN à déposer/consulter les documents du dossier
-- À EXÉCUTER dans Supabase Dashboard → SQL Editor
--
-- Le dépôt des pièces (mandat, CIN, certificat) était réservé aux AGENTS.
-- On ajoute l'accès ADMIN, via is_admin() (défini dans admin_policies.sql).
--
-- Policies ADDITIVES : elles s'ajoutent aux policies agents existantes (RLS
-- permissive = OR). Elles ne modifient ni ne cassent l'accès des agents.
-- Sans ce script, le composant DocumentsFiche côté admin affichera une erreur
-- « Envoi impossible » à l'upload.
--
-- Idempotent : peut être rejoué sans risque.
-- ============================================================================


-- ── 1. Table documents_fiche ────────────────────────────────────────────────

alter table public.documents_fiche enable row level security;

drop policy if exists "Admin lit documents_fiche"        on public.documents_fiche;
drop policy if exists "Admin insère documents_fiche"     on public.documents_fiche;
drop policy if exists "Admin met à jour documents_fiche" on public.documents_fiche;

create policy "Admin lit documents_fiche"
  on public.documents_fiche for select
  to authenticated
  using (is_admin());

create policy "Admin insère documents_fiche"
  on public.documents_fiche for insert
  to authenticated
  with check (is_admin());

create policy "Admin met à jour documents_fiche"
  on public.documents_fiche for update
  to authenticated
  using (is_admin());


-- ── 2. Storage — bucket privé "documents-clients" ───────────────────────────
-- L'upload utilise upsert:true → il faut INSERT ET UPDATE. SELECT est requis
-- pour la consultation via URL signée (bouton « Voir »).

drop policy if exists "Admin lit fichiers dossier"        on storage.objects;
drop policy if exists "Admin dépose fichiers dossier"     on storage.objects;
drop policy if exists "Admin remplace fichiers dossier"   on storage.objects;

create policy "Admin lit fichiers dossier"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'documents-clients' and is_admin());

create policy "Admin dépose fichiers dossier"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'documents-clients' and is_admin());

create policy "Admin remplace fichiers dossier"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'documents-clients' and is_admin());


-- ============================================================================
-- APRÈS EXÉCUTION : ouvrez une fiche bien admin → onglet Documents (ou mode
-- Modifier) → « Déposer le document ». Le fichier doit s'uploader et le badge
-- passer à « Déposé ». Si « Envoi impossible » persiste, vérifiez que
-- is_admin() renvoie bien true pour votre compte (role = 'admin' dans profils).
-- ============================================================================
