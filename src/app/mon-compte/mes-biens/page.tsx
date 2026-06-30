import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import CarteBienClient, { type BienClient, type InfoAgent } from "@/components/compte/CarteBienClient";
import EtatVide from "@/components/compte/EtatVide";
import { urlsPhotosNettes } from "@/lib/images/photosBien";

// ── Définition des onglets ────────────────────────────────────────────────────

const GROUPES: Record<string, string[]> = {
  tous:     [],
  en_cours: ["en_attente_affectation", "dans_la_file", "affecte"],
  publies:  ["finalise", "transacte"],
  refuses:  ["rejete", "suspendu", "archive"],
};

type CleGroupe = "tous" | "en_cours" | "publies" | "refuses";

const LABELS_ONGLETS: Record<CleGroupe, string> = {
  tous:     "Tous",
  en_cours: "En cours",
  publies:  "Publiés",
  refuses:  "Refusés",
};

// ── searchParams ──────────────────────────────────────────────────────────────

type SearchParams = Promise<{ filtre?: string }>;

// ── Icône état vide ───────────────────────────────────────────────────────────

const IcoBienVide = () => (
  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 22V12h6v10" />
  </svg>
);

const IcoFiltreVide = () => (
  <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function PageMesBiens({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const filtreRaw = sp.filtre ?? "tous";
  const filtre: CleGroupe = (filtreRaw in GROUPES) ? filtreRaw as CleGroupe : "tous";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/mon-compte/mes-biens");

  // ── Fetch biens du client ─────────────────────────────────────────────────
  const { data: biensRaw } = await supabase
    .from("biens")
    .select(
      "id, reference, slug, titre, type, transaction, prix, ville, quartier, " +
      "photos, photos_originales, statut, agent_id, date_soumission, date_affectation, verifie"
    )
    .eq("proprietaire_id", user.id)
    .order("date_soumission", { ascending: false });

  // Le propriétaire voit toujours ses propres photos nettes, même avant validation
  // (URL signée à courte durée — le bucket privé n'est jamais public).
  const tousLesBiens = await Promise.all(
    ((biensRaw ?? []) as unknown as (BienClient & { photos_originales: string[] | null })[]).map(
      async (b) => ({
        ...b,
        photos: await urlsPhotosNettes(b.photos, b.photos_originales, b.verifie),
      })
    )
  );

  // ── Fetch infos complètes des agents (nom, téléphone, email) ─────────────
  const agentIds = [
    ...new Set(tousLesBiens.map((b) => b.agent_id).filter(Boolean)),
  ] as string[];

  let agentsMap: Record<string, InfoAgent> = {};
  if (agentIds.length > 0) {
    const { data: agents } = await supabase
      .from("profils")
      .select("id, nom_complet, telephone, email")
      .in("id", agentIds);
    agentsMap = Object.fromEntries(
      (agents ?? []).map((a) => [
        a.id,
        {
          nom:       a.nom_complet ?? "Conseiller",
          telephone: a.telephone   ?? null,
          email:     a.email       ?? null,
        },
      ])
    );
  }

  // ── Comptes par groupe ────────────────────────────────────────────────────
  function compter(cle: CleGroupe) {
    const statuts = GROUPES[cle];
    if (statuts.length === 0) return tousLesBiens.length;
    return tousLesBiens.filter((b) => statuts.includes(b.statut ?? "")).length;
  }

  // ── Biens à afficher selon l'onglet actif ─────────────────────────────────
  const statuts = GROUPES[filtre];
  const biensAffiches = statuts.length === 0
    ? tousLesBiens
    : tousLesBiens.filter((b) => statuts.includes(b.statut ?? ""));

  return (
    <div className="max-w-3xl mx-auto">

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1
            className="text-xl font-normal mb-0.5"
            style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}
          >
            Mes biens
          </h1>
          <p className="text-sm" style={{ color: "#9DB8AD" }}>
            {tousLesBiens.length} bien{tousLesBiens.length !== 1 ? "s" : ""} soumis au total
          </p>
        </div>
        <Link
          href="/publier"
          className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
          style={{ background: "#D4AF37", color: "#0F4C3A", textDecoration: "none" }}
        >
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Publier un nouveau bien
        </Link>
      </div>

      {/* ── Onglets de filtre ────────────────────────────────────────────── */}
      {tousLesBiens.length > 0 && (
        <div
          className="flex gap-1 p-1 rounded-2xl mb-6 overflow-x-auto"
          style={{ background: "#F0EDE5" }}
        >
          {(Object.keys(GROUPES) as CleGroupe[]).map((cle) => {
            const compte = compter(cle);
            const actif = filtre === cle;
            return (
              <Link
                key={cle}
                href={
                  cle === "tous"
                    ? "/mon-compte/mes-biens"
                    : `/mon-compte/mes-biens?filtre=${cle}`
                }
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all"
                style={{
                  background: actif ? "#fff" : "transparent",
                  color:      actif ? "#0F4C3A" : "#9DB8AD",
                  boxShadow:  actif ? "0 1px 6px rgba(15,76,58,0.10)" : "none",
                  textDecoration: "none",
                  fontWeight: actif ? 600 : 400,
                }}
              >
                {LABELS_ONGLETS[cle]}
                <span
                  className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                  style={{
                    background: actif ? "#E8F5ED" : "#E8E2D2",
                    color:      actif ? "#0F4C3A" : "#9DB8AD",
                  }}
                >
                  {compte}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── État vide — aucun bien soumis ────────────────────────────────── */}
      {tousLesBiens.length === 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "#fff", border: "1px solid #F0EDE5", boxShadow: "0 2px 12px rgba(15,76,58,0.06)" }}
        >
          <EtatVide
            icone={<IcoBienVide />}
            titre="Aucun bien soumis"
            message="Publiez votre premier bien et notre équipe vous accompagne pour trouver le bon acheteur ou locataire."
            cta={{ label: "Publier un bien", href: "/publier" }}
          />
        </div>
      )}

      {/* ── État vide — filtre sans résultat ─────────────────────────────── */}
      {tousLesBiens.length > 0 && biensAffiches.length === 0 && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "#fff", border: "1px solid #F0EDE5", boxShadow: "0 2px 12px rgba(15,76,58,0.06)" }}
        >
          <EtatVide
            icone={<IcoFiltreVide />}
            titre={`Aucun bien dans "${LABELS_ONGLETS[filtre]}"`}
            message="Aucun de vos biens ne correspond à ce filtre pour l'instant."
          />
        </div>
      )}

      {/* ── Liste des cartes ─────────────────────────────────────────────── */}
      {biensAffiches.length > 0 && (
        <div className="flex flex-col gap-4">
          {biensAffiches.map((b) => (
            <CarteBienClient
              key={b.id}
              bien={b}
              agent={b.agent_id ? (agentsMap[b.agent_id] ?? null) : null}
            />
          ))}
        </div>
      )}

    </div>
  );
}
