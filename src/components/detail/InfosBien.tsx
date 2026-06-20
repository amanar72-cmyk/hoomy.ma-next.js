import type { Bien } from "@/lib/types";

// ── Icônes SVG inline ─────────────────────────────────────────────────────────

function IcSurface() {
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="var(--primaire)" strokeWidth="1.6">
      <path d="M3 3h18v18H3z" />
      <path d="M3 9h18M9 3v18" strokeDasharray="2 2" />
    </svg>
  );
}
function IcChambre() {
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="var(--primaire)" strokeWidth="1.6">
      <path d="M3 7v10M21 7v10M3 11h18" />
      <rect x="3" y="7" width="18" height="10" rx="2" />
      <path d="M9 11V9a2 2 0 0 1 4 0v2" />
    </svg>
  );
}
function IcBain() {
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="var(--primaire)" strokeWidth="1.6">
      <path d="M9 6a2 2 0 0 1 4 0v9H9V6z" />
      <path d="M3 15h18" />
      <path d="M4 15a7 7 0 0 0 16 0" />
    </svg>
  );
}
function IcType() {
  return (
    <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="var(--primaire)" strokeWidth="1.6">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function IcPin() {
  return (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
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

// ── Formatage ─────────────────────────────────────────────────────────────────

function formatPrixBase(prix: number) {
  return prix.toLocaleString("fr-FR");
}

// ── Composant ─────────────────────────────────────────────────────────────────

export default function InfosBien({ bien }: { bien: Bien }) {
  const equipements = (bien.equipements ?? []) as string[];

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

      {/* ── Prix ──────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <p
          className="leading-none"
          style={{
            fontFamily: "var(--font-marcellus), serif",
            color: "var(--accent)",
            fontSize: "clamp(2rem, 4vw, 3rem)",
          }}
        >
          {formatPrixBase(bien.prix)}{" "}
          <span style={{ fontSize: "0.55em", color: "var(--accent-fort)" }}>DH</span>
          {bien.transaction === "location" && (
            <span
              className="ml-1"
              style={{ fontSize: "0.4em", color: "var(--texte-brun)", fontFamily: "var(--font-outfit), sans-serif", fontWeight: 400 }}
            >
              /mois
            </span>
          )}
        </p>
      </div>

      {/* ── Stats cartes ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        {[
          { icone: <IcSurface />, valeur: `${bien.surface}`, unite: "m²",          label: "Surface" },
          { icone: <IcChambre />, valeur: `${bien.chambres}`, unite: "",            label: bien.chambres > 1 ? "Chambres" : "Chambre" },
          { icone: <IcBain />,    valeur: `${bien.salles_bain}`, unite: "",         label: bien.salles_bain > 1 ? "Salles de bain" : "Salle de bain" },
          { icone: <IcType />,    valeur: bien.type, unite: "",                     label: "Type" },
        ].map(({ icone, valeur, unite, label }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-2.5 px-4 py-5 rounded-2xl"
            style={{
              background: "var(--fond-secondaire)",
              border: "1px solid #EDE7D7",
              boxShadow: "0 2px 12px rgba(15,76,58,0.06)",
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--fond-vert-leger)" }}
            >
              {icone}
            </div>
            <div className="text-center">
              <p className="text-base font-semibold leading-tight" style={{ color: "var(--primaire)" }}>
                {valeur}
                {unite && <span className="text-sm font-normal ml-0.5" style={{ color: "var(--texte-brun)" }}>{unite}</span>}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--texte-brun)" }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Séparateur gold ───────────────────────────────────────────── */}
      <div className="mb-10" style={{ height: 1, background: "linear-gradient(to right, #D4AF37, transparent)" }} />

      {/* ── Description ───────────────────────────────────────────────── */}
      {bien.description && (
        <section className="mb-12">
          <h2
            className="text-xl font-normal mb-5"
            style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--primaire)" }}
          >
            Description
          </h2>
          <p
            className="leading-8 whitespace-pre-line"
            style={{ color: "#4B5563", fontSize: "0.9375rem" }}
          >
            {bien.description}
          </p>
        </section>
      )}

      {/* ── Équipements ───────────────────────────────────────────────── */}
      {equipements.length > 0 && (
        <section className="mb-10">
          <h2
            className="text-xl font-normal mb-6"
            style={{ fontFamily: "var(--font-marcellus), serif", color: "var(--primaire)" }}
          >
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
    </div>
  );
}
