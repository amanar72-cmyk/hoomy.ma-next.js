import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import FormulaireEditionBien from "@/components/admin/FormulaireEditionBien";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ modifier?: string }>;
};

function formaterPrix(prix: number, transaction: string) {
  const m = prix.toLocaleString("fr-MA");
  return transaction === "location" ? `${m} DH/mois` : `${m} DH`;
}

export default async function PageFicheBien({ params, searchParams }: Props) {
  const { id } = await params;
  const { modifier } = await searchParams;
  const supabase = await createClient();

  const { data: bien, error } = await supabase
    .from("biens")
    .select("*")
    .eq("id", id)
    .single();

  if (!bien) {
    if (error) console.error(`[admin/biens/${id}] Erreur requête :`, error.message);
    notFound();
  }

  const modeEdition = modifier === "1";

  // ── Mode édition ───────────────────────────────────────────────────────────
  if (modeEdition) {
    return (
      <div className="p-6 lg:p-10 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Link
            href={`/admin/biens/${id}`}
            className="text-sm hover:underline flex items-center gap-1"
            style={{ color: "#9DB8AD", textDecoration: "none" }}
          >
            ← Consultation
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

        <FormulaireEditionBien bien={bien} />
      </div>
    );
  }

  // ── Mode lecture ───────────────────────────────────────────────────────────
  const photos = (Array.isArray(bien.photos) ? bien.photos : []) as string[];
  const equipements = (Array.isArray(bien.equipements) ? bien.equipements : []) as string[];

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">

      {/* Fil d'Ariane */}
      <div className="flex items-center gap-3 mb-2">
        <Link
          href="/admin/biens"
          className="text-sm hover:underline flex items-center gap-1"
          style={{ color: "#9DB8AD", textDecoration: "none" }}
        >
          ← Biens
        </Link>
        <span style={{ color: "#E0DAC8" }}>/</span>
        <span className="text-sm" style={{ color: "#0F4C3A" }}>
          {bien.reference ?? bien.id.slice(0, 8)}
        </span>
      </div>

      {/* En-tête : titre + bouton Modifier */}
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
        <div className="flex items-center gap-3 flex-shrink-0">
          {bien.reference && (
            <span className="text-xs px-3 py-1 rounded-full font-mono"
              style={{ background: "#E8F5ED", color: "#0F4C3A", border: "1px solid #C6E8D4" }}>
              {bien.reference}
            </span>
          )}
          <Link
            href={`/admin/biens/${id}?modifier=1`}
            className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
            style={{ background: "#0F4C3A", color: "#fff", textDecoration: "none" }}
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Modifier
          </Link>
        </div>
      </div>

      {/* Photos */}
      {photos.length > 0 && (
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {photos.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={url}
              alt={`Photo ${i + 1}`}
              className="rounded-2xl object-cover flex-shrink-0"
              style={{ height: 200, width: "auto", maxWidth: 300 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          ))}
        </div>
      )}

      {/* Badges : type, transaction, statut, vérifié */}
      <div className="flex flex-wrap gap-2 mb-4">
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
        {bien.statut && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ background: "#F4F6F5", color: "#6B7A71" }}>
            {bien.statut}
          </span>
        )}
        {bien.verifie && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ background: "#D1FAE5", color: "#065F46" }}>
            ✅ Vérifié
          </span>
        )}
      </div>

      {/* Prix */}
      <p className="mb-6 leading-none"
        style={{
          fontFamily: "var(--font-marcellus), serif",
          color: "#D4AF37",
          fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
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
        <span>ID : <span className="font-mono">{bien.id}</span></span>
        {bien.cree_le && (
          <span>Créé le {new Date(bien.cree_le).toLocaleDateString("fr-MA", { day: "2-digit", month: "long", year: "numeric" })}</span>
        )}
      </div>

    </div>
  );
}
