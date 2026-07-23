import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import BoutonAction from "@/components/admin/BoutonAction";
import { demanderClotureDemande } from "./actions";
import { LIBELLES_STATUT_DEMANDE, LIBELLE_TRANSACTION, formaterFourchetteBudget, type DemandeRecherche } from "@/lib/demandes/types";

export const metadata: Metadata = { title: "Ma recherche publiée — Mon espace HOOMY.MA" };

const COULEURS_STATUT: Record<string, { bg: string; color: string }> = {
  brouillon:     { bg: "#F3F4F6", color: "#374151" },
  en_validation: { bg: "#FEF3C7", color: "#92400E" },
  publiee:       { bg: "#D1FAE5", color: "#065F46" },
  pourvue:       { bg: "#DBEAFE", color: "#1E40AF" },
  refusee:       { bg: "#FEE2E2", color: "#991B1B" },
  archivee:      { bg: "#F3F4F6", color: "#6B7280" },
};

export default async function PageMesDemandesRecherche() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/mon-compte/demandes-recherche");

  const { data } = await supabase
    .from("demandes_recherche")
    .select("*")
    .eq("demandeur_id", user.id)
    .order("cree_le", { ascending: false });

  const demandes = (data ?? []) as DemandeRecherche[];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-normal mb-0.5" style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}>
            Ma recherche publiée
          </h1>
          <p className="text-sm" style={{ color: "#9DB8AD" }}>
            Publiez ce que vous cherchez — les vendeurs et agences pourront vous proposer un bien.
          </p>
        </div>
        <Link
          href="/mon-compte/demandes-recherche/nouvelle"
          className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
          style={{ background: "#D4AF37", color: "#0F4C3A", textDecoration: "none" }}
        >
          + Nouvelle demande
        </Link>
      </div>

      {demandes.length === 0 ? (
        <div className="rounded-2xl flex flex-col items-center py-16 text-center" style={{ background: "#fff", border: "1px solid #F0EDE5" }}>
          <p className="text-sm font-semibold mb-2" style={{ color: "#0F4C3A" }}>Aucune demande publiée</p>
          <p className="text-sm max-w-xs mx-auto mb-6" style={{ color: "#9DB8AD" }}>
            Décrivez ce que vous cherchez : un conseiller la valide, puis elle est visible anonymement sur hoomy.ma/demandes.
          </p>
          <Link href="/mon-compte/demandes-recherche/nouvelle" className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity" style={{ background: "#0F4C3A", color: "#fff", textDecoration: "none" }}>
            Publier ma demande
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {demandes.map((d) => {
            const statut = COULEURS_STATUT[d.statut] ?? COULEURS_STATUT.brouillon;
            const budget = formaterFourchetteBudget(d.budget_min, d.budget_max);
            const editable = d.statut === "brouillon" || d.statut === "en_validation" || d.statut === "refusee";
            return (
              <article key={d.id} className="rounded-2xl p-4" style={{ background: "#fff", border: "1px solid #F0EDE5", boxShadow: "0 2px 12px rgba(15,76,58,0.06)" }}>
                <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                  <span className="text-xs font-mono" style={{ color: "#9DB8AD" }}>{d.reference}</span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: statut.bg, color: statut.color }}>
                    {LIBELLES_STATUT_DEMANDE[d.statut]}
                  </span>
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: "#1f2a24" }}>
                  {LIBELLE_TRANSACTION[d.transaction]} — {d.type_bien ?? "Bien"} à {d.ville}
                </p>
                {budget && <p className="text-xs mb-2" style={{ color: "#6B7280" }}>{budget}</p>}
                <div className="flex items-center gap-2 flex-wrap mt-3">
                  {editable && (
                    <Link href={`/mon-compte/demandes-recherche/${d.id}`} className="text-xs font-medium px-3 py-1.5 rounded-xl hover:opacity-80 transition-opacity" style={{ background: "#F0EDE5", color: "#0F4C3A", textDecoration: "none" }}>
                      Modifier
                    </Link>
                  )}
                  {d.statut === "publiee" && (
                    <>
                      <Link href={`/demandes/${d.reference}`} className="text-xs font-medium px-3 py-1.5 rounded-xl hover:opacity-80 transition-opacity" style={{ background: "#F0EDE5", color: "#0F4C3A", textDecoration: "none" }}>
                        Voir la page publique
                      </Link>
                      <BoutonAction
                        action={demanderClotureDemande.bind(null, d.id, d.reference)}
                        label="J'ai trouvé — clôturer"
                        labelChargement="Envoi…"
                        className="text-xs font-medium px-3 py-1.5 rounded-xl"
                        style={{ background: "#D1FAE5", color: "#065F46" }}
                        confirmation="Prévenir un conseiller que vous avez trouvé un bien et souhaitez clôturer cette demande ?"
                      />
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
