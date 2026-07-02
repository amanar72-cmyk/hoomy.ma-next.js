import Link from "next/link";
import type { Bien } from "@/lib/types";
import type { NiveauBien } from "@/components/partage/CompositionNiveaux";
import { calculerFraisAcquisition, formaterDH } from "@/lib/fraisAcquisition";

// ── Emoji dynamique selon le type de bien ─────────────────────────────────────
function emojiBien(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("villa")) return "🏡";
  if (t.includes("riad")) return "🏯";
  if (t.includes("bureau") || t.includes("local")) return "🏢";
  if (t.includes("terrain")) return "🌿";
  if (t.includes("studio")) return "🛋️";
  return "🏠";
}

function IcPin() {
  return (
    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

// ── Emoji par équipement ──────────────────────────────────────────────────────
const EQUIPEMENT_EMOJIS: Record<string, string> = {
  "balcon": "🏡",
  "terrasse": "🏡",
  "parking": "🚗",
  "garage": "🚗",
  "ascenseur": "🛗",
  "cuisine équipée": "🍳",
  "cuisine": "🍳",
  "climatisation": "❄️",
  "clim": "❄️",
  "piscine": "🏊",
  "fibre optique": "📶",
  "internet": "📶",
  "wifi": "📶",
  "sécurité": "🔒",
  "gardiennage": "🔒",
  "interphone": "🔒",
  "proche commerces": "🛍️",
  "commerces": "🛍️",
  "cave": "📦",
  "débarras": "📦",
  "jardin": "🌿",
  "espace vert": "🌿",
  "digicode": "🔐",
  "double vitrage": "🪟",
  "parquet": "🪵",
  "vue mer": "🌊",
  "vue montagne": "⛰️",
  "chauffage central": "🔥",
  "chauffage": "🔥",
  "cheminée": "🔥",
  "buanderie": "🧺",
  "dressing": "👗",
  "salle de sport": "🏋️",
  "sport": "🏋️",
  "conciergerie": "🧑‍💼",
  "gardien": "🧑‍💼",
};

function emojiEquipement(nom: string): string {
  const key = nom.toLowerCase();
  for (const [k, v] of Object.entries(EQUIPEMENT_EMOJIS)) {
    if (key.includes(k)) return v;
  }
  return "✨";
}

// ── Composant ─────────────────────────────────────────────────────────────────

const EMOJI_PIECE: Record<string, string> = {
  "salon":                    "🛋️",
  "salle à manger":           "🍽️",
  "chambre":                  "🛏️",
  "suite parentale":          "🛏️",
  "cuisine":                  "🍳",
  "salle de bain":            "🚿",
  "toilette séparée (wc)":    "🚽",
  "balcon":                   "🌿",
  "terrasse":                 "☀️",
  "bureau":                   "💼",
  "buanderie":                "🧺",
  "dressing":                 "👗",
  "garage":                   "🚗",
  "cave":                     "📦",
  "jardin":                   "🌳",
  "hall/entrée":              "🚪",
  "débarras":                 "📦",
};

function emojiPiece(type: string): string {
  return EMOJI_PIECE[type.toLowerCase()] ?? "🏠";
}

function SectionComposition({ composition }: { composition: NiveauBien[] }) {
  if (composition.length === 0) return null;
  return (
    <section className="mb-9">
      <h2
        className="text-xl font-normal mb-6"
        style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--primaire)" }}
      >
        Composition du bien
      </h2>
      <div className="flex flex-col gap-4">
        {composition.map((niveau, i) => (
          <div
            key={i}
            className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid #EDE7D7" }}
          >
            {/* En-tête niveau */}
            <div
              className="px-5 py-3"
              style={{ background: "var(--fond-secondaire)", borderBottom: "1px solid #EDE7D7" }}
            >
              <p className="text-sm font-semibold" style={{ color: "var(--primaire)" }}>
                {niveau.niveau}
              </p>
            </div>
            {/* Pièces */}
            {niveau.pieces.length > 0 ? (
              <div className="px-5 py-4 flex flex-wrap gap-3">
                {niveau.pieces.map((piece, j) => (
                  <div
                    key={j}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl"
                    style={{ background: "#fff", border: "1px solid #F0EDE5" }}
                  >
                    <span className="text-lg leading-none">{emojiPiece(piece.type)}</span>
                    <div>
                      <p className="text-sm font-medium leading-none" style={{ color: "var(--primaire)" }}>
                        {piece.nombre > 1 ? `${piece.nombre} ` : ""}{piece.type}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-5 py-3 text-sm" style={{ color: "var(--texte-tertiaire)" }}>
                Aucune pièce renseignée
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function InfosBien({ bien }: { bien: Bien }) {
  const equipements = (bien.equipements ?? []) as string[];
  const composition = (bien.composition ?? []) as NiveauBien[];
  const estVente = bien.transaction !== "location";
  const frais = estVente ? calculerFraisAcquisition(bien.prix) : null;

  return (
    <div>

      {/* ── Référence + badge type ─────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {bien.reference && (
          <span
            className="text-xs font-mono px-2.5 py-1 rounded-lg"
            style={{ background: "var(--bordure-legere)", color: "var(--texte-brun)" }}
          >
            {bien.reference}
          </span>
        )}
        <span
          className="text-xs font-medium px-2.5 py-1 rounded-lg"
          style={{ background: "var(--fond-vert-leger)", color: "var(--primaire-clair)" }}
        >
          {bien.type}
        </span>
        {bien.verifie ? (
          <span
            className="text-xs font-medium px-2.5 py-1 rounded-lg flex items-center gap-1"
            style={{ background: "#E8F5EE", color: "var(--primaire-clair)" }}
          >
            ✅ Bien vérifié
          </span>
        ) : (
          <span
            className="text-xs font-medium px-2.5 py-1 rounded-lg flex items-center gap-1"
            style={{ background: "var(--primaire)", color: "#fff" }}
          >
            Bientôt disponible
          </span>
        )}
      </div>

      {/* ── Avertissement bien en traitement ─────────────────────────── */}
      {!bien.verifie && (
        <div
          className="rounded-xl px-4 py-3 mb-6 flex items-start gap-2.5 text-sm"
          style={{ background: "var(--fond-accent)", border: "1px solid #EDE7D7", color: "var(--texte-secondaire)" }}
        >
          <span className="flex-shrink-0 mt-0.5">ℹ️</span>
          <span>
            Cette annonce sera bientôt disponible. Les photos sont temporairement floutées et
            seront visibles en clair dès la validation par nos équipes.
          </span>
        </div>
      )}

      {/* ── Titre ─────────────────────────────────────────────────────── */}
      <h1
        className="font-normal leading-tight mb-4"
        style={{
          fontFamily: "var(--font-marcellus), serif",
          color: "var(--primaire)",
          fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
        }}
      >
        {bien.titre}
      </h1>

      {/* ── Localisation ──────────────────────────────────────────────── */}
      <p className="flex items-center gap-1.5 text-sm mb-6" style={{ color: "var(--texte-secondaire)" }}>
        <IcPin />
        {bien.quartier ? `${bien.quartier}, ` : ""}{bien.ville}
      </p>

      {/* ── Caractéristiques — style emoji moderne ────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-8">
        {bien.surface > 0 && (
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
            style={{ background: "var(--fond-secondaire)", border: "1px solid #EDE7D7" }}
          >
            <span className="text-xl leading-none">📐</span>
            <div>
              <p className="text-sm font-semibold leading-none" style={{ color: "var(--primaire)" }}>
                {bien.surface} m²
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--texte-brun)" }}>Surface</p>
            </div>
          </div>
        )}
        {bien.type !== "Terrain" && bien.chambres > 0 && (
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
            style={{ background: "var(--fond-secondaire)", border: "1px solid #EDE7D7" }}
          >
            <span className="text-xl leading-none">🛏️</span>
            <div>
              <p className="text-sm font-semibold leading-none" style={{ color: "var(--primaire)" }}>
                {bien.chambres}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--texte-brun)" }}>
                {bien.chambres > 1 ? "Chambres" : "Chambre"}
              </p>
            </div>
          </div>
        )}
        {bien.type !== "Terrain" && bien.salles_bain > 0 && (
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
            style={{ background: "var(--fond-secondaire)", border: "1px solid #EDE7D7" }}
          >
            <span className="text-xl leading-none">🚿</span>
            <div>
              <p className="text-sm font-semibold leading-none" style={{ color: "var(--primaire)" }}>
                {bien.salles_bain}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--texte-brun)" }}>
                {bien.salles_bain > 1 ? "Salles de bain" : "Salle de bain"}
              </p>
            </div>
          </div>
        )}
        <div
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
          style={{ background: "var(--fond-secondaire)", border: "1px solid #EDE7D7" }}
        >
          <span className="text-xl leading-none">{emojiBien(bien.type)}</span>
          <div>
            <p className="text-sm font-semibold leading-none" style={{ color: "var(--primaire)" }}>
              {bien.type}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--texte-brun)" }}>Type</p>
          </div>
        </div>
      </div>

      {/* ── Séparateur ────────────────────────────────────────────────── */}
      <div className="mb-8" style={{ height: 1, background: "linear-gradient(to right, #D4AF37, transparent)" }} />

      {/* ── Équipements ───────────────────────────────────────────────── */}
      {equipements.length > 0 && (
        <section className="mb-9">
          <h2 className="text-xl font-normal mb-6"
            style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--primaire)" }}>
            Équipements &amp; prestations
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {equipements.map((e) => (
              <div
                key={e}
                className="flex flex-col items-center justify-center gap-2 px-3 py-4 rounded-2xl cursor-default select-none transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D4AF37] hover:shadow-[0_4px_16px_rgba(212,175,55,0.15)]"
                style={{
                  background: "#fff",
                  border: "1px solid #E8E0D0",
                  boxShadow: "0 1px 4px rgba(15,76,58,0.04)",
                }}
              >
                <span className="text-2xl leading-none">{emojiEquipement(e)}</span>
                <span
                  className="text-xs font-medium text-center leading-tight"
                  style={{ color: "var(--primaire)" }}
                >
                  {e}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Composition par niveau ────────────────────────────────────── */}
      {composition.length > 0 && <SectionComposition composition={composition} />}

      {/* ── Estimation des frais — vente uniquement ───────────────────── */}
      {estVente && frais && (
        <section className="mb-8">
          <h2 className="text-xl font-normal mb-5"
            style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--primaire)" }}>
            💰 Estimation du coût total
          </h2>
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid #EDE7D7", background: "var(--fond-secondaire)" }}
          >
            {/* Prix du bien */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid #EDE7D7" }}
            >
              <span className="text-sm" style={{ color: "var(--texte-corps)" }}>Prix du bien</span>
              <span className="text-sm font-semibold" style={{ color: "var(--primaire)" }}>
                {formaterDH(bien.prix)}
              </span>
            </div>

            {/* Droits d'enregistrement */}
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: "1px solid #F5F0E8", background: "var(--fond-principal)" }}
            >
              <span className="text-sm" style={{ color: "var(--texte-secondaire)" }}>
                Droits d'enregistrement <span className="text-xs opacity-60">(4%)</span>
              </span>
              <span className="text-sm" style={{ color: "var(--texte-corps)" }}>
                {formaterDH(frais.droits)}
              </span>
            </div>

            {/* Conservation foncière */}
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: "1px solid #F5F0E8", background: "var(--fond-principal)" }}
            >
              <span className="text-sm" style={{ color: "var(--texte-secondaire)" }}>
                Conservation foncière <span className="text-xs opacity-60">(1,5%)</span>
              </span>
              <span className="text-sm" style={{ color: "var(--texte-corps)" }}>
                {formaterDH(frais.conservation)}
              </span>
            </div>

            {/* Honoraires notaire */}
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: "1px solid #F5F0E8", background: "var(--fond-principal)" }}
            >
              <span className="text-sm" style={{ color: "var(--texte-secondaire)" }}>
                Honoraires notaire TTC
              </span>
              <span className="text-sm" style={{ color: "var(--texte-corps)" }}>
                {formaterDH(frais.honorairesTTC)}
              </span>
            </div>

            {/* Frais divers */}
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ borderBottom: "1px solid #EDE7D7", background: "var(--fond-principal)" }}
            >
              <span className="text-sm" style={{ color: "var(--texte-secondaire)" }}>
                Timbres & frais divers
              </span>
              <span className="text-sm" style={{ color: "var(--texte-corps)" }}>
                {formaterDH(frais.fraisDivers)}
              </span>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-sm font-semibold" style={{ color: "var(--primaire)" }}>
                Coût total estimé
              </span>
              <span
                className="text-base font-bold"
                style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--accent)" }}
              >
                {formaterDH(frais.coutTotal)}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2 mt-3 px-1">
            <span className="text-xs mt-0.5 flex-shrink-0">ℹ️</span>
            <p className="text-xs leading-relaxed" style={{ color: "var(--texte-tertiaire)" }}>
              Estimation indicative basée sur les barèmes en vigueur au Maroc. Les frais réels peuvent
              varier. Consultez un notaire pour un calcul précis.{" "}
              <Link href={`/frais-acquisition?prix=${bien.prix}`}
                className="underline underline-offset-2 hover:opacity-70"
                style={{ color: "var(--primaire-clair)", textDecoration: "none" }}>
                Voir le détail complet →
              </Link>
            </p>
          </div>
        </section>
      )}

    </div>
  );
}
