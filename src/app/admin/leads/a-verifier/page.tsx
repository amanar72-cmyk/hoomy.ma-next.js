import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ErreurChargement from "@/components/ui/ErreurChargement";
import LigneLeadAVerifier, { type LeadAVerifier } from "@/components/admin/leads/LigneLeadAVerifier";

// Leads Meta reçus SANS téléphone exploitable (absent ou mal saisi) —
// statut 'a_verifier', contact_id NULL. Gardés au lieu d'être perdus
// (voir upsertLeadEtContact / permettreSansTelephone). N'apparaissent nulle
// part ailleurs : /admin/leads les exclut explicitement de l'onglet « Tous ».

export const metadata: Metadata = {
  title: "Leads à vérifier — Administration HOOMY.MA",
};
export const dynamic = "force-dynamic";

export default async function PageLeadsAVerifier() {
  const supabase = await createClient();

  const { data: leads, error } = await supabase
    .from("leads")
    .select("id, cree_le, nom, telephone, message, campagne, bien_ref, biens(titre)")
    .eq("statut", "a_verifier")
    .order("cree_le", { ascending: false })
    .limit(200);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <Link
            href="/admin/leads"
            className="text-xs hover:underline"
            style={{ color: "#9DB8AD", textDecoration: "none" }}
          >
            ← Leads qualifiés
          </Link>
          <h1 className="text-xl font-semibold mt-1" style={{ color: "#111" }}>
            Leads à vérifier
          </h1>
          <p className="text-sm" style={{ color: "#999" }}>
            {(leads ?? []).length} lead{(leads ?? []).length !== 1 ? "s" : ""} reçu
            {(leads ?? []).length !== 1 ? "s" : ""} sans numéro exploitable — corrigez ou ignorez.
          </p>
        </div>
      </div>

      {error ? (
        <ErreurChargement titre="Chargement des leads à vérifier impossible" detail={error.message} />
      ) : (leads ?? []).length === 0 ? (
        <div
          className="rounded-2xl py-10 text-center text-sm"
          style={{ background: "#FAFAF8", border: "1px dashed #E8E2D2", color: "#9DB8AD" }}
        >
          Aucun lead à vérifier pour le moment.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {(leads as unknown as LeadAVerifier[]).map((lead) => (
            <LigneLeadAVerifier key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </div>
  );
}
