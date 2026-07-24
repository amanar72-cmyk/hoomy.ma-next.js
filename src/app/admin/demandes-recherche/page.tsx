import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";
import TableauAdmin from "@/components/admin/TableauAdmin";
import { LIBELLES_STATUT_DEMANDE, LIBELLE_TRANSACTION, type DemandeRecherche } from "@/lib/demandes/types";

export const metadata: Metadata = { title: "Demandes de recherche — Administration HOOMY.MA" };

const COULEURS_STATUT: Record<string, { bg: string; color: string }> = {
  brouillon:     { bg: "#F3F4F6", color: "#374151" },
  en_validation: { bg: "#FEF3C7", color: "#92400E" },
  publiee:       { bg: "#D1FAE5", color: "#065F46" },
  pourvue:       { bg: "#DBEAFE", color: "#1E40AF" },
  refusee:       { bg: "#FEE2E2", color: "#991B1B" },
  archivee:      { bg: "#F3F4F6", color: "#6B7280" },
};

type SearchParams = Promise<{ statut?: string; transaction?: string }>;

export default async function PageAdminDemandesRecherche({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const filtreStatut = sp.statut ?? "en_validation";
  const filtreTransaction = sp.transaction === "achat" || sp.transaction === "location" ? sp.transaction : "toutes";

  const supabase = await createClient();

  let query = supabase
    .from("demandes_recherche")
    .select("*, propositions:propositions_bien(count)")
    .order("cree_le", { ascending: false });
  if (filtreStatut !== "toutes") query = query.eq("statut", filtreStatut);
  if (filtreTransaction !== "toutes") query = query.eq("transaction", filtreTransaction);

  const { data, error } = await query.limit(200);
  const demandes = (data ?? []) as (DemandeRecherche & { propositions: { count: number }[] })[];

  // Compteurs par statut — filtrés par la transaction active pour rester cohérents avec la liste
  let comptesQuery = supabase.from("demandes_recherche").select("statut");
  if (filtreTransaction !== "toutes") comptesQuery = comptesQuery.eq("transaction", filtreTransaction);
  const { data: comptesRaw } = await comptesQuery;
  const comptes: Record<string, number> = {};
  (comptesRaw ?? []).forEach((d) => { comptes[d.statut] = (comptes[d.statut] ?? 0) + 1; });

  const ONGLETS = [
    { key: "en_validation", label: "À modérer" },
    { key: "publiee", label: "Publiées" },
    { key: "refusee", label: "Refusées" },
    { key: "pourvue", label: "Pourvues" },
    { key: "toutes", label: "Toutes" },
  ];

  const ONGLETS_TRANSACTION = [
    { key: "toutes", label: "Achat + Location" },
    { key: "achat", label: "Achat" },
    { key: "location", label: "Location" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-5 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold mb-0.5" style={{ color: "#111" }}>Demandes de recherche</h1>
          <p className="text-sm" style={{ color: "#999" }}>Place de marché inversée — modération avant publication anonyme.</p>
        </div>
        <Link
          href="/admin/demandes-recherche/nouvelle"
          className="inline-flex items-center gap-1.5 text-sm font-semibold px-4 py-2.5 rounded-xl"
          style={{ background: "#0F4C3A", color: "#fff", textDecoration: "none" }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Ajouter une demande
        </Link>
      </div>

      {/* ── Séparation achat / location ── */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        {ONGLETS_TRANSACTION.map((t) => {
          const actif = filtreTransaction === t.key;
          return (
            <Link
              key={t.key}
              href={`/admin/demandes-recherche?statut=${filtreStatut}&transaction=${t.key}`}
              className="text-sm px-3.5 py-2 rounded-xl whitespace-nowrap"
              style={{ background: actif ? "#D4AF37" : "#F4F6F5", color: actif ? "#fff" : "#6B7A71", textDecoration: "none", fontWeight: actif ? 600 : 400 }}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
        {ONGLETS.map((o) => {
          const actif = filtreStatut === o.key;
          const n = o.key === "toutes" ? Object.values(comptes).reduce((a, b) => a + b, 0) : comptes[o.key] ?? 0;
          return (
            <Link
              key={o.key}
              href={`/admin/demandes-recherche?statut=${o.key}&transaction=${filtreTransaction}`}
              className="flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-xl whitespace-nowrap"
              style={{ background: actif ? "#0F4C3A" : "#F4F6F5", color: actif ? "#fff" : "#6B7A71", textDecoration: "none", fontWeight: actif ? 600 : 400 }}
            >
              {o.label}
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-full" style={{ background: actif ? "rgba(255,255,255,0.2)" : "#E8E2D2", color: actif ? "#fff" : "#6B7A71" }}>
                {n}
              </span>
            </Link>
          );
        })}
      </div>

      {error && (
        <div className="rounded-2xl px-5 py-4 mb-4" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
          <p className="text-sm" style={{ color: "#991B1B" }}>Chargement impossible : {error.message}</p>
        </div>
      )}

      <TableauAdmin
        colonnes={["Référence", "Demandeur", "Recherche", "Propositions", "Créée le", ""]}
        estVide={demandes.length === 0}
        vide="Aucune demande dans cet onglet"
      >
        {demandes.map((d) => {
          const statut = COULEURS_STATUT[d.statut] ?? COULEURS_STATUT.brouillon;
          const nbPropositions = d.propositions?.[0]?.count ?? 0;
          return (
            <tr key={d.id} style={{ borderBottom: "1px solid #F0EDE5" }}>
              <td className="px-4 py-3">
                <Link href={`/admin/demandes-recherche/${d.id}`} className="text-sm font-mono hover:underline" style={{ color: "#0F4C3A" }}>
                  {d.reference}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm" style={{ color: "#3D4A42" }}>
                {[d.prenom, d.nom].filter(Boolean).join(" ")} · {d.telephone}
              </td>
              <td className="px-4 py-3 text-sm" style={{ color: "#6B7A71" }}>
                {LIBELLE_TRANSACTION[d.transaction]} — {d.type_bien ?? "—"} à {d.ville}
              </td>
              <td className="px-4 py-3 text-sm font-medium text-center" style={{ color: nbPropositions > 0 ? "#0F4C3A" : "#9DB8AD" }}>
                {nbPropositions}
              </td>
              <td className="px-4 py-3 text-sm" style={{ color: "#9DB8AD" }}>
                {new Date(d.cree_le).toLocaleDateString("fr-MA")}
              </td>
              <td className="px-4 py-3">
                <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: statut.bg, color: statut.color }}>
                  {LIBELLES_STATUT_DEMANDE[d.statut]}
                </span>
              </td>
            </tr>
          );
        })}
      </TableauAdmin>
    </div>
  );
}
