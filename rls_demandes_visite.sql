-- ============================================================
-- HOOMY.MA — RLS sur demandes_visite (leads/messages clients)
-- À EXÉCUTER dans Supabase Dashboard → SQL Editor
-- Réutilise la fonction is_admin() créée dans admin_policies.sql
-- ============================================================

alter table demandes_visite enable row level security;

drop policy if exists "Agent voit ses propres leads" on demandes_visite;
drop policy if exists "Client voit ses propres demandes" on demandes_visite;
drop policy if exists "Agent ou admin modifie le statut du lead" on demandes_visite;

-- Un agent ne voit que les leads liés à SES biens ; l'admin voit tout.
create policy "Agent voit ses propres leads"
  on demandes_visite for select
  using (agent_id = auth.uid() or is_admin());

-- Le client auteur de la demande peut voir ses propres demandes envoyées.
create policy "Client voit ses propres demandes"
  on demandes_visite for select
  using (client_id = auth.uid());

-- Modification du statut : l'agent concerné ou l'admin uniquement.
create policy "Agent ou admin modifie le statut du lead"
  on demandes_visite for update
  using (agent_id = auth.uid() or is_admin());

-- L'insertion (soumission publique d'une demande de visite/message) continue
-- de passer par service_role dans soumettreDemandeVisite/soumettreMessage
-- (déjà le cas aujourd'hui) — aucune policy INSERT nécessaire pour le public.
