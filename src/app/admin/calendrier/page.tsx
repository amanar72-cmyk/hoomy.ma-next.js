import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import CalendrierAdmin, { type VisiteAdmin, type AgentInfo } from "@/components/admin/CalendrierAdmin";

export const metadata: Metadata = {
  title: "Calendrier global — Admin HOOMY.MA",
};

export default async function PageAdminCalendrier() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  // Vérifier rôle admin
  const { data: profil } = await supabase
    .from("profils")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profil || profil.role !== "admin") redirect("/");

  const adminClient = createAdminClient();

  // Toutes les visites confirmées de tous les agents
  const { data: raw } = await adminClient
    .from("demandes_visite")
    .select(
      "id, agent_id, date_confirmee, nom_client, email_client, telephone_client, " +
      "biens(titre, reference, ville)"
    )
    .eq("statut", "confirmee")
    .not("date_confirmee", "is", null)
    .order("date_confirmee", { ascending: true });

  type RawVisite = {
    id: string;
    agent_id: string | null;
    date_confirmee: string;
    nom_client: string;
    email_client: string;
    telephone_client: string | null;
    biens: { titre: string; reference: string | null; ville: string } | null;
  };

  const rawVisites = (raw ?? []) as unknown as RawVisite[];

  // Profils des agents
  const agentIds = [...new Set(rawVisites.map((v) => v.agent_id).filter(Boolean))] as string[];
  let agentsMap: Record<string, string> = {};
  if (agentIds.length > 0) {
    const { data: agents } = await adminClient
      .from("profils")
      .select("id, nom_complet")
      .in("id", agentIds);
    agentsMap = Object.fromEntries(
      (agents ?? []).map((a) => [a.id, a.nom_complet ?? "Agent"])
    );
  }

  const visites: VisiteAdmin[] = rawVisites.map((v) => ({
    id: v.id,
    agent_id: v.agent_id,
    date_confirmee: v.date_confirmee,
    nom_client: v.nom_client,
    email_client: v.email_client,
    telephone_client: v.telephone_client,
    bien_titre: v.biens?.titre ?? "Bien sans titre",
    bien_reference: v.biens?.reference ?? null,
    bien_ville: v.biens?.ville ?? "",
    agent_nom: v.agent_id ? (agentsMap[v.agent_id] ?? "Agent") : "Non assigné",
  }));

  const agents: AgentInfo[] = agentIds.map((id) => ({
    id,
    nom: agentsMap[id] ?? "Agent",
    couleur: "",
  }));

  const maintenant = new Date().toLocaleDateString("fr-MA", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="max-w-6xl mx-auto">

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1
          className="text-2xl font-normal mb-1"
          style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}
        >
          Calendrier global
        </h1>
        <p className="text-sm capitalize" style={{ color: "#9DB8AD" }}>
          {maintenant} · {visites.length} visite{visites.length !== 1 ? "s" : ""} confirmée{visites.length !== 1 ? "s" : ""} · {agents.length} agent{agents.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* ── Calendrier admin ─────────────────────────────────────────────── */}
      <CalendrierAdmin visites={visites} agents={agents} />

    </div>
  );
}
