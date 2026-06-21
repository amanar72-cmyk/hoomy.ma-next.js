-- Ajoute la colonne email_contact à la table profils
-- Cette colonne stocke le vrai email de l'utilisateur (facultatif)
-- L'email Supabase Auth reste le email technique : {telephone}@phone.hoomy.ma
ALTER TABLE profils ADD COLUMN IF NOT EXISTS email_contact TEXT;
