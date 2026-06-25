import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import FormulaireEditionBien from "@/components/admin/FormulaireEditionBien";
import { affecterBienAgent } from "@/app/admin/actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ modifier?: string }>;
};

const BADGE_STATUT: Record<string, { label: string; bg: string; color: string }> = {
  brouillon:     { label: "Brouillon",     bg: "#F5F5F5", color: "#777" },
  affecte:       { label: "Affecté",       bg: "#FEF3C7", color: "#92400E" },
  en_validation: { label: "En validation", bg: "#DBEAFE", color: "#1E40AF" },
  finalise:      { label: "Publié",        bg: "#D1FAE5", color: "#065F46" },
  transacte:     { label: "Transacté",     bg: "#F3E8FF", color: "#6B21A8" },
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
    if (error) console.error(`[admin/biens/${id}]`, error.message);
    notFound();
  }

  const modeEdition = modifier === "1";

  // ── Mode édition ───────────────────────────────────────────────────────────
  if (modeEdition) {
    return (
      <div className="p-6 lg:p-10 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href={`/admin/biens/${id}`}
            className="text-sm flex items-center gap-1 hover:opacity-70 transition-opacity"
            style={{ color: "#999", textDecoration: "none" }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Consultation
          </Link>
          <span style={{ color: "#DDD" }}>/</span>
          <span className="text-sm font-medium" style={{ color: "#111" }}>Modification</span>
        </div>

        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold mb-0.5" style={{ color: "#111" }}>
              Modifier le bien
            </h1>
            <p className="text-sm" style={{ color: "#999" }}>{bien.titre}</p>
          </div>
          {bien.reference && (
            <span className="text-xs px-3 py-1 rounded-full font-mono mt-1 flex-shrink-0"
              style={{ background: "#F5F5F5", color: "#777", border: "1px solid #E8E8E8" }}>
              {bien.reference}
            </span>
          )}
        </div>

        <FormulaireEditionBien bien={bien} />
      </div>
    );
  }

  // ── Données pour le mode lecture ───────────────────────────────────────────
  const photos      = (Array.isArray(bien.photos)      ? bien.photos      : []) as string[];
  const equipements = (Array.isArray(bien.equipements) ? bien.equipements : []) as string[];
  const statutInfo  = BADGE_STATUT[bien.statut ?? ""] ?? { label: bien.statut ?? "—", bg: "#F5F5F5", color: "#777" };

  // Agents disponibles pour l'affectation
  const { data: agentsRaw } = await supabase
    .from("profils")
    .select("id, nom_complet, role")
    .in("role", ["agent", "agence"])
    .order("nom_complet");
  const agents = (agentsRaw ?? []) as Array<{ id: string; nom_complet: string; role: string }>;

  // Agent actuellement affecté
  const agentActuel = agents.find((a) => a.id === (bien.agent_id as string | null));

  // ── Mode lecture ───────────────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">

      {/* Fil d'Ariane */}
      <div className="flex items-center gap-3 mb-4">
        <Link
          href="/admin/biens"
          className="text-sm flex items-center gap-1 hover:opacity-70 transition-opacity"
          style={{ color: "#999", textDecoration: "none" }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Biens
        </Link>
        <span style={{ color: "#DDD" }}>/</span>
        <span className="text-sm font-medium" style={{ color: "#111" }}>
          {bien.reference ?? bien.id.slice(0, 8)}
        </span>
      </div>

      {/* En-tête */}
      <div className="mb-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold mb-0.5" style={{ color: "#111" }}>
            {bien.titre}
          </h1>
          <p className="text-sm" style={{ color: "#999" }}>
            {bien.ville}{bien.quartier ? ` · ${bien.quartier}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0 flex-wrap">
          {bien.reference && (
            <span className="text-xs px-3 py-1 rounded-full font-mono"
              style={{ background: "#F5F5F5", color: "#777", border: "1px solid #E8E8E8" }}>
              {bien.reference}
            </span>
          )}
          <Link
            href={`/admin/biens/${id}?modifier=1`}
            className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
            style={{ background: "#111", color: "#fff", textDecoration: "none" }}
          >
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Modifier
          </Link>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-5">
        <span className="text-xs font-semibold px-3 py-1 rounded-full"
          style={{ background: statutInfo.bg, color: statutInfo.color }}>
          {statutInfo.label}
        </span>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ background: "#F5F5F5", color: "#666" }}>
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
            ✓ Vérifié
          </span>
        )}
      </div>

      {/* Disposition 2 colonnes : détails + affectation */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* Colonne principale */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Photos */}
          {photos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photos.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={url}
                  alt={`Photo ${i + 1}`}
                  className="rounded-xl object-cover flex-shrink-0"
                  style={{ height: 160, width: "auto", maxWidth: 260 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ))}
            </div>
          )}

          {/* Prix */}
          <p style={{ fontSize: "clamp(1.5rem, 3vw, 2.2rem)", color: "#D4AF37", fontFamily: "var(--font-marcellus),serif", lineHeight: 1 }}>
            {formaterPrix(bien.prix, bien.transaction)}
          </p>

          {/* Caractéristiques */}
          <div className="grid grid-cols-3 gap-3">
            {bien.surface > 0 && (
              <Carac label="Surface" valeur={`${bien.surface} m²`} />
            )}
            {bien.chambres > 0 && (
              <Carac label={bien.chambres > 1 ? "Chambres" : "Chambre"} valeur={`${bien.chambres}`} />
            )}
            {bien.salles_bain > 0 && (
              <Carac label="Salles de bain" valeur={`${bien.salles_bain}`} />
            )}
          </div>

          {/* Description */}
          {bien.description && (
            <div>
              <p className="text-xs font-semibold mb-1.5 uppercase tracking-wider" style={{ color: "#999" }}>Description</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#333" }}>
                {bien.description}
              </p>
            </div>
          )}

          {/* Équipements */}
          {equipements.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "#999" }}>Équipements</p>
              <div className="flex flex-wrap gap-1.5">
                {equipements.map((e) => (
                  <span key={e} className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{ background: "#F5F5F5", border: "1px solid #E8E8E8", color: "#444" }}>
                    {e}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Métadonnées */}
          <div className="pt-4 flex flex-wrap gap-4 text-xs" style={{ borderTop: "1px solid #F0F0F0", color: "#BBB" }}>
            <span>ID : <span className="font-mono">{bien.id}</span></span>
            {bien.cree_le && (
              <span>Créé le {new Date(bien.cree_le).toLocaleDateString("fr-MA", { day: "2-digit", month: "long", year: "numeric" })}</span>
            )}
            {bien.date_affectation && (
              <span>Affecté le {new Date(bien.date_affectation).toLocaleDateString("fr-MA", { day: "2-digit", month: "long", year: "numeric" })}</span>
            )}
          </div>
        </div>

        {/* Colonne latérale : Affectation */}
        <div className="flex flex-col gap-4">

          {/* Carte affectation */}
          <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
            <p className="text-xs font-semibold mb-4 uppercase tracking-wider" style={{ color: "#999" }}>
              Affectation agent
            </p>

            {/* Agent actuel */}
            {agentActuel ? (
              <div className="flex items-center gap-3 mb-4 p-3 rounded-xl" style={{ background: "#F9F9F9" }}>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold"
                  style={{ background: "#D4AF37", color: "#111" }}
                >
                  {agentActuel.nom_complet.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "#111" }}>{agentActuel.nom_complet}</p>
                  <p className="text-xs capitalize" style={{ color: "#999" }}>{agentActuel.role}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm mb-4" style={{ color: "#BBB" }}>Aucun agent affecté</p>
            )}

            {/* Formulaire d'affectation */}
            <form action={affecterBienAgent.bind(null, bien.id)}>
              <div className="flex flex-col gap-2.5">
                <select
                  name="agent_id"
                  defaultValue={(bien.agent_id as string | null) ?? ""}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none"
                  style={{ borderColor: "#E8E8E8", color: "#333", background: "#fff" }}
                >
                  <option value="">— Aucun agent —</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nom_complet} ({a.role})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl text-sm font-semibold cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ background: "#111", color: "#fff" }}
                >
                  {agentActuel ? "Réaffecter" : "Affecter"}
                </button>
              </div>
            </form>
          </div>

          {/* Lien vers le profil agent si affecté */}
          {agentActuel && (
            <Link
              href={`/admin/agents/${agentActuel.id}`}
              className="text-xs text-center hover:underline"
              style={{ color: "#999", textDecoration: "none" }}
            >
              Voir le profil de l&apos;agent →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Composant interne : carte caractéristique ─────────────────────────────────

function Carac({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div className="rounded-xl px-4 py-3" style={{ background: "#F9F9F9", border: "1px solid #F0F0F0" }}>
      <p className="text-sm font-semibold" style={{ color: "#111" }}>{valeur}</p>
      <p className="text-xs mt-0.5" style={{ color: "#999" }}>{label}</p>
    </div>
  );
}
