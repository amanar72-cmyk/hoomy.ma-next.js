import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import FormulaireEditionBienAgent, { type BienEditable } from "@/components/pro/FormulaireEditionBienAgent";
import PhotoGalerie from "@/components/ui/PhotoGalerie";
import { urlsPhotosNettes } from "@/lib/images/photosBien";

export const metadata: Metadata = {
  title: "Fiche bien — Espace Pro HOOMY.MA",
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ modifier?: string }>;
};

const STATUTS_MODIFIABLES = ["brouillon", "affecte"];

function formaterPrix(prix: number, transaction: string) {
  const m = prix.toLocaleString("fr-MA");
  return transaction === "location" ? `${m} DH/mois` : `${m} DH`;
}

function formaterDate(d: string) {
  return new Date(d).toLocaleDateString("fr-MA", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function PageFicheBienAgent({ params, searchParams }: Props) {
  const { id } = await params;
  const { modifier } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: bienRaw, error } = await supabase
    .from("biens")
    .select(
      "id, reference, slug, titre, description, type, transaction, prix, ville, quartier, " +
      "chambres, salles_bain, surface, equipements, composition, photos, photos_originales, statut, agent_id, latitude, longitude, cree_le, verifie"
    )
    .eq("id", id)
    .single();

  if (error || !bienRaw) notFound();

  const bien = bienRaw as unknown as BienEditable & {
    agent_id: string | null;
    slug: string | null;
    cree_le: string;
    verifie: boolean;
  };

  // Vérification propriété — seul l'agent propriétaire peut voir la fiche
  if (bien.agent_id !== user.id) {
    redirect("/pro/biens");
  }

  const estModifiable = STATUTS_MODIFIABLES.includes(bien.statut ?? "");
  const modeEdition = modifier === "1" && estModifiable;

  // ── Mode édition ───────────────────────────────────────────────────────────
  if (modeEdition) {
    return (
      <div className="p-6 lg:p-10 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Link
            href={`/pro/biens/${id}`}
            className="text-sm flex items-center gap-1 hover:opacity-80 transition-opacity"
            style={{ color: "#9DB8AD", textDecoration: "none" }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Consultation
          </Link>
          <span style={{ color: "#E0DAC8" }}>/</span>
          <span className="text-sm" style={{ color: "#0F4C3A" }}>Modification</span>
        </div>

        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl mb-1"
              style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}>
              Modifier le bien
            </h1>
            <p className="text-sm" style={{ color: "#9DB8AD" }}>{bien.titre}</p>
          </div>
          {bien.reference && (
            <span className="text-xs px-3 py-1 rounded-full font-mono mt-1 flex-shrink-0"
              style={{ background: "#E8F5ED", color: "#0F4C3A", border: "1px solid #C6E8D4" }}>
              {bien.reference}
            </span>
          )}
        </div>

        <FormulaireEditionBienAgent bien={bien} agentId={user.id} />
      </div>
    );
  }

  // ── Mode lecture ───────────────────────────────────────────────────────────
  // L'agent assigné voit toujours les photos nettes, même avant validation
  // (URL signée à courte durée tant que le bien n'est pas encore validé).
  const photos = await urlsPhotosNettes(
    Array.isArray(bien.photos) ? bien.photos : [],
    Array.isArray(bien.photos_originales) ? bien.photos_originales : [],
    bien.verifie
  );
  const equipements = (Array.isArray(bien.equipements) ? bien.equipements : []) as string[];
  const estPublie = bien.statut === "finalise" || bien.statut === "transacte";
  const lienAnnonce = estPublie && bien.slug
    ? `/${bien.transaction === "location" ? "louer" : "acheter"}/${bien.slug}`
    : null;

  const LABEL_STATUT: Record<string, { label: string; bg: string; color: string }> = {
    brouillon: { label: "Brouillon", bg: "#FEF3C7", color: "#92400E" },
    affecte: { label: "Affecté", bg: "#FEF3C7", color: "#92400E" },
    en_validation: { label: "En validation BO", bg: "#DBEAFE", color: "#1E40AF" },
    finalise: { label: "Publié", bg: "#D1FAE5", color: "#065F46" },
    transacte: { label: "Transacté", bg: "#F3E8FF", color: "#6B21A8" },
  };
  const statutInfo = LABEL_STATUT[bien.statut ?? ""] ?? { label: bien.statut ?? "—", bg: "#F4F6F5", color: "#6B7A71" };

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">

      {/* Fil d'Ariane */}
      <div className="flex items-center gap-3 mb-2">
        <Link
          href="/pro/biens"
          className="text-sm flex items-center gap-1 hover:opacity-80 transition-opacity"
          style={{ color: "#9DB8AD", textDecoration: "none" }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Mes biens
        </Link>
        <span style={{ color: "#E0DAC8" }}>/</span>
        <span className="text-sm" style={{ color: "#0F4C3A" }}>
          {bien.reference ?? bien.id.slice(0, 8)}
        </span>
      </div>

      {/* En-tête */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl mb-1"
            style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}>
            {bien.titre}
          </h1>
          <p className="text-sm" style={{ color: "#9DB8AD" }}>
            {bien.ville}{bien.quartier ? ` · ${bien.quartier}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
          {bien.reference && (
            <span className="text-xs px-3 py-1 rounded-full font-mono"
              style={{ background: "#E8F5ED", color: "#0F4C3A", border: "1px solid #C6E8D4" }}>
              {bien.reference}
            </span>
          )}
          {lienAnnonce && (
            <Link
              href={lienAnnonce}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl hover:opacity-90 transition-opacity"
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
          {estModifiable && (
            <Link
              href={`/pro/biens/${id}?modifier=1`}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
              style={{ background: "#0F4C3A", color: "#fff", textDecoration: "none" }}
            >
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Modifier
            </Link>
          )}
        </div>
      </div>

      {/* Statut */}
      <div className="flex flex-wrap gap-2 mb-5">
        <span className="text-xs font-semibold px-3 py-1 rounded-full"
          style={{ background: statutInfo.bg, color: statutInfo.color }}>
          {statutInfo.label}
        </span>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ background: "#F0EDE5", color: "#6B7A71" }}>
          {bien.type}
        </span>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full"
          style={bien.transaction === "location"
            ? { background: "#FEF3C7", color: "#92400E" }
            : { background: "#DBEAFE", color: "#1E40AF" }
          }>
          {bien.transaction === "location" ? "À louer" : "À vendre"}
        </span>
        {bien.verifie && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ background: "#D1FAE5", color: "#065F46" }}>
            ✅ Vérifié HOOMY
          </span>
        )}
      </div>

      {/* Notice si statut non modifiable */}
      {!estModifiable && (
        <div className="mb-5 rounded-xl px-4 py-3 flex items-start gap-2 text-sm"
          style={{ background: "#F0FAF4", border: "1px solid #C6E8D4", color: "#0F4C3A" }}>
          <span className="flex-shrink-0 mt-0.5">ℹ️</span>
          <span>
            Ce bien ne peut plus être modifié directement — il est <strong>{statutInfo.label.toLowerCase()}</strong>.
            Contactez le back-office si une correction est nécessaire.
          </span>
        </div>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <div className="mb-6">
          <PhotoGalerie photos={photos} hauteur={180} largeurMax={280} classeImage="rounded-2xl" />
        </div>
      )}

      {/* Prix */}
      <p className="mb-5 leading-none"
        style={{
          fontFamily: "var(--font-marcellus), serif",
          color: "#D4AF37",
          fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
        }}>
        {formaterPrix(bien.prix, bien.transaction)}
      </p>

      {/* Caractéristiques */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {bien.surface > 0 && (
          <div className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{ background: "#F8F5EE", border: "1px solid #EDE7D7" }}>
            <span className="text-xl">📐</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#0F4C3A" }}>{bien.surface} m²</p>
              <p className="text-xs" style={{ color: "#9DB8AD" }}>Surface</p>
            </div>
          </div>
        )}
        {bien.chambres > 0 && (
          <div className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{ background: "#F8F5EE", border: "1px solid #EDE7D7" }}>
            <span className="text-xl">🛏️</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#0F4C3A" }}>{bien.chambres}</p>
              <p className="text-xs" style={{ color: "#9DB8AD" }}>
                {bien.chambres > 1 ? "Chambres" : "Chambre"}
              </p>
            </div>
          </div>
        )}
        {bien.salles_bain > 0 && (
          <div className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{ background: "#F8F5EE", border: "1px solid #EDE7D7" }}>
            <span className="text-xl">🚿</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: "#0F4C3A" }}>{bien.salles_bain}</p>
              <p className="text-xs" style={{ color: "#9DB8AD" }}>
                {bien.salles_bain > 1 ? "Salles de bain" : "Salle de bain"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      {bien.description && (
        <section className="mb-6">
          <h2 className="text-base font-semibold mb-2" style={{ color: "#0F4C3A" }}>Description</h2>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#3D4A42" }}>
            {bien.description}
          </p>
        </section>
      )}

      {/* Équipements */}
      {equipements.length > 0 && (
        <section className="mb-6">
          <h2 className="text-base font-semibold mb-3" style={{ color: "#0F4C3A" }}>Équipements</h2>
          <div className="flex flex-wrap gap-2">
            {equipements.map((e) => (
              <span key={e} className="text-xs font-medium px-3 py-1.5 rounded-full"
                style={{ background: "#fff", border: "1px solid #E0DAC8", color: "#3D4A42" }}>
                {e}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Métadonnées */}
      <div className="mt-6 pt-4 flex flex-wrap gap-4 text-xs" style={{ borderTop: "1px solid #F0EDE5", color: "#9DB8AD" }}>
        <span>Ajouté le {formaterDate(bien.cree_le)}</span>
      </div>

    </div>
  );
}
