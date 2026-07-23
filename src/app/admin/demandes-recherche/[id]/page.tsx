import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import ActionsModerationDemande from "@/components/admin/demandes/ActionsModerationDemande";
import CartePropositionAdmin from "@/components/admin/demandes/CartePropositionAdmin";
import { LIBELLES_STATUT_DEMANDE, LIBELLE_TRANSACTION, formaterFourchetteBudget, type DemandeRecherche, type PropositionBien } from "@/lib/demandes/types";

export const metadata: Metadata = { title: "Demande de recherche — Administration HOOMY.MA" };

type Props = { params: Promise<{ id: string }> };

export default async function PageAdminDemandeDetail({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: demandeRaw } = await supabase.from("demandes_recherche").select("*").eq("id", id).maybeSingle();
  if (!demandeRaw) notFound();
  const demande = demandeRaw as DemandeRecherche;

  const { data: propositionsRaw } = await supabase
    .from("propositions_bien")
    .select("*")
    .eq("demande_id", id)
    .order("cree_le", { ascending: false });
  const propositions = (propositionsRaw ?? []) as PropositionBien[];

  const budget = formaterFourchetteBudget(demande.budget_min, demande.budget_max);
  const nomComplet = [demande.prenom, demande.nom].filter(Boolean).join(" ");

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <Link href="/admin/demandes-recherche" className="text-sm hover:underline" style={{ color: "#9DB8AD", textDecoration: "none" }}>
        ← Demandes de recherche
      </Link>

      <div className="mt-3 mb-6 flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-semibold" style={{ color: "#111" }}>{demande.reference}</h1>
        <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: "#F4F6F5", color: "#6B7A71" }}>
          {LIBELLES_STATUT_DEMANDE[demande.statut]}
        </span>
      </div>

      <ActionsModerationDemande id={demande.id} statut={demande.statut} />

      {/* ── Contact (PRIVÉ — jamais public) ── */}
      <section className="rounded-2xl p-5 mb-5" style={{ background: "#fff", border: "1px solid #F0EDE5" }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#9DB8AD" }}>Contact (privé)</p>
        <p className="text-sm font-medium" style={{ color: "#1f2a24" }}>{nomComplet} — {demande.profil_demandeur === "agence" ? "Agence" : "Particulier"}</p>
        <p className="text-sm" style={{ color: "#6B7A71" }}>{demande.telephone}{demande.email ? ` · ${demande.email}` : ""}</p>
      </section>

      {/* ── Recherche (contenu public une fois publiée) ── */}
      <section className="rounded-2xl p-5 mb-5" style={{ background: "#fff", border: "1px solid #F0EDE5" }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#9DB8AD" }}>Recherche (contenu public une fois publiée)</p>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><dt className="text-xs" style={{ color: "#9DB8AD" }}>Transaction</dt><dd className="text-sm" style={{ color: "#1f2a24" }}>{LIBELLE_TRANSACTION[demande.transaction]}</dd></div>
          <div><dt className="text-xs" style={{ color: "#9DB8AD" }}>Type</dt><dd className="text-sm" style={{ color: "#1f2a24" }}>{demande.type_bien ?? "—"}</dd></div>
          <div><dt className="text-xs" style={{ color: "#9DB8AD" }}>Ville</dt><dd className="text-sm" style={{ color: "#1f2a24" }}>{demande.ville}</dd></div>
          <div><dt className="text-xs" style={{ color: "#9DB8AD" }}>Quartiers</dt><dd className="text-sm" style={{ color: "#1f2a24" }}>{demande.quartiers?.join(", ") || "—"}</dd></div>
          <div><dt className="text-xs" style={{ color: "#9DB8AD" }}>Budget</dt><dd className="text-sm" style={{ color: "#1f2a24" }}>{budget ?? "—"}</dd></div>
          <div><dt className="text-xs" style={{ color: "#9DB8AD" }}>Surface min.</dt><dd className="text-sm" style={{ color: "#1f2a24" }}>{demande.surface_min ? `${demande.surface_min} m²` : "—"}</dd></div>
          <div><dt className="text-xs" style={{ color: "#9DB8AD" }}>Chambres min.</dt><dd className="text-sm" style={{ color: "#1f2a24" }}>{demande.chambres_min ?? "—"}</dd></div>
          <div><dt className="text-xs" style={{ color: "#9DB8AD" }}>Urgence</dt><dd className="text-sm" style={{ color: "#1f2a24" }}>{demande.urgence ?? "—"}</dd></div>
        </dl>
        {demande.criteres_supplementaires && (
          <div className="mt-3 pt-3" style={{ borderTop: "1px solid #F0EDE5" }}>
            <p className="text-xs mb-1" style={{ color: "#9DB8AD" }}>Critères supplémentaires</p>
            <p className="text-sm whitespace-pre-line" style={{ color: "#1f2a24" }}>{demande.criteres_supplementaires}</p>
          </div>
        )}
        {demande.description && (
          <div className="mt-3 pt-3" style={{ borderTop: "1px solid #F0EDE5" }}>
            <p className="text-xs mb-1" style={{ color: "#9DB8AD" }}>Description</p>
            <p className="text-sm" style={{ color: "#1f2a24" }}>{demande.description}</p>
          </div>
        )}
      </section>

      {/* ── Propositions reçues ── */}
      <section>
        <h2 className="text-base font-semibold mb-3" style={{ color: "#0F4C3A" }}>
          Propositions reçues ({propositions.length})
        </h2>
        {propositions.length === 0 ? (
          <div className="rounded-2xl py-10 text-center text-sm" style={{ background: "#FAFAF8", border: "1px dashed #E8E2D2", color: "#9DB8AD" }}>
            Aucune proposition pour l&apos;instant.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {propositions.map((p) => <CartePropositionAdmin key={p.id} proposition={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}
