import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import CartePropositionLecture from "@/components/pro/demandes/CartePropositionLecture";
import { LIBELLES_STATUT_DEMANDE, LIBELLE_TRANSACTION, formaterFourchetteBudget, type DemandeRecherche, type PropositionBien } from "@/lib/demandes/types";

export const metadata: Metadata = { title: "Demande de recherche — Espace Pro" };

type Props = { params: Promise<{ id: string }> };

export default async function PageDemandeRechercheAgentDetail({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  // Lecture en service_role + vérification stricte de la propriété (cree_par)
  // — cette page ne doit montrer QUE les demandes créées par cet agent.
  const admin = createAdminClient();
  const { data: demandeRaw } = await admin.from("demandes_recherche").select("*").eq("id", id).maybeSingle();
  if (!demandeRaw || demandeRaw.cree_par !== user.id) notFound();
  const demande = demandeRaw as DemandeRecherche;

  const { data: propositionsRaw } = await admin
    .from("propositions_bien")
    .select("*")
    .eq("demande_id", id)
    .order("cree_le", { ascending: false });
  const propositions = (propositionsRaw ?? []) as PropositionBien[];

  const budget = formaterFourchetteBudget(demande.budget_min, demande.budget_max);
  const nomComplet = [demande.prenom, demande.nom].filter(Boolean).join(" ");

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/pro/demandes-recherche" className="text-sm hover:underline" style={{ color: "#9DB8AD", textDecoration: "none" }}>
        ← Recherches clients
      </Link>

      <div className="mt-3 mb-6 flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-semibold" style={{ color: "#111" }}>{demande.reference}</h1>
        <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: "#F4F6F5", color: "#6B7A71" }}>
          {LIBELLES_STATUT_DEMANDE[demande.statut]}
        </span>
      </div>

      {demande.statut === "en_validation" && (
        <div className="rounded-2xl p-4 mb-5 text-sm" style={{ background: "#FEF9EC", border: "1px solid #F3E0A8", color: "#92400E" }}>
          En attente de modération par l&apos;équipe HOOMY avant publication anonyme.
        </div>
      )}

      <section className="rounded-2xl p-5 mb-5" style={{ background: "#fff", border: "1px solid #F0EDE5" }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#9DB8AD" }}>Client</p>
        <p className="text-sm font-medium" style={{ color: "#1f2a24" }}>{nomComplet}</p>
        <p className="text-sm" style={{ color: "#6B7A71" }}>{demande.telephone}{demande.email ? ` · ${demande.email}` : ""}</p>
      </section>

      <section className="rounded-2xl p-5 mb-5" style={{ background: "#fff", border: "1px solid #F0EDE5" }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "#9DB8AD" }}>Recherche</p>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><dt className="text-xs" style={{ color: "#9DB8AD" }}>Transaction</dt><dd className="text-sm" style={{ color: "#1f2a24" }}>{LIBELLE_TRANSACTION[demande.transaction]}</dd></div>
          <div><dt className="text-xs" style={{ color: "#9DB8AD" }}>Type</dt><dd className="text-sm" style={{ color: "#1f2a24" }}>{demande.type_bien ?? "—"}</dd></div>
          <div><dt className="text-xs" style={{ color: "#9DB8AD" }}>Ville</dt><dd className="text-sm" style={{ color: "#1f2a24" }}>{demande.ville}</dd></div>
          <div><dt className="text-xs" style={{ color: "#9DB8AD" }}>Quartiers</dt><dd className="text-sm" style={{ color: "#1f2a24" }}>{demande.quartiers?.join(", ") || "—"}</dd></div>
          <div><dt className="text-xs" style={{ color: "#9DB8AD" }}>Budget</dt><dd className="text-sm" style={{ color: "#1f2a24" }}>{budget ?? "—"}</dd></div>
          <div><dt className="text-xs" style={{ color: "#9DB8AD" }}>Surface min.</dt><dd className="text-sm" style={{ color: "#1f2a24" }}>{demande.surface_min ? `${demande.surface_min} m²` : "—"}</dd></div>
        </dl>
      </section>

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
            {propositions.map((p) => <CartePropositionLecture key={p.id} proposition={p} />)}
          </div>
        )}
      </section>
    </div>
  );
}
