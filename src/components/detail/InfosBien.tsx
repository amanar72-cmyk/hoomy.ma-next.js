import Link from "next/link";
import type { Bien } from "@/lib/types";
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

function IcCheck() {
  return (
    <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ── Composant ─────────────────────────────────────────────────────────────────

export default function InfosBien({ bien }: { bien: Bien }) {
  const equipements = (bien.equipements ?? []) as string[];
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
        {bien.verifie && (
          <span
            className="text-xs font-medium px-2.5 py-1 rounded-lg flex items-center gap-1"
            style={{ background: "#E8F5EE", color: "var(--primaire-clair)" }}
          >
            ✅ Bien vérifié
          </span>
        )}
      </div>

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

      {/* ── Prix — masqué sur mobile (visible dans la barre flottante) ── */}
      <div className="hidden lg:block mb-8">
        <p
          className="leading-none"
          style={{
            fontFamily: "var(--font-marcellus), serif",
            color: "var(--accent)",
            fontSize: "clamp(2rem, 4vw, 3rem)",
          }}
        >
          {bien.prix.toLocaleString("fr-FR")}{" "}
          <span style={{ fontSize: "0.55em", color: "var(--accent-fort)" }}>DH</span>
          {!estVente && (
            <span
              className="ml-1"
              style={{ fontSize: "0.4em", color: "var(--texte-brun)", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 400 }}
            >
              /mois
            </span>
          )}
        </p>
      </div>

      {/* ── Caractéristiques — style emoji moderne ────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-10">
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
        {bien.chambres > 0 && (
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
        {bien.salles_bain > 0 && (
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
      <div className="mb-10" style={{ height: 1, background: "linear-gradient(to right, #D4AF37, transparent)" }} />

      {/* ── Description ───────────────────────────────────────────────── */}
      {(() => {
        const langue: string = "fr";
        const texte = langue === "ar" && bien.description_ar ? bien.description_ar : bien.description;
        const estAr = langue === "ar" && Boolean(bien.description_ar);
        if (!texte) return null;
        return (
          <section className="mb-12">
            <h2 className="text-xl font-normal mb-5"
              style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--primaire)" }}>
              Description
            </h2>
            <p
              className="leading-8 whitespace-pre-line"
              dir={estAr ? "rtl" : "ltr"}
              style={{ color: "#4B5563", fontSize: "0.9375rem", fontFamily: estAr ? "serif" : undefined }}
            >
              {texte}
            </p>
          </section>
        );
      })()}

      {/* ── Équipements ───────────────────────────────────────────────── */}
      {equipements.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-normal mb-6"
            style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--primaire)" }}>
            Équipements & prestations
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
            {equipements.map((e) => (
              <div key={e} className="flex items-center gap-3">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--fond-vert-leger)", color: "var(--primaire-clair)" }}
                >
                  <IcCheck />
                </span>
                <span className="text-sm" style={{ color: "#374151" }}>{e}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Estimation des frais — vente uniquement ───────────────────── */}
      {estVente && frais && (
        <section className="mb-10">
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

      {/* ── Honoraires de commercialisation ───────────────────────────── */}
      <section
        className="mb-10 rounded-2xl px-5 py-4 flex items-start gap-3"
        style={{ background: "var(--fond-accent)", border: "1px solid #EDE7D7" }}
      >
        <span className="text-xl flex-shrink-0 mt-0.5">🤝</span>
        <div>
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--primaire)" }}>
            Commercialisé par HOOMY.MA
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--texte-secondaire)" }}>
            Ce bien est présenté par nos conseillers immobiliers. Des honoraires de mise
            en relation peuvent s'appliquer selon les conditions convenues lors de votre
            prise de contact. N'hésitez pas à nous contacter pour en savoir plus.
          </p>
        </div>
      </section>

    </div>
  );
}
