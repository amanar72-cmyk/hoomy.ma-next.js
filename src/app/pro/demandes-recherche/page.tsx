import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { LIBELLES_STATUT_DEMANDE, LIBELLE_TRANSACTION, type DemandeRecherche } from "@/lib/demandes/types";

export const metadata: Metadata = { title: "Recherches clients — Espace Pro" };

// Demandes créées PAR CET AGENT (cree_par) — lecture en service_role avec
// filtre explicite en application (la RLS session-based ne couvre pas ce cas
// : voir src/lib/demandes/creerInterne.ts pour le raisonnement).

const COULEURS_STATUT: Record<string, { bg: string; color: string }> = {
  brouillon:     { bg: "#F3F4F6", color: "#374151" },
  en_validation: { bg: "#FEF3C7", color: "#92400E" },
  publiee:       { bg: "#D1FAE5", color: "#065F46" },
  pourvue:       { bg: "#DBEAFE", color: "#1E40AF" },
  refusee:       { bg: "#FEE2E2", color: "#991B1B" },
  archivee:      { bg: "#F3F4F6", color: "#6B7280" },
};

export default async function PageDemandesRechercheAgent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("demandes_recherche")
    .select("*, propositions:propositions_bien(count)")
    .eq("cree_par", user.id)
    .order("cree_le", { ascending: false });

  const demandes = (data ?? []) as (DemandeRecherche & { propositions: { count: number }[] })[];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold mb-0.5" style={{ color: "#111" }}>Recherches clients</h1>
          <p className="text-sm" style={{ color: "#999" }}>
            Demandes que vous avez créées pour vos clients — {demandes.length} au total.
          </p>
        </div>
        <Link
          href="/pro/demandes-recherche/nouvelle"
          className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl"
          style={{ background: "#0F4C3A", color: "#fff", textDecoration: "none" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Ajouter une demande
        </Link>
      </div>

      {error && (
        <div className="rounded-2xl px-5 py-4 mb-4" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
          <p className="text-sm" style={{ color: "#991B1B" }}>Chargement impossible : {error.message}</p>
        </div>
      )}

      {demandes.length === 0 && !error ? (
        <div className="rounded-2xl py-16 text-center" style={{ background: "#FAFAF8", border: "1px dashed #E8E2D2" }}>
          <p className="text-sm" style={{ color: "#9DB8AD" }}>Aucune demande créée pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {demandes.map((d) => {
            const statut = COULEURS_STATUT[d.statut] ?? COULEURS_STATUT.brouillon;
            const nbPropositions = d.propositions?.[0]?.count ?? 0;
            return (
              <Link
                key={d.id}
                href={`/pro/demandes-recherche/${d.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl px-5 py-4 flex-wrap"
                style={{ background: "#fff", border: "1px solid #F0EDE5", textDecoration: "none" }}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-mono" style={{ color: "#0F4C3A" }}>{d.reference}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: statut.bg, color: statut.color }}>
                      {LIBELLES_STATUT_DEMANDE[d.statut]}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: "#3D4A42" }}>
                    {[d.prenom, d.nom].filter(Boolean).join(" ")} — {LIBELLE_TRANSACTION[d.transaction]} — {d.type_bien ?? "—"} à {d.ville}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {nbPropositions > 0 && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "#D4AF37", color: "#0F4C3A" }}>
                      {nbPropositions} proposition{nbPropositions > 1 ? "s" : ""}
                    </span>
                  )}
                  <span className="text-xs" style={{ color: "#9DB8AD" }}>{new Date(d.cree_le).toLocaleDateString("fr-MA")}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
