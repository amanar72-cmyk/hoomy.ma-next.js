-- Rôle « agence » : badge public « Agence partenaire » sur les biens soumis
-- par un compte agence. Colonne dénormalisée, remplie à la création du bien
-- (voir creerBienAgent) et sélectionnée dans COLONNES_BIEN_PUBLIC.
--
-- Générique par design : le NOM de l'agence n'est jamais exposé (sinon on perd
-- le lead acheteur). La colonne est un simple booléen.

-- 1. Colonne (idempotent)
ALTER TABLE biens
  ADD COLUMN IF NOT EXISTS est_agence_partenaire boolean NOT NULL DEFAULT false;

-- 2. Backfill des biens déjà publiés par un compte agence
--    (agent_id = compte agence). Sans effet s'il n'y en a pas encore.
UPDATE biens b
SET est_agence_partenaire = true
FROM profils p
WHERE b.agent_id = p.id
  AND p.role = 'agence'
  AND b.est_agence_partenaire = false;

-- Aucune policy RLS à ajouter : la colonne suit les policies existantes de la
-- table biens (lecture publique des biens publiés déjà en place).
