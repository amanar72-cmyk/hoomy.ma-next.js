-- ============================================================
-- HOOMY.MA — Politiques RLS admin (version sécurisée anti-récursion)
-- ============================================================

-- 1. Fonction is_admin() — SECURITY DEFINER + search_path fixé
--    pour éviter la récursion infinie sur la table profils
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profils
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
-- Activer le RLS d'abord
-- ============================================================
alter table biens enable row level security;
alter table profils enable row level security;

-- ============================================================
-- Nettoyer les anciennes policies (évite les doublons si on relance)
-- ============================================================
drop policy if exists "Lecture publique des biens" on biens;
drop policy if exists "Admin peut modifier les biens" on biens;
drop policy if exists "Admin peut supprimer les biens" on biens;
drop policy if exists "Admin peut insérer des biens" on biens;
drop policy if exists "Lecture profil personnel" on profils;
drop policy if exists "Admin peut lire tous les profils" on profils;
drop policy if exists "Modification profil personnel" on profils;
drop policy if exists "Admin peut modifier tous les profils" on profils;

-- ============================================================
-- TABLE : biens
-- ============================================================
create policy "Lecture publique des biens"
  on biens for select using (true);

create policy "Admin modifie les biens"
  on biens for update using (is_admin());

create policy "Admin supprime les biens"
  on biens for delete using (is_admin());

create policy "Admin insère des biens"
  on biens for insert with check (is_admin());

-- ============================================================
-- TABLE : profils
-- ============================================================
-- Lecture : son propre profil OU admin
create policy "Lecture profil"
  on profils for select
  using (auth.uid() = id or is_admin());

-- Modification de son propre profil
create policy "Modification profil personnel"
  on profils for update
  using (auth.uid() = id);

-- Admin modifie tous les profils
create policy "Admin modifie les profils"
  on profils for update
  using (is_admin());