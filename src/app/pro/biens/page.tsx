import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import BoutonActionPro from "@/components/pro/BoutonActionPro";
import { transmettreAuBo } from "./actions";
import { fichesCompletes } from "@/lib/documents/fiche";
import { formaterPrix } from "@/lib/format";

export const metadata: Metadata = {
  title: "Mes biens — Espace Pro HOOMY.MA",
};

// ── Types ─────────────────────────────────────────────────────────────────────

type BienAgent = {
  id: string;
  reference: string | null;
  slug: string | null;
  titre: string;
  type: string;
  transaction: string;
  prix: number;
  ville: string;
  quartier: string | null;
  photos: string[] | null;
  statut: string | null;
  surface: number;
  chambres: number;
  cree_le: string;
  date_affectation: string | null;
};

// ── Zones ─────────────────────────────────────────────────────────────────────

const ZONES = [
  {
    id: "en_cours",
    label: "En cours de traitement",
    statuts: ["brouillon", "affecte"],
    badge: { bg: "#FEF3C7", color: "#92400E" },
    avecAction: true,
  },
  {
    id: "en_validation",
    label: "En validation BO",
    statuts: ["en_validation"],
    badge: { bg: "#DBEAFE", color: "#1E40AF" },
    avecAction: false,
  },
  {
    id: "publies",
    label: "Publiés",
    statuts: ["finalise", "transacte"],
    badge: { bg: "#D1FAE5", color: "#065F46" },
    avecAction: false,
  },
] as const;

// ── Utilitaires ───────────────────────────────────────────────────────────────


function formaterDate(d: string) {
  return new Date(d).toLocaleDateString("fr-MA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Carte bien agent ──────────────────────────────────────────────────────────

function CarteBienAgent({
  bien,
  avecAction,
  docsComplets = true,
}: {
  bien: BienAgent;
  avecAction: boolean;
  // Verrou : les 3 documents (mandat, CIN, certificat) sont-ils déposés ?
  docsComplets?: boolean;
}) {
  const photo = bien.photos?.[0] ?? null;
  const estPublie = bien.statut === "finalise" || bien.statut === "transacte";
  const lienAnnonce =
    estPublie && bien.slug
      ? `/${bien.transaction === "location" ? "louer" : "acheter"}/${bien.slug}`
      : null;

  return (
    <article
      className="rounded-2xl overflow-hidden"
      style={{
        background: "#fff",
        border: "1px solid #F0EDE5",
        boxShadow: "0 1px 8px rgba(15,76,58,0.05)",
      }}
    >
      {/* Zone info cliquable → fiche du bien */}
      <Link
        href={`/pro/biens/${bien.id}`}
        className="flex gap-3 p-3 hover:bg-[#FAFAF8] transition-colors"
        style={{ textDecoration: "none" }}
      >
        {/* Photo */}
        <div
          className="flex-shrink-0 rounded-xl overflow-hidden"
          style={{ width: 88, height: 72, background: "#F4F6F5" }}
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={bien.titre} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#C4D8CE" strokeWidth="1.2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-0.5 flex-wrap">
            <p
              className="text-sm font-semibold leading-snug line-clamp-1"
              style={{ color: "#1f2a24" }}
            >
              {bien.titre}
            </p>
            {bien.reference && (
              <span
                className="text-xs font-mono px-1.5 py-0.5 rounded flex-shrink-0"
                style={{ background: "#F0EDE5", color: "#9DB8AD" }}
              >
                {bien.reference}
              </span>
            )}
          </div>

          <p className="text-xs" style={{ color: "#9DB8AD" }}>
            {bien.type}
            {bien.quartier ? ` · ${bien.quartier}` : ""}
            {" · "}{bien.ville}
          </p>

          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-sm font-bold" style={{ color: "#0F4C3A" }}>
              {formaterPrix(bien.prix, bien.transaction)}
            </span>
            <span className="text-xs" style={{ color: "#C4D8CE" }}>
              {bien.surface} m²
              {bien.chambres > 0 ? ` · ${bien.chambres} ch.` : ""}
            </span>
            <span className="text-xs" style={{ color: "#C4D8CE" }}>
              {formaterDate(bien.cree_le)}
            </span>
          </div>
        </div>
      </Link>

      {/* Actions */}
      {(avecAction || lienAnnonce) && (
        <div
          className="px-3 pb-3 flex gap-2 flex-wrap"
          style={{ borderTop: "1px solid #F8F5EE" }}
        >
          {avecAction && docsComplets && (
            <BoutonActionPro
              action={transmettreAuBo.bind(null, bien.id)}
              label="Transmettre au BO"
              labelChargement="Transmission…"
              confirmation="Confirmer la transmission de ce bien au back-office pour publication ?"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl mt-2"
              style={{ background: "#0F4C3A", color: "#fff", cursor: "pointer" }}
            />
          )}
          {avecAction && !docsComplets && (
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {/* Verrou documentaire : bouton désactivé tant que les 3 pièces
                  ne sont pas déposées (garde serveur dans transmettreAuBo) */}
              <button
                type="button"
                disabled
                title="Déposez les 3 documents (mandat, CIN, certificat) avant d'envoyer au backoffice."
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl cursor-not-allowed"
                style={{ background: "#E8E4DA", color: "#9DB8AD", border: "none" }}
              >
                Transmettre au BO
              </button>
              <Link
                href={`/pro/biens/${bien.id}`}
                className="text-xs hover:underline"
                style={{ color: "#92400E", textDecoration: "none" }}
              >
                📁 Déposez les 3 documents (mandat, CIN, certificat) →
              </Link>
            </div>
          )}
          {lienAnnonce && (
            <Link
              href={lienAnnonce}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl mt-2 hover:opacity-90 transition-opacity"
              style={{ background: "#D4AF37", color: "#0F4C3A", textDecoration: "none" }}
            >
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Voir l&apos;annonce
            </Link>
          )}
        </div>
      )}
    </article>
  );
}

// ── searchParams ──────────────────────────────────────────────────────────────

type SearchParams = Promise<{ transaction?: string }>;

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function PageProMesBiens({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const transaction = sp.transaction ?? "";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  // Uniquement les biens de cet agent
  let query = supabase
    .from("biens")
    .select(
      "id, reference, slug, titre, type, transaction, prix, ville, quartier, " +
      "photos, statut, surface, chambres, cree_le, date_affectation"
    )
    .eq("agent_id", user.id)
    .order("cree_le", { ascending: false });

  if (transaction) {
    query = query.eq("transaction", transaction);
  }

  const { data: biensRaw } = await query;
  const biens = (biensRaw ?? []) as unknown as BienAgent[];

  // Répartition par zone
  const biensParZone = ZONES.map((zone) => ({
    zone,
    biens: biens.filter((b) => (zone.statuts as readonly string[]).includes(b.statut ?? "")),
  }));

  // Dossiers documentaires complets (mandat + CIN + certificat) — conditionne
  // le bouton « Transmettre au BO » des biens encore à traiter (1 requête).
  const idsATraiter = biensParZone
    .filter(({ zone }) => zone.avecAction)
    .flatMap(({ biens: b }) => b.map((x) => x.id));
  const dossiersOk = await fichesCompletes(supabase, idsATraiter);

  const totalBiens = biens.length;

  const onglets = [
    { label: "Tous", value: "" },
    { label: "Vente", value: "vente" },
    { label: "Location", value: "location" },
  ];

  return (
    <div className="max-w-4xl mx-auto">

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1
            className="text-2xl font-normal mb-1"
            style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}
          >
            Mes biens
          </h1>
          <p className="text-sm" style={{ color: "#9DB8AD" }}>
            {totalBiens} bien{totalBiens !== 1 ? "s" : ""} en portefeuille
          </p>
        </div>
        <Link
          href="/pro/biens/nouveau"
          className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
          style={{ background: "#D4AF37", color: "#0F4C3A", textDecoration: "none" }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Créer un bien
        </Link>
      </div>

      {/* ── Filtres transaction ──────────────────────────────────────────── */}
      <div
        className="flex gap-1 p-1 rounded-xl w-fit mb-6"
        style={{ background: "#E8E4DA" }}
      >
        {onglets.map((o) => {
          const actif = transaction === o.value;
          const href = `/pro/biens${o.value ? `?transaction=${o.value}` : ""}`;
          return (
            <Link
              key={o.value}
              href={href}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={
                actif
                  ? { background: "#fff", color: "#0F4C3A", boxShadow: "0 1px 4px rgba(0,0,0,0.08)", textDecoration: "none" }
                  : { color: "#6B7A71", textDecoration: "none" }
              }
            >
              {o.label}
            </Link>
          );
        })}
      </div>

      {/* ── État vide global ─────────────────────────────────────────────── */}
      {totalBiens === 0 && (
        <div
          className="rounded-2xl flex flex-col items-center justify-center py-16 px-6 text-center"
          style={{ background: "#fff", border: "1px solid #F0EDE5" }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "#F0FAF4" }}
          >
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#0F4C3A" strokeWidth="1.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <p className="text-sm font-semibold mb-1" style={{ color: "#0F4C3A" }}>
            Aucun bien en portefeuille
          </p>
          <p className="text-sm mb-4" style={{ color: "#9DB8AD" }}>
            Créez votre premier bien ou acceptez-en un depuis la file d'affectation.
          </p>
          <Link
            href="/pro/biens/nouveau"
            className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
            style={{ background: "#0F4C3A", color: "#fff", textDecoration: "none" }}
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Créer un bien
          </Link>
        </div>
      )}

      {/* ── Zones ────────────────────────────────────────────────────────── */}
      {totalBiens > 0 && (
        <div className="flex flex-col gap-8">
          {biensParZone.map(({ zone, biens: biensDeLaZone }) => (
            <section key={zone.id}>
              {/* En-tête de zone */}
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-semibold" style={{ color: "#0F4C3A" }}>
                  {zone.label}
                </h2>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: zone.badge.bg, color: zone.badge.color }}
                >
                  {biensDeLaZone.length}
                </span>
              </div>

              {/* Biens de la zone */}
              {biensDeLaZone.length === 0 ? (
                <div
                  className="rounded-2xl py-8 text-center text-sm"
                  style={{ background: "#FAFAF8", border: "1px dashed #E8E2D2", color: "#C4D8CE" }}
                >
                  Aucun bien dans cette zone
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {biensDeLaZone.map((b) => (
                    <CarteBienAgent
                      key={b.id}
                      bien={b}
                      avecAction={zone.avecAction}
                      docsComplets={dossiersOk.has(b.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

    </div>
  );
}
