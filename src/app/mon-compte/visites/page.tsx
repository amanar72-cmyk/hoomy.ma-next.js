import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import BoutonCalendrier from "@/components/ui/BoutonCalendrier";

export const metadata: Metadata = {
  title: "Mes visites — Mon espace HOOMY.MA",
};

// ── Types ─────────────────────────────────────────────────────────────────────

type DemandeVisite = {
  id: string;
  agent_id: string | null;
  date_souhaitee: string | null;
  date_confirmee: string | null;
  statut: string;
  cree_le: string;
  message: string | null;
  biens: {
    titre: string;
    reference: string | null;
    photos: string[] | null;
    transaction: string;
    ville: string;
    quartier: string | null;
    slug: string | null;
  } | null;
};

// ── Constantes ────────────────────────────────────────────────────────────────

const STATUTS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  nouvelle:  { label: "En attente",  bg: "#DBEAFE", color: "#1E40AF" },
  confirmee: { label: "Confirmée",   bg: "#D1FAE5", color: "#065F46" },
  realisee:  { label: "Réalisée",    bg: "#F3F4F6", color: "#374151" },
  annulee:   { label: "Annulée",     bg: "#FEE2E2", color: "#991B1B" },
};

type SearchParams = Promise<{ tab?: string }>;

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function PageMesVisites({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const tabActif = sp.tab === "passees" ? "passees" : "avenir";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/mon-compte/visites");

  // Toutes les demandes du client
  const { data: demandesRaw } = await supabase
    .from("demandes_visite")
    .select(
      "id, agent_id, date_souhaitee, date_confirmee, statut, cree_le, message, " +
      "biens(titre, reference, photos, transaction, ville, quartier, slug)"
    )
    .eq("client_id", user.id)
    .order("cree_le", { ascending: false });

  const toutes = (demandesRaw ?? []) as unknown as DemandeVisite[];

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

  const aVenir  = toutes.filter((d) => ["nouvelle", "confirmee"].includes(d.statut));
  const passees = toutes.filter((d) => ["realisee", "annulee"].includes(d.statut));
  const demandesAffichees = tabActif === "avenir" ? aVenir : passees;

  function formaterDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("fr-MA", {
      day: "2-digit", month: "long", year: "numeric",
    });
  }

  return (
    <div className="max-w-2xl mx-auto">

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1
            className="text-xl font-normal mb-0.5"
            style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}
          >
            Mes visites
          </h1>
          <p className="text-sm" style={{ color: "#9DB8AD" }}>
            {toutes.length} demande{toutes.length !== 1 ? "s" : ""} au total
          </p>
        </div>
      </div>

      {/* ── Onglets ──────────────────────────────────────────────────────── */}
      {toutes.length > 0 && (
        <div
          className="flex gap-1 p-1 rounded-2xl mb-6"
          style={{ background: "#F0EDE5" }}
        >
          {[
            { key: "avenir",  label: "À venir",  count: aVenir.length },
            { key: "passees", label: "Passées",  count: passees.length },
          ].map((tab) => {
            const actif = tabActif === tab.key;
            return (
              <Link
                key={tab.key}
                href={tab.key === "avenir" ? "/mon-compte/visites" : "/mon-compte/visites?tab=passees"}
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
      )}

      {/* ── État vide ────────────────────────────────────────────────────── */}
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
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: "#0F4C3A" }}>
            Aucune visite planifiée
          </p>
          <p className="text-sm mb-4" style={{ color: "#9DB8AD" }}>
            Demandez une visite depuis la page d'un bien qui vous intéresse.
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

      {/* ── Filtre vide ──────────────────────────────────────────────────── */}
      {toutes.length > 0 && demandesAffichees.length === 0 && (
        <div
          className="rounded-2xl flex flex-col items-center py-12 text-center"
          style={{ background: "#fff", border: "1px solid #F0EDE5" }}
        >
          <p className="text-sm" style={{ color: "#9DB8AD" }}>
            Aucune visite dans cet onglet.
          </p>
        </div>
      )}

      {/* ── Liste des visites ─────────────────────────────────────────────── */}
      {demandesAffichees.length > 0 && (
        <div className="flex flex-col gap-4">
          {demandesAffichees.map((d) => {
            const photo = (d.biens?.photos as string[] | null)?.[0] ?? null;
            const statutConf = STATUTS_CONFIG[d.statut] ?? { label: d.statut, bg: "#F3F4F6", color: "#374151" };
            const agentNom = d.agent_id ? (agentsMap[d.agent_id] ?? null) : null;
            const prefixe = d.biens?.transaction === "location" ? "louer" : "acheter";
            const lienBien = d.biens?.slug ? `/${prefixe}/${d.biens.slug}` : null;
            const lienFiche = d.biens?.slug
              ? `https://hoomy.ma/${prefixe}/${d.biens.slug}`
              : "https://hoomy.ma";
            const locationBien = d.biens
              ? (d.biens.quartier ? `${d.biens.quartier}, ${d.biens.ville}` : d.biens.ville)
              : "";
            const montrerBoutonCalendrier =
              d.statut === "confirmee" && !!d.date_souhaitee;

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
                    style={{ width: 88, height: 72, background: "#F4F6F5" }}
                  >
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#C4D8CE" strokeWidth="1.2">
                          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                          <polyline points="9 22 9 12 15 12 15 22" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-semibold line-clamp-1 flex-1" style={{ color: "#1f2a24" }}>
                        {d.biens?.titre ?? "Bien non trouvé"}
                      </p>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ background: statutConf.bg, color: statutConf.color }}
                      >
                        {statutConf.label}
                      </span>
                    </div>

                    <p className="text-xs mb-2" style={{ color: "#9DB8AD" }}>
                      {d.biens?.ville}
                      {d.biens?.transaction ? ` · ${d.biens.transaction === "vente" ? "Achat" : "Location"}` : ""}
                    </p>

                    <div className="flex flex-col gap-0.5 text-xs" style={{ color: "#9DB8AD" }}>
                      <span>Date souhaitée : {formaterDate(d.date_souhaitee)}</span>
                      {d.date_confirmee && (
                        <span className="font-medium" style={{ color: "#065F46" }}>
                          Confirmée le {formaterDate(d.date_confirmee)}
                        </span>
                      )}
                    </div>

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

                {(lienBien || montrerBoutonCalendrier) && (
                  <div
                    className="px-4 pb-3 pt-2 flex flex-wrap items-center gap-3"
                    style={{ borderTop: "1px solid #F8F5EE" }}
                  >
                    {lienBien && (
                      <Link
                        href={lienBien}
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl hover:opacity-80 transition-opacity"
                        style={{ background: "#F0EDE5", color: "#0F4C3A", textDecoration: "none" }}
                      >
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                        Voir l&apos;annonce
                      </Link>
                    )}
                    {montrerBoutonCalendrier && d.date_souhaitee && (
                      <BoutonCalendrier
                        visitId={d.id}
                        date={d.date_souhaitee}
                        titre={d.biens?.titre ?? "Visite"}
                        reference={d.biens?.reference ?? null}
                        location={locationBien}
                        lienFiche={lienFiche}
                      />
                    )}
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
