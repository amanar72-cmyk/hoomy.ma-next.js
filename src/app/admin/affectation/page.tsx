import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import TableauAffectation, { type BienFile, type Agent } from "@/components/admin/TableauAffectation";

const CHAMPS = "id, reference, titre, type, transaction, prix, ville, quartier, photos, statut, agent_id, date_soumission, date_affectation";

export default async function PageAdminAffectation() {
  const supabase = await createClient();
  // Admin client (service_role) pour bypasser les RLS sur profils
  // et garantir que tous les agents/agences sont listés dans la modal d'affectation
  const adminClient = createAdminClient();

  const [{ data: enAttente }, { data: dansFile }, { data: affectes }, { data: agents }] =
    await Promise.all([
      supabase.from("biens").select(CHAMPS).eq("statut", "en_attente_affectation").order("date_soumission", { ascending: true }),
      supabase.from("biens").select(CHAMPS).eq("statut", "dans_la_file").order("date_soumission", { ascending: true }),
      supabase.from("biens").select(CHAMPS).eq("statut", "affecte").order("date_soumission", { ascending: false }),
      adminClient.from("profils").select("id, nom_complet, zones").in("role", ["agent", "agence"]).order("nom_complet"),
    ]);

  const att = (enAttente ?? []) as BienFile[];
  const file = (dansFile ?? []) as BienFile[];
  const aff = (affectes ?? []) as BienFile[];
  const tousLesAgents = (agents ?? []) as Agent[];

  return (
    <div className="p-6 lg:p-10 max-w-screen-xl mx-auto">
      <div className="mb-8">
        <h1
          className="text-2xl mb-1"
          style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}
        >
          File d&apos;affectation
        </h1>
        <p className="text-sm" style={{ color: "#9DB8AD" }}>
          {att.length} en attente · {file.length} dans la file · {aff.length} affectés
        </p>
      </div>

      <TableauAffectation
        biensInitiaux={{ attente: att, file, affecte: aff }}
        agents={tousLesAgents}
      />
    </div>
  );
}
