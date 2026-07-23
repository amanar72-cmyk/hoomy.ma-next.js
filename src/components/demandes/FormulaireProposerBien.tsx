"use client";

import { useState } from "react";
import Link from "next/link";

// Formulaire public "Proposer un bien" — SANS COMPTE, rattaché à une demande
// de recherche publiée. Poste vers /api/demandes/proposer (service_role) :
// aucune écriture directe côté client, voir demandes_recherche.sql.

type Props = {
  demandeId: string;
  reference: string;
};

const CHAMP = "w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2";
const CHAMP_STYLE = { borderColor: "var(--bordure-chaude)", color: "var(--texte-principal)", background: "var(--fond-secondaire)" };
const LABEL = "block text-xs font-medium mb-1.5";
const LABEL_STYLE = { color: "var(--texte-secondaire)" };

const NB_PHOTOS_MAX = 6;
const TAILLE_MAX = 5 * 1024 * 1024;

export default function FormulaireProposerBien({ demandeId, reference }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const [profil, setProfil] = useState<"particulier" | "agence">("particulier");
  const [photos, setPhotos] = useState<File[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  // Capturé au montage du formulaire (anti-bot : délai minimal avant envoi).
  const [afficheA] = useState(() => Date.now());

  function gererPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const fichiers = Array.from(e.target.files ?? []);
    if (fichiers.length > NB_PHOTOS_MAX) {
      setErreur(`Maximum ${NB_PHOTOS_MAX} photos.`);
      return;
    }
    const troGrosse = fichiers.find((f) => f.size > TAILLE_MAX);
    if (troGrosse) {
      setErreur(`« ${troGrosse.name} » dépasse 5 Mo.`);
      return;
    }
    setErreur(null);
    setPhotos(fichiers);
  }

  async function soumettre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);

    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("demande_id", demandeId);
    fd.set("affiche_a", String(afficheA));
    photos.forEach((f) => fd.append("photos", f));

    try {
      const res = await fetch("/api/demandes/proposer", { method: "POST", body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setErreur(data?.erreur ?? "Envoi impossible. Réessayez dans un instant.");
        setEnvoi(false);
        return;
      }
      setSucces(true);
    } catch {
      setErreur("Connexion impossible. Réessayez dans un instant.");
      setEnvoi(false);
    }
  }

  if (succes) {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: "var(--fond-vert-leger)", border: "1px solid var(--bordure)" }}>
        <p className="text-lg font-semibold mb-2" style={{ color: "var(--primaire)", fontFamily: "var(--font-marcellus), serif" }}>
          Proposition envoyée
        </p>
        <p className="text-sm" style={{ color: "var(--texte-corps)" }}>
          Merci ! Un conseiller HOOMY va l&apos;étudier et reviendra vers vous si elle correspond à la demande {reference}.
        </p>
      </div>
    );
  }

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="w-full py-4 rounded-2xl text-sm font-semibold cursor-pointer transition-opacity hover:opacity-90"
        style={{ background: "var(--accent)", color: "var(--texte-sur-accent)" }}
      >
        Proposer un bien pour cette demande
      </button>
    );
  }

  return (
    <form onSubmit={soumettre} className="rounded-2xl p-6 flex flex-col gap-5" style={{ background: "var(--fond-secondaire)", border: "1px solid var(--bordure)" }}>
      <div>
        <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--texte-principal)", fontFamily: "var(--font-marcellus), serif" }}>
          Proposer un bien
        </h2>
        <p className="text-xs" style={{ color: "var(--texte-tertiaire)" }}>Pour la demande {reference} — sans compte, en 2 minutes.</p>
      </div>

      {/* Honeypot invisible — doit rester vide */}
      <input type="text" name="site_web" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      {/* ── Identité ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL} style={LABEL_STYLE}>Nom *</label>
          <input name="nom" required maxLength={100} className={CHAMP} style={CHAMP_STYLE} />
        </div>
        <div>
          <label className={LABEL} style={LABEL_STYLE}>Prénom</label>
          <input name="prenom" maxLength={100} className={CHAMP} style={CHAMP_STYLE} />
        </div>
        <div>
          <label className={LABEL} style={LABEL_STYLE}>Téléphone *</label>
          <input name="telephone" type="tel" required placeholder="06 12 34 56 78" className={CHAMP} style={CHAMP_STYLE} />
        </div>
        <div>
          <label className={LABEL} style={LABEL_STYLE}>Email</label>
          <input name="email" type="email" className={CHAMP} style={CHAMP_STYLE} />
        </div>
      </div>

      <div>
        <label className={LABEL} style={LABEL_STYLE}>Vous êtes *</label>
        <div className="flex gap-3">
          {(["particulier", "agence"] as const).map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "var(--texte-corps)" }}>
              <input type="radio" name="profil_proposeur" value={p} checked={profil === p} onChange={() => setProfil(p)} />
              {p === "particulier" ? "Particulier (propriétaire du bien)" : "Agence"}
            </label>
          ))}
        </div>
      </div>
      {profil === "agence" && (
        <div>
          <label className={LABEL} style={LABEL_STYLE}>Nom de l&apos;agence *</label>
          <input name="nom_agence" required={profil === "agence"} maxLength={150} className={CHAMP} style={CHAMP_STYLE} />
        </div>
      )}

      {/* ── Le bien ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL} style={LABEL_STYLE}>Type de bien *</label>
          <select name="type" required className={CHAMP} style={CHAMP_STYLE}>
            <option value="">Sélectionner</option>
            {["Appartement", "Villa", "Riad", "Bureau", "Terrain"].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL} style={LABEL_STYLE}>Ville *</label>
          <input name="ville" required maxLength={60} className={CHAMP} style={CHAMP_STYLE} />
        </div>
        <div>
          <label className={LABEL} style={LABEL_STYLE}>Quartier</label>
          <input name="quartier" maxLength={80} className={CHAMP} style={CHAMP_STYLE} />
        </div>
        <div>
          <label className={LABEL} style={LABEL_STYLE}>Adresse approximative</label>
          <input name="adresse_approx" maxLength={150} className={CHAMP} style={CHAMP_STYLE} />
        </div>
        <div>
          <label className={LABEL} style={LABEL_STYLE}>Prix (DH)</label>
          <input name="prix" type="number" min={0} className={CHAMP} style={CHAMP_STYLE} />
        </div>
        <div>
          <label className={LABEL} style={LABEL_STYLE}>Surface (m²)</label>
          <input name="surface" type="number" min={0} className={CHAMP} style={CHAMP_STYLE} />
        </div>
        <div>
          <label className={LABEL} style={LABEL_STYLE}>Chambres</label>
          <input name="chambres" type="number" min={0} className={CHAMP} style={CHAMP_STYLE} />
        </div>
        <div>
          <label className={LABEL} style={LABEL_STYLE}>Salles de bain</label>
          <input name="salles_bain" type="number" min={0} className={CHAMP} style={CHAMP_STYLE} />
        </div>
        <div>
          <label className={LABEL} style={LABEL_STYLE}>Étage</label>
          <input name="etage" maxLength={30} className={CHAMP} style={CHAMP_STYLE} />
        </div>
        <div>
          <label className={LABEL} style={LABEL_STYLE}>Lien d&apos;annonce existante</label>
          <input name="lien_annonce" type="url" placeholder="https://…" className={CHAMP} style={CHAMP_STYLE} />
        </div>
      </div>

      <div>
        <label className={LABEL} style={LABEL_STYLE}>Description</label>
        <textarea name="description" rows={3} maxLength={1500} className={CHAMP} style={CHAMP_STYLE} />
      </div>
      <div>
        <label className={LABEL} style={LABEL_STYLE}>Atouts du bien</label>
        <textarea name="atouts" rows={2} maxLength={500} placeholder="Vue mer, piscine, parking, récent…" className={CHAMP} style={CHAMP_STYLE} />
      </div>

      <div>
        <label className={LABEL} style={LABEL_STYLE}>Photos (optionnel, {NB_PHOTOS_MAX} max, 5 Mo/photo)</label>
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={gererPhotos} className="text-sm" style={{ color: "var(--texte-corps)" }} />
        {photos.length > 0 && <p className="text-xs mt-1" style={{ color: "var(--texte-tertiaire)" }}>{photos.length} photo{photos.length > 1 ? "s" : ""} sélectionnée{photos.length > 1 ? "s" : ""}</p>}
      </div>

      <label className="flex items-start gap-2.5 text-xs cursor-pointer" style={{ color: "var(--texte-corps)" }}>
        <input type="checkbox" name="consentement" required className="mt-0.5" />
        <span>
          J&apos;accepte que ces informations soient traitées par HOOMY.MA dans le cadre de cette mise en relation,
          conformément à la <Link href="/confidentialite" className="underline" style={{ color: "var(--primaire-clair)" }}>politique de confidentialité</Link>. *
        </span>
      </label>

      {erreur && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "#FDF3F2", color: "#B3412F", border: "1px solid #F2D6D1" }}>
          {erreur}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={envoi}
          className="px-6 py-3 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-60"
          style={{ background: "var(--primaire)", color: "var(--fond-secondaire)" }}
        >
          {envoi ? "Envoi…" : "Envoyer ma proposition"}
        </button>
        <button type="button" onClick={() => setOuvert(false)} className="text-sm" style={{ color: "var(--texte-tertiaire)" }}>
          Annuler
        </button>
      </div>
    </form>
  );
}
