-- ============================================================
-- HOOMY.MA — Flou inviolable des photos en attente de validation
-- À EXÉCUTER dans Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Colonne stockant les chemins (bucket privé) des photos NETTES
--    tant que le bien n'est pas validé. Jamais exposée en URL publique.
alter table biens add column if not exists photos_originales jsonb;

-- 2. Bucket privé pour les originaux — créé via SQL plutôt que le dashboard
--    (équivalent à Storage → New bucket → "Public bucket" décoché)
insert into storage.buckets (id, name, public)
values ('biens-prive', 'biens-prive', false)
on conflict (id) do nothing;

-- 3. Policy d'upload : un utilisateur connecté peut écrire uniquement
--    dans son propre dossier (même convention que le bucket "biens" existant : ${userId}/...)
drop policy if exists "Upload photos privees dossier personnel" on storage.objects;
create policy "Upload photos privees dossier personnel"
  on storage.objects for insert
  with check (
    bucket_id = 'biens-prive'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Pas de policy SELECT sur ce bucket : aucune lecture directe possible,
-- même par l'uploadeur lui-même. La lecture passe exclusivement par
-- service_role (URL signée générée côté serveur, dans du code déjà
-- protégé par un contrôle de rôle/propriété).
