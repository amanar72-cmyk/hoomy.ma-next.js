import { createClient } from "@/lib/supabase/server";
import { genererICS } from "@/lib/utils/calendrier";

type DemandeRow = {
  id: string;
  client_id: string | null;
  agent_id: string | null;
  date_souhaitee: string | null;
  statut: string;
  nom_client: string | null;
  telephone_client: string | null;
  biens: {
    titre: string;
    reference: string | null;
    ville: string;
    quartier: string | null;
    slug: string | null;
    transaction: string;
  } | null;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Non authentifié", { status: 401 });
  }

  // Fetch la demande avec les infos du bien
  const { data: demande } = await supabase
    .from("demandes_visite")
    .select(
      "id, client_id, agent_id, date_souhaitee, statut, " +
      "nom_client, telephone_client, " +
      "biens(titre, reference, ville, quartier, slug, transaction)"
    )
    .eq("id", id)
    .maybeSingle() as unknown as { data: DemandeRow | null };

  if (!demande) {
    return new Response("Non trouvé", { status: 404 });
  }

  // Vérification d'accès
  const estClient = user.id === demande.client_id;
  const estAgent  = user.id === demande.agent_id;

  let estAdmin = false;
  if (!estClient && !estAgent) {
    const { data: profil } = await supabase
      .from("profils")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    estAdmin = profil?.role === "admin";
  }

  if (!estClient && !estAgent && !estAdmin) {
    return new Response("Accès refusé", { status: 403 });
  }

  const bien = demande.biens;

  // Contact affiché : le conseiller pour le client, le client pour le conseiller/admin
  let contactNom = "Équipe HOOMY";
  let contactTelephone: string | null = null;

  if (estClient && demande.agent_id) {
    const { data: agent } = await supabase
      .from("profils")
      .select("nom_complet, telephone")
      .eq("id", demande.agent_id)
      .maybeSingle();
    contactNom       = (agent as { nom_complet: string | null; telephone: string | null } | null)?.nom_complet ?? "Votre conseiller HOOMY";
    contactTelephone = (agent as { nom_complet: string | null; telephone: string | null } | null)?.telephone   ?? null;
  } else {
    contactNom       = demande.nom_client       ?? "Client";
    contactTelephone = demande.telephone_client ?? null;
  }

  const ics = genererICS({
    id:              demande.id,
    dateSouhaitee:   demande.date_souhaitee ?? "",
    titreBien:       bien?.titre       ?? "Visite",
    referenceBien:   bien?.reference   ?? null,
    villeBien:       bien?.ville       ?? "",
    quartierBien:    bien?.quartier    ?? null,
    slugBien:        bien?.slug        ?? null,
    transactionBien: bien?.transaction ?? "vente",
    contactNom,
    contactTelephone,
  });

  const reference = bien?.reference ?? id.slice(0, 8);

  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type":        "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="visite-${reference}.ics"`,
      "Cache-Control":       "private, no-store",
    },
  });
}
