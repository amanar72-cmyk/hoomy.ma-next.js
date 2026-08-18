import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mes demandes — Mon espace",
};

type Demande = {
  id: string;
  statut: string;
  cree_le: string;
  date_souhaitee: string | null;
  message: string | null;
  agent_id: string | null;
  biens: {
    titre: string;
    reference: string | null;
    photos: string[] | null;
    transaction: string;
    ville: string;
    slug: string | null;
  } | null;
};

const STATUTS: Record<string, { label: string; bg: string; color: string }> = {
  nouvelle:  { label: "En attente",  bg: "#DBEAFE", color: "#1E40AF" },
  confirmee: { label: "Confirmée",   bg: "#D1FAE5", color: "#065F46" },
  realisee:  { label: "Réalisée",    bg: "#F3F4F6", color: "#374151" },
  annulee:   { label: "Annulée",     bg: "#FEE2E2", color: "#991B1B" },
};

type SearchParams = Promise<{ tab?: string }>;

export default async function PageMesDemandes({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const tabActif = sp.tab === "visites" ? "visites" : "messages";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/mon-compte/demandes");

  const { data: raw } = await supabase
    .from("demandes_visite")
    .select(
      "id, statut, cree_le, date_souhaitee, message, agent_id, " +
      "biens(titre, reference, photos, transaction, ville, slug)"
    )
    .eq("client_id", user.id)
    .order("cree_le", { ascending: false });

  const toutes = (raw ?? []) as unknown as Demande[];

  // Messages : date_souhaitee null | Visites : date_souhaitee non null
  const messages = toutes.filter((d) => !d.date_souhaitee);
  const visites  = toutes.filter((d) => !!d.date_souhaitee);
  const affichees = tabActif === "visites" ? visites : messages;

  // Noms des agents
  const agentIds = [...new Set(toutes.map((d) => d.agent_id).filter(Boolean))] as string[];
  let agentsMap: Record<string, string> = {};
  if (agentIds.length > 0) {
    const { data: agents } = await supabase
      .from("profils")
      .select("id, nom_complet")
      .in("id", agentIds);
    agentsMap = Object.fromEntries(
      (agents ?? []).map((a) => [a.id, a.nom_complet ?? "Conseiller"])
    );
  }

  function fmt(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("fr-MA", { day: "2-digit", month: "long", year: "numeric" });
  }

  return (
    <div className="max-w-2xl mx-auto">

      {/* En-tête */}
      <div className="mb-6">
        <h1
          className="text-xl font-normal mb-0.5"
          style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}
        >
          Mes demandes
        </h1>
        <p className="text-sm" style={{ color: "#9DB8AD" }}>
          {toutes.length} demande{toutes.length !== 1 ? "s" : ""} au total
        </p>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 p-1 rounded-2xl mb-6" style={{ background: "#F0EDE5" }}>
        {[
          { key: "messages", label: "Messages",       count: messages.length },
          { key: "visites",  label: "Demandes visite", count: visites.length },
        ].map((tab) => {
          const actif = tabActif === tab.key;
          return (
            <Link
              key={tab.key}
              href={tab.key === "messages" ? "/mon-compte/demandes" : "/mon-compte/demandes?tab=visites"}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl text-sm transition-all"
              style={{
                background: actif ? "#fff" : "transparent",
                color: actif ? "#0F4C3A" : "#9DB8AD",
                boxShadow: actif ? "0 1px 6px rgba(15,76,58,0.10)" : "none",
                textDecoration: "none",
                fontWeight: actif ? 600 : 400,
              }}
            >
              {tab.label}
              <span
                className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: actif ? "#E8F5ED" : "#E8E2D2", color: actif ? "#0F4C3A" : "#9DB8AD" }}
              >
                {tab.count}
              </span>
            </Link>
          );
        })}
      </div>

      {/* État vide global */}
      {toutes.length === 0 && (
        <div
          className="rounded-2xl flex flex-col items-center py-16 text-center"
          style={{ background: "#fff", border: "1px solid #F0EDE5" }}
        >
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "#F0FAF4" }}
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#0F4C3A" strokeWidth="1.5">
              <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
              <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
            </svg>
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: "#0F4C3A" }}>
            Aucune demande pour l&apos;instant
          </p>
          <p className="text-sm mb-5" style={{ color: "#9DB8AD" }}>
            Contactez un agent depuis la page d&apos;un bien qui vous intéresse.
          </p>
          <Link
            href="/acheter"
            className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
            style={{ background: "#0F4C3A", color: "#fff", textDecoration: "none" }}
          >
            Voir les biens
          </Link>
        </div>
      )}

      {/* Onglet vide */}
      {toutes.length > 0 && affichees.length === 0 && (
        <div
          className="rounded-2xl flex flex-col items-center py-12 text-center"
          style={{ background: "#fff", border: "1px solid #F0EDE5" }}
        >
          <p className="text-sm" style={{ color: "#9DB8AD" }}>Aucune entrée dans cet onglet.</p>
        </div>
      )}

      {/* Liste */}
      {affichees.length > 0 && (
        <div className="flex flex-col gap-4">
          {affichees.map((d) => {
            const photo = (d.biens?.photos as string[] | null)?.[0] ?? null;
            const statut = STATUTS[d.statut] ?? { label: d.statut, bg: "#F3F4F6", color: "#374151" };
            const agentNom = d.agent_id ? (agentsMap[d.agent_id] ?? null) : null;
            const lienBien = d.biens?.slug
              ? `/${d.biens.transaction === "location" ? "louer" : "acheter"}/${d.biens.slug}`
              : null;

            return (
              <article
                key={d.id}
                className="rounded-2xl overflow-hidden"
                style={{ background: "#fff", border: "1px solid #F0EDE5", boxShadow: "0 2px 12px rgba(15,76,58,0.06)" }}
              >
                <div className="flex gap-4 p-4">
                  {/* Photo */}
                  <div
                    className="flex-shrink-0 rounded-xl overflow-hidden"
                    style={{ width: 80, height: 68, background: "#F4F6F5" }}
                  >
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#C4D8CE" strokeWidth="1.2">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-semibold line-clamp-1 flex-1" style={{ color: "#1f2a24" }}>
                        {d.biens?.titre ?? "Bien non trouvé"}
                      </p>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: statut.bg, color: statut.color }}
                      >
                        {statut.label}
                      </span>
                    </div>

                    <p className="text-xs mb-1.5" style={{ color: "#9DB8AD" }}>
                      {d.biens?.ville}
                      {d.biens?.transaction ? ` · ${d.biens.transaction === "vente" ? "Achat" : "Location"}` : ""}
                    </p>

                    <p className="text-xs" style={{ color: "#9DB8AD" }}>
                      Envoyé le {fmt(d.cree_le)}
                      {d.date_souhaitee ? ` · Visite souhaitée : ${fmt(d.date_souhaitee)}` : ""}
                    </p>

                    {d.message && (
                      <p
                        className="text-xs mt-1.5 line-clamp-2 italic"
                        style={{ color: "#6B7280" }}
                      >
                        &ldquo;{d.message}&rdquo;
                      </p>
                    )}

                    {agentNom && (
                      <div
                        className="mt-2 flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                        style={{ background: "#F0FAF4", border: "1px solid #D1FAE5" }}
                      >
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: "#0F4C3A", color: "#D4AF37" }}
                        >
                          {agentNom[0].toUpperCase()}
                        </div>
                        <p className="text-xs font-medium" style={{ color: "#0F4C3A" }}>
                          Conseiller : {agentNom}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {lienBien && (
                  <div className="px-4 pb-3 pt-0" style={{ borderTop: "1px solid #F8F5EE" }}>
                    <Link
                      href={lienBien}
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl mt-2 hover:opacity-80 transition-opacity"
                      style={{ background: "#F0EDE5", color: "#0F4C3A", textDecoration: "none" }}
                    >
                      <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                      Voir l&apos;annonce
                    </Link>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
