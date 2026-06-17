import Link from "next/link";
import BadgeStatut from "./BadgeStatut";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BienClient = {
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
  agent_id: string | null;
  date_soumission: string | null;
  date_affectation: string | null;
  verifie: boolean;
};

// ── Utilitaires ───────────────────────────────────────────────────────────────

function formaterPrix(prix: number, transaction: string) {
  const m = prix.toLocaleString("fr-MA");
  return transaction === "location" ? `${m} DH/mois` : `${m} DH`;
}

function formaterDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-MA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// ── Stepper d'avancement ──────────────────────────────────────────────────────

const ETAPES = [
  { label: "Soumis",         detail: "Votre bien a bien été reçu" },
  { label: "Attribution",    detail: "Recherche d'un conseiller" },
  { label: "Pris en charge", detail: "Un conseiller s'occupe de vous" },
  { label: "Publié",         detail: "Votre annonce est en ligne" },
];

// Mappe un statut à l'étape accomplie (0-indexé, -1 = pas encore soumis)
const ETAPE_MAP: Record<string, number> = {
  en_attente_affectation: 0,
  dans_la_file:           1,
  affecte:                2,
  finalise:               3,
  transacte:              3,
};

const STATUTS_REFUS = ["rejete", "suspendu", "archive"];
const STATUTS_REFUS_LABELS: Record<string, { label: string; couleur: string; icone: string }> = {
  rejete:   { label: "Votre annonce a été refusée.",  couleur: "#FEE2E2", icone: "✗" },
  suspendu: { label: "Votre annonce est suspendue.",  couleur: "#FEF3C7", icone: "⚠" },
  archive:  { label: "Votre annonce a été archivée.", couleur: "#F3F4F6", icone: "◷" },
};

function Stepper({ statut }: { statut: string | null }) {
  const s = statut ?? "brouillon";

  if (STATUTS_REFUS.includes(s)) {
    const info = STATUTS_REFUS_LABELS[s];
    return (
      <div
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
        style={{ background: info.couleur, color: "#374151" }}
      >
        <span className="font-bold text-base">{info.icone}</span>
        <span>{info.label}</span>
        <span className="ml-2 text-xs" style={{ color: "#6B7280" }}>
          Contactez-nous si vous avez des questions.
        </span>
      </div>
    );
  }

  const etapeActuelle = ETAPE_MAP[s] ?? -1;

  return (
    <div className="flex items-start gap-0 w-full">
      {ETAPES.map((etape, i) => {
        const estFait   = i < etapeActuelle;
        const estActuel = i === etapeActuelle;
        const estFutur  = i > etapeActuelle;

        return (
          <div key={i} className="flex items-center flex-1 min-w-0">
            {/* Étape */}
            <div className="flex flex-col items-center flex-shrink-0" style={{ minWidth: 48 }}>
              {/* Cercle */}
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                style={{
                  background: estFait ? "#146C43" : estActuel ? "#0F4C3A" : "#F0EDE5",
                  color:      estFait || estActuel ? "#fff" : "#C4D8CE",
                  boxShadow:  estActuel ? "0 0 0 3px rgba(15,76,58,0.15)" : "none",
                }}
              >
                {estFait ? (
                  <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              {/* Label */}
              <span
                className="text-xs mt-1 text-center leading-tight hidden sm:block"
                style={{
                  color: estFait ? "#146C43" : estActuel ? "#0F4C3A" : "#C4D8CE",
                  fontWeight: estActuel ? 600 : 400,
                  maxWidth: 60,
                }}
              >
                {etape.label}
              </span>
            </div>

            {/* Connecteur */}
            {i < ETAPES.length - 1 && (
              <div
                className="flex-1 h-0.5 mx-1 mt-[-14px]"
                style={{ background: estFait ? "#146C43" : "#E8E2D2" }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Composant carte ───────────────────────────────────────────────────────────

export default function CarteBienClient({
  bien,
  agentNom,
}: {
  bien: BienClient;
  agentNom: string | null;
}) {
  const photo = bien.photos?.[0] ?? null;
  const estBrouillon = bien.statut === "brouillon";
  const estPublie    = bien.statut === "finalise" || bien.statut === "transacte";
  const aAgent       = (bien.statut === "affecte" || bien.statut === "finalise" || bien.statut === "transacte") && agentNom;
  const lienAnnonce  = estPublie && bien.slug
    ? `/${bien.transaction === "location" ? "louer" : "acheter"}/${bien.slug}`
    : null;

  return (
    <article
      className="rounded-2xl overflow-hidden"
      style={{
        background: "#fff",
        border: "1px solid #F0EDE5",
        boxShadow: "0 2px 12px rgba(15,76,58,0.06)",
      }}
    >
      {/* ── Corps principal ──────────────────────────────────────────────── */}
      <div className="flex gap-4 p-4 pb-3">

        {/* Photo */}
        <div
          className="flex-shrink-0 rounded-xl overflow-hidden"
          style={{ width: 96, height: 80, background: "#F4F6F5" }}
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={bien.titre} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#C4D8CE" strokeWidth="1.2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1 flex-wrap">
            <p className="text-sm font-semibold leading-snug" style={{ color: "#1f2a24" }}>
              {bien.titre}
            </p>
            <BadgeStatut statut={bien.statut} />
          </div>

          <p className="text-xs mb-1.5" style={{ color: "#9DB8AD" }}>
            {bien.type}
            {bien.quartier ? ` · ${bien.quartier}` : ""}
            {" · "}{bien.ville}
            {bien.reference && (
              <span className="ml-2 font-mono" style={{ color: "#C4D8CE" }}>{bien.reference}</span>
            )}
          </p>

          <p className="text-sm font-bold" style={{ color: "#0F4C3A" }}>
            {formaterPrix(bien.prix, bien.transaction)}
          </p>

          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <p className="text-xs" style={{ color: "#C4D8CE" }}>
              Soumis le {formaterDate(bien.date_soumission)}
            </p>
            {bien.verifie && (
              <span className="text-xs font-medium" style={{ color: "#146C43" }}>✓ Vérifié</span>
            )}
            {/* Stats placeholder */}
            <span className="text-xs" style={{ color: "#E8E2D2" }}>· 0 vues · 0 contacts</span>
          </div>
        </div>
      </div>

      {/* ── Conseiller ───────────────────────────────────────────────────── */}
      {aAgent && (
        <div
          className="mx-4 mb-3 px-3 py-2 rounded-xl flex items-center gap-2"
          style={{ background: "#F0FAF4", border: "1px solid #D1FAE5" }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: "#0F4C3A", color: "#D4AF37" }}
          >
            {(agentNom ?? "?")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: "#0F4C3A" }}>
              Votre conseiller : {agentNom}
            </p>
            {bien.date_affectation && (
              <p className="text-xs" style={{ color: "#9DB8AD" }}>
                Affecté le {formaterDate(bien.date_affectation)}
              </p>
            )}
          </div>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#146C43" strokeWidth="2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.61 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 17z" />
          </svg>
        </div>
      )}

      {/* ── Barre d'avancement ───────────────────────────────────────────── */}
      <div className="px-4 pb-4">
        <Stepper statut={bien.statut} />
      </div>

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      {(lienAnnonce || estBrouillon) && (
        <div
          className="px-4 py-3 flex gap-2 flex-wrap"
          style={{ borderTop: "1px solid #F8F5EE" }}
        >
          {lienAnnonce && (
            <Link
              href={lienAnnonce}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-opacity hover:opacity-90"
              style={{ background: "#0F4C3A", color: "#fff", textDecoration: "none" }}
            >
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Voir l&apos;annonce
            </Link>
          )}
          {estBrouillon && (
            <Link
              href={`/publier?modifier=${bien.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-xl border transition-colors hover:bg-gray-50"
              style={{ borderColor: "#E8E2D2", color: "#0F4C3A", textDecoration: "none" }}
            >
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Modifier le brouillon
            </Link>
          )}
        </div>
      )}
    </article>
  );
}
