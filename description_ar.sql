-- Ajoute la colonne de description en arabe standard sur la table biens.
-- Idempotente : IF NOT EXISTS évite une erreur si déjà présente.
ALTER TABLE biens ADD COLUMN IF NOT EXISTS description_ar TEXT;
