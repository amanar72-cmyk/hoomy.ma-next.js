"use client";

import { useEffect, useMemo, useState } from "react";
import {
  rechercherContacts,
  creerContactRepertoire,
  resoudreContactDepuisProprietaire,
  type ContactOption,
} from "@/lib/contacts/actions";

// Sélecteur de contact pour la création manuelle d'une demande de recherche :
// cherche dans LES DEUX répertoires (`contacts` acheteurs/locataires ET
// `proprietaires` vendeurs — une même personne peut vendre un bien et en
// chercher un autre). demandes_recherche.contact_id référence toujours
// `contacts` : choisir un résultat "propriétaire" bascule silencieusement
// vers une fiche contact (upsert par téléphone, dédoublonné). Le téléphone
// dédoublonne toujours côté serveur — jamais d'erreur "doublon" ici, la
// fiche existante est simplement réutilisée.

type Props = {
  valeur: string | null;
  onChange: (id: string | null, contact: ContactOption | null) => void;
};

const CHAMP =
  "w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all";
const CHAMP_STYLE = { borderColor: "#E0DAC8", color: "#1f2a24", background: "#fff" };

function libelle(c: ContactOption): string {
  return [c.prenom, c.nom].filter(Boolean).join(" ");
}

export default function SelecteurContact({ valeur, onChange }: Props) {
  const [recherche, setRecherche] = useState("");
  const [resultats, setResultats] = useState<ContactOption[]>([]);
  const [recherchEnCours, setRechercheEnCours] = useState(false);
  const [modeCreation, setModeCreation] = useState(false);
  const [selectionne, setSelectionne] = useState<ContactOption | null>(null);

  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [creationEnCours, setCreationEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resolutionEnCours, setResolutionEnCours] = useState<string | null>(null);

  // Recherche live débattue (250 ms) — setState toujours différé d'une frame
  // (jamais synchrone dans le corps de l'effect).
  useEffect(() => {
    const q = recherche.trim();
    let annule = false;
    if (!q) {
      const raf = requestAnimationFrame(() => setResultats([]));
      return () => cancelAnimationFrame(raf);
    }
    const raf = requestAnimationFrame(() => setRechercheEnCours(true));
    const t = setTimeout(async () => {
      try {
        const r = await rechercherContacts(q);
        if (!annule) setResultats(r);
      } finally {
        if (!annule) setRechercheEnCours(false);
      }
    }, 250);
    return () => { annule = true; cancelAnimationFrame(raf); clearTimeout(t); };
  }, [recherche]);

  const contactActuel = useMemo(() => {
    if (!valeur) return null;
    return selectionne?.id === valeur ? selectionne : null;
  }, [valeur, selectionne]);

  function choisir(c: ContactOption) {
    setSelectionne(c);
    onChange(c.id, c);
  }

  // Un résultat "propriétaire" n'a pas de contact_id utilisable tel quel :
  // bascule silencieuse vers une fiche contacts (upsert par téléphone) avant
  // de le retenir — demandes_recherche.contact_id référence toujours contacts.
  async function choisirDepuisProprietaire(p: ContactOption) {
    setErreur(null);
    setResolutionEnCours(p.id);
    try {
      const resultat = await resoudreContactDepuisProprietaire(p.id);
      if (resultat.ok) {
        choisir({ ...p, id: resultat.id, source: "contact" });
      } else {
        setErreur(resultat.erreur);
      }
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setResolutionEnCours(null);
    }
  }

  async function creerRapide() {
    if (creationEnCours) return;
    setErreur(null);
    setCreationEnCours(true);
    try {
      const resultat = await creerContactRepertoire({
        nom, prenom: prenom || null, telephone, email: email || null,
      });
      if (resultat.ok) {
        const fiche: ContactOption = {
          id: resultat.id, source: "contact", nom: nom.trim(), prenom: prenom.trim() || null,
          telephone: telephone.trim(), email: email.trim() || null,
        };
        choisir(fiche);
        setModeCreation(false);
        setNom(""); setPrenom(""); setTelephone(""); setEmail("");
      } else {
        setErreur(resultat.erreur);
      }
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setCreationEnCours(false);
    }
  }

  // ── Fiche sélectionnée ──────────────────────────────────────────────────────
  if (contactActuel) {
    return (
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3"
        style={{ background: "#E8F5ED", border: "1px solid #C9E4D4" }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: "#0F4C3A", color: "#fff" }}
          >
            {contactActuel.nom.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "#0F4C3A" }}>{libelle(contactActuel)}</p>
            <p className="text-xs" style={{ color: "#6B7A71" }}>
              {contactActuel.telephone}{contactActuel.email ? ` · ${contactActuel.email}` : ""}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setSelectionne(null); onChange(null, null); }}
          className="text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer"
          style={{ background: "#fff", color: "#6B7A71", border: "1px solid #E0DAC8" }}
        >
          Changer
        </button>
      </div>
    );
  }

  // ── Mode création rapide ─────────────────────────────────────────────────────
  if (modeCreation) {
    return (
      <div className="rounded-xl p-4 space-y-3" style={{ background: "#FAF8F2", border: "1px solid #E0DAC8" }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom *" maxLength={100} className={CHAMP} style={CHAMP_STYLE} />
          <input value={prenom} onChange={(e) => setPrenom(e.target.value)} placeholder="Prénom" maxLength={100} className={CHAMP} style={CHAMP_STYLE} />
        </div>
        <input value={telephone} onChange={(e) => setTelephone(e.target.value)} type="tel" placeholder="Téléphone * (ex : 06 12 34 56 78)" className={CHAMP} style={CHAMP_STYLE} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email (optionnel)" className={CHAMP} style={CHAMP_STYLE} />

        {erreur && (
          <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "#FDF3F2", color: "#B3412F", border: "1px solid #F2D6D1" }}>
            {erreur}
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={creerRapide}
            disabled={creationEnCours || !nom.trim() || !telephone.trim()}
            className="px-4 py-2 rounded-lg text-xs font-medium cursor-pointer disabled:opacity-50"
            style={{ background: "#0F4C3A", color: "#fff" }}
          >
            {creationEnCours ? "Enregistrement…" : "Créer / associer la fiche"}
          </button>
          <button
            type="button"
            onClick={() => { setModeCreation(false); setErreur(null); }}
            className="px-4 py-2 rounded-lg text-xs cursor-pointer"
            style={{ background: "#fff", color: "#6B7A71", border: "1px solid #E0DAC8" }}
          >
            Annuler
          </button>
        </div>
        <p className="text-[11px]" style={{ color: "#9DB8AD" }}>
          Un contact existe déjà avec ce téléphone ? Sa fiche sera automatiquement réutilisée.
        </p>
      </div>
    );
  }

  // ── Mode recherche ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      <input
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Rechercher un contact par nom ou téléphone…"
        className={CHAMP}
        style={CHAMP_STYLE}
      />
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #F0EDE5" }}>
        {recherche.trim() === "" ? (
          <p className="px-4 py-3 text-xs" style={{ color: "#9DB8AD" }}>
            Tapez un nom ou un numéro pour chercher dans le répertoire.
          </p>
        ) : recherchEnCours ? (
          <p className="px-4 py-3 text-xs" style={{ color: "#9DB8AD" }}>Recherche…</p>
        ) : resultats.length === 0 ? (
          <p className="px-4 py-3 text-xs" style={{ color: "#9DB8AD" }}>Aucun résultat pour cette recherche.</p>
        ) : (
          resultats.map((c) => {
            const enResolution = resolutionEnCours === c.id;
            return (
              <button
                key={`${c.source}-${c.id}`}
                type="button"
                onClick={() => (c.source === "proprietaire" ? choisirDepuisProprietaire(c) : choisir(c))}
                disabled={enResolution}
                className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left cursor-pointer hover:opacity-90 disabled:opacity-60"
                style={{ background: "#fff", borderBottom: "1px solid #F0EDE5" }}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded flex-shrink-0"
                    style={
                      c.source === "proprietaire"
                        ? { background: "#FDF3E0", color: "#92400E" }
                        : { background: "#E8F5ED", color: "#0F4C3A" }
                    }
                  >
                    {c.source === "proprietaire" ? "Propriétaire" : "Contact"}
                  </span>
                  <span className="text-sm font-medium truncate" style={{ color: "#3D4A42" }}>{libelle(c)}</span>
                </span>
                <span className="text-xs flex-shrink-0" style={{ color: "#9DB8AD" }}>
                  {enResolution ? "Association…" : c.telephone}
                </span>
              </button>
            );
          })
        )}
        <button
          type="button"
          onClick={() => setModeCreation(true)}
          className="w-full px-4 py-2.5 text-left text-sm font-medium cursor-pointer"
          style={{ background: "#FAF8F2", color: "#0F4C3A" }}
        >
          + Créer un nouveau contact
        </button>
      </div>
    </div>
  );
}
