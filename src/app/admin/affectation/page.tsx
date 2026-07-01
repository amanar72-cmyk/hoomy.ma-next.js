import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import TableauAffectation, {
  type BienFile,
  type Agent,
  type ProprietaireInfo,
} from "@/components/admin/TableauAffectation";

const CHAMPS =
  "id, reference, titre, type, transaction, prix, ville, quartier, photos, " +
  "statut, agent_id, proprietaire_id, date_soumission, date_affectation";

export default async function PageAdminAffectation() {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const [
    { data: enAttente },
    { data: dansFile },
    { data: affectes },
    { data: agentsRaw },
    { data: biensChargeRaw },
  ] = await Promise.all([
    supabase.from("biens").select(CHAMPS).eq("statut", "en_attente_affectation").order("date_soumission", { ascending: true }),
    supabase.from("biens").select(CHAMPS).eq("statut", "dans_la_file").order("date_soumission", { ascending: true }),
    supabase.from("biens").select(CHAMPS).eq("statut", "affecte").order("date_soumission", { ascending: false }),
    adminClient
      .from("profils")
      .select("id, nom_complet, zones, avatar_url")
      .in("role", ["agent", "agence"])
      .order("nom_complet"),
    // Charge de travail = biens actifs par agent
    adminClient
      .from("biens")
      .select("agent_id")
      .not("agent_id", "is", null)
      .in("statut", ["affecte", "en_validation", "en_attente_affectation", "dans_la_file"]),
  ]);

  const chargeMap: Record<string, number> = {};
  for (const b of biensChargeRaw ?? []) {
    if (b.agent_id) chargeMap[b.agent_id] = (chargeMap[b.agent_id] ?? 0) + 1;
  }

  const tousLesAgents: Agent[] = (
    (agentsRaw ?? []) as { id: string; nom_complet: string | null; zones: string[] | null; avatar_url: string | null }[]
  ).map((a) => ({ ...a, nbBiensActifs: chargeMap[a.id] ?? 0 }));

  const att = (enAttente ?? []) as BienFile[];
  const file = (dansFile ?? []) as BienFile[];
  const aff = (affectes ?? []) as BienFile[];

  // Profils propriétaires pour afficher nom + téléphone sur les cartes
  const propIds = [
    ...new Set([...att, ...file, ...aff].map((b) => b.proprietaire_id).filter(Boolean)),
  ] as string[];

  let proprietaires: Record<string, ProprietaireInfo> = {};
  if (propIds.length > 0) {
    const { data: props } = await adminClient
      .from("profils")
      .select("id, nom_complet, telephone")
      .in("id", propIds);
    proprietaires = Object.fromEntries(
      (props ?? []).map((p) => [p.id, { nom: p.nom_complet ?? null, telephone: p.telephone ?? null }])
    );
  }

  return (
    <div className="p-4 lg:p-10 max-w-screen-xl mx-auto">
      <div className="mb-6">
        <h1
          className="text-2xl mb-1"
          style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}
        >
          File d&apos;affectation
        </h1>
        <p className="text-sm" style={{ color: "#9DB8AD" }}>
          {att.length + file.length} à affecter · {aff.length} affectés
        </p>
      </div>

      <TableauAffectation
        biensInitiaux={{ attente: att, file, affecte: aff }}
        agents={tousLesAgents}
        proprietaires={proprietaires}
      />
    </div>
  );
}
