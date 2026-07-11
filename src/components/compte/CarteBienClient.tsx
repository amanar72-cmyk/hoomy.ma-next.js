"use client";

import { useState } from "react";
import Link from "next/link";
import BadgeStatut from "./BadgeStatut";
import { formatPhoneMaroc } from "@/lib/utils/telephone";
import { formaterPrix } from "@/lib/format";

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

export type InfoAgent = {
  nom: string;
  telephone: string | null;
  email: string | null;
  avatar_url: string | null;
};

// ── Utilitaires ───────────────────────────────────────────────────────────────


function formaterDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-MA", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

function initialesNom(nom: string) {
  const mots = nom.trim().split(/\s+/);
  return mots.length >= 2
    ? (mots[0][0] + mots[mots.length - 1][0]).toUpperCase()
    : nom.slice(0, 2).toUpperCase();
}

// ── Stepper d'avancement ──────────────────────────────────────────────────────

const ETAPES = [
  { label: "Soumis",         detail: "Votre bien a bien été reçu" },
  { label: "Attribution",    detail: "Recherche d'un conseiller" },
  { label: "Pris en charge", detail: "Un conseiller s'occupe de vous" },
  { label: "Publié",         detail: "Votre annonce est en ligne" },
];

const ETAPE_MAP: Record<string, number> = {
  en_attente_affectation: 0,
  dans_la_file:           1,
  affecte:                2,
  finalise:               3,
  transacte:              3,
};

const STATUTS_REFUS = ["rejete", "suspendu", "archive"];
const STATUTS_REFUS_LABELS: Record<string, { label: string; bg: string; icone: string }> = {
  rejete:   { label: "Votre annonce a été refusée.",  bg: "#FEE2E2", icone: "✗" },
  suspendu: { label: "Votre annonce est suspendue.",  bg: "#FEF3C7", icone: "⚠" },
  archive:  { label: "Votre annonce a été archivée.", bg: "#F3F4F6", icone: "◷" },
};

const STATUTS_AFFECTATION_EN_COURS = ["en_attente_affectation", "dans_la_file"];

function Stepper({ statut }: { statut: string | null }) {
  const s = statut ?? "brouillon";

  if (STATUTS_REFUS.includes(s)) {
    const info = STATUTS_REFUS_LABELS[s];
    return (
      <div
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
        style={{ background: info.bg, color: "#374151" }}
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

        return (
          <div key={i} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center flex-shrink-0" style={{ minWidth: 48 }}>
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
                ) : i + 1}
              </div>
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

// ── Modale conseiller (bottom sheet mobile, centré desktop) ───────────────────

function ModaleConseiller({
  agent,
  reference,
  onClose,
}: {
  agent: InfoAgent;
  reference: string | null;
  onClose: () => void;
}) {
  const tel    = formatPhoneMaroc(agent.telephone);
  const prenom = agent.nom.trim().split(/\s+/)[0];
  const msgWA  = encodeURIComponent(
    `Bonjour ${prenom}, je suis propriétaire du bien ${reference ?? ""} sur HOOMY.MA, je souhaite faire un point avec vous.`
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
      style={{ background: "rgba(15,30,20,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background:  "var(--fond-secondaire, #fff)",
          boxShadow:   "0 24px 64px rgba(15,76,58,0.25)",
        }}
      >
        {/* En-tête */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid #F0EDE5" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#9DB8AD" }}>
            Votre conseiller HOOMY
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer hover:opacity-70"
            style={{ background: "#F4F6F5", color: "#6B7A71" }}
          >
            ✕
          </button>
        </div>

        {/* Avatar + nom */}
        <div className="px-5 py-6 flex flex-col items-center text-center gap-3">
          {agent.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={agent.avatar_url}
              alt={agent.nom}
              className="w-20 h-20 rounded-full object-cover"
              style={{ border: "3px solid #E8F5ED" }}
            />
          ) : (
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold"
              style={{ background: "#0F4C3A", color: "#D4AF37" }}
            >
              {initialesNom(agent.nom)}
            </div>
          )}
          <div>
            <p
              className="text-lg font-semibold"
              style={{ fontFamily: "var(--font-marcellus, serif)", color: "#0F4C3A" }}
            >
              {agent.nom}
            </p>
            <p className="text-sm" style={{ color: "#9DB8AD" }}>Conseiller immobilier HOOMY</p>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="px-5 pb-6 flex flex-col gap-3">
          {tel.lienTel && (
            <a
              href={`tel:${tel.lienTel}`}
              className="flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
              style={{ background: "#0F4C3A", color: "#fff", textDecoration: "none" }}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.61 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 17z" />
              </svg>
              Appeler · {tel.affichage}
            </a>
          )}

          {agent.email && (
            <a
              href={`mailto:${agent.email}`}
              className="flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
              style={{
                background:     "#F0FAF4",
                color:          "#0F4C3A",
                border:         "1px solid #D1FAE5",
                textDecoration: "none",
              }}
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Envoyer un email
            </a>
          )}

          {tel.numeroWA && (
            <a
              href={`https://wa.me/${tel.numeroWA}?text=${msgWA}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
              style={{ background: "#25D366", color: "#fff", textDecoration: "none" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
              </svg>
              WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Composant carte ───────────────────────────────────────────────────────────

export default function CarteBienClient({
  bien,
  agent,
}: {
  bien: BienClient;
  agent: InfoAgent | null;
}) {
  const [modaleOuverte, setModaleOuverte] = useState(false);

  const photo          = bien.photos?.[0] ?? null;
  const estBrouillon   = bien.statut === "brouillon";
  const estPublie      = bien.statut === "finalise" || bien.statut === "transacte";
  const enAttente      = STATUTS_AFFECTATION_EN_COURS.includes(bien.statut ?? "");
  const priseEnCharge  = !!agent && bien.statut === "affecte";
  const lienAnnonce    = estPublie && bien.slug
    ? `/${bien.transaction === "location" ? "louer" : "acheter"}/${bien.slug}`
    : null;

  return (
    <>
      <article
        className="rounded-2xl overflow-hidden"
        style={{ background: "#fff", border: "1px solid #F0EDE5", boxShadow: "0 2px 12px rgba(15,76,58,0.06)" }}
      >
        {/* ── Corps principal — cliquable vers la fiche détail (lecture seule,
               dépôt des pièces justificatives) ──────────────────────────────── */}
        <Link
          href={`/mon-compte/mes-biens/${bien.id}`}
          className="flex gap-4 p-4 pb-3 hover:bg-[#FAFAF8] transition-colors"
          style={{ textDecoration: "none", color: "inherit" }}
        >

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
            </div>
          </div>

          {/* Chevron — indique que la carte s'ouvre */}
          <span className="self-center flex-shrink-0" aria-hidden="true">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#C4D8CE" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </span>
        </Link>

        {/* ── Affectation en cours ──────────────────────────────────────────── */}
        {enAttente && (
          <div
            className="mx-4 mb-3 px-3 py-2 rounded-xl flex items-center gap-2.5"
            style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}
          >
            <span className="relative flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full opacity-60" style={{ background: "#D97706" }} />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: "#F59E0B" }} />
            </span>
            <div>
              <p className="text-xs font-semibold" style={{ color: "#92400E" }}>Affectation en cours</p>
              <p className="text-xs" style={{ color: "#B45309" }}>
                Notre équipe recherche le conseiller idéal pour votre bien.
              </p>
            </div>
          </div>
        )}

        {/* ── Pas encore de conseiller (hors brouillon / en attente) ───────── */}
        {!agent && !enAttente && !estPublie && !estBrouillon && (
          <div
            className="mx-4 mb-3 px-3 py-2.5 rounded-xl text-xs"
            style={{ background: "#F8F5EE", color: "#6B7A71" }}
          >
            Votre bien est en cours de traitement — un conseiller vous sera attribué très prochainement.
          </div>
        )}

        {/* ── Carte conseiller cliquable (statut affecte) ───────────────────── */}
        {priseEnCharge && agent && (
          <button
            type="button"
            onClick={() => setModaleOuverte(true)}
            className="mx-4 mb-3 w-[calc(100%-2rem)] rounded-xl overflow-hidden cursor-pointer hover:opacity-95 transition-opacity text-left"
            style={{ border: "1px solid #D1FAE5" }}
          >
            {/* Badge "Pris en charge" */}
            <div
              className="flex items-center gap-2.5 px-3 py-2"
              style={{ background: "#F0FAF4", borderBottom: "1px solid #D1FAE5" }}
            >
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "#D1FAE5", color: "#064E3B" }}
              >
                ✓ Pris en charge
              </span>
              <span className="flex-1" />
              {bien.date_affectation && (
                <span className="text-xs" style={{ color: "#9DB8AD" }}>
                  depuis le {formaterDate(bien.date_affectation)}
                </span>
              )}
            </div>

            {/* Aperçu conseiller */}
            <div className="flex items-center gap-3 px-3 py-2.5" style={{ background: "#fff" }}>
              {agent.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={agent.avatar_url}
                  alt={agent.nom}
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: "#0F4C3A", color: "#D4AF37" }}
                >
                  {initialesNom(agent.nom)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: "#0F4C3A" }}>{agent.nom}</p>
                <p className="text-xs" style={{ color: "#9DB8AD" }}>Votre conseiller · Appuyez pour contacter</p>
              </div>
              <svg
                width="16" height="16" fill="none" viewBox="0 0 24 24"
                stroke="#0F4C3A" strokeWidth="2" className="flex-shrink-0"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </button>
        )}

        {/* ── Barre d'avancement ───────────────────────────────────────────── */}
        <div className="px-4 pb-4">
          <Stepper statut={bien.statut} />
        </div>

        {/* ── Actions ──────────────────────────────────────────────────────── */}
        {(lienAnnonce || estBrouillon) && (
          <div className="px-4 py-3 flex gap-2 flex-wrap" style={{ borderTop: "1px solid #F8F5EE" }}>
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

      {/* ── Modale conseiller ─────────────────────────────────────────────── */}
      {modaleOuverte && agent && (
        <ModaleConseiller
          agent={agent}
          reference={bien.reference}
          onClose={() => setModaleOuverte(false)}
        />
      )}
    </>
  );
}
