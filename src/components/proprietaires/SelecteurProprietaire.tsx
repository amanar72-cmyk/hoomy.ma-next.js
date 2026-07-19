"use client";

import { useMemo, useState } from "react";
import { creerProprietaire } from "@/lib/proprietaires/actions";

// Sélecteur de propriétaire (vendeur) pour les formulaires de création de
// bien (admin + agent) : chercher une fiche existante OU en créer une à la
// volée sans quitter le formulaire. Le parent garde l'id choisi dans son
// état et le rend obligatoire à la soumission.

export type ProprietaireOption = {
  id: string;
  nom: string;
  prenom: string | null;
  telephone: string;
};

type Props = {
  proprietaires: ProprietaireOption[];
  valeur: string | null;
  onChange: (id: string | null) => void;
};

const CHAMP =
  "w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all";
const CHAMP_STYLE = { borderColor: "#E0DAC8", color: "#1f2a24", background: "#fff" };

function libelle(p: ProprietaireOption): string {
  return [p.prenom, p.nom].filter(Boolean).join(" ");
}

export default function SelecteurProprietaire({ proprietaires, valeur, onChange }: Props) {
  const [recherche, setRecherche] = useState("");
  const [modeCreation, setModeCreation] = useState(false);
  // Fiches créées à la volée (pas dans la liste passée par le serveur)
  const [ajoutes, setAjoutes] = useState<ProprietaireOption[]>([]);
  // Champs de création rapide
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [creationEnCours, setCreationEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [existantId, setExistantId] = useState<string | null>(null);

  const tous = useMemo(() => [...ajoutes, ...proprietaires], [ajoutes, proprietaires]);
  const selectionne = valeur ? (tous.find((p) => p.id === valeur) ?? null) : null;

  const resultats = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return tous.slice(0, 6);
    return tous
      .filter(
        (p) =>
          libelle(p).toLowerCase().includes(q) ||
          p.telephone.replace(/\s/g, "").includes(q.replace(/\s/g, ""))
      )
      .slice(0, 8);
  }, [tous, recherche]);

  async function creerRapide() {
    if (creationEnCours) return;
    setErreur(null);
    setExistantId(null);
    setCreationEnCours(true);
    try {
      const resultat = await creerProprietaire({
        nom,
        prenom: prenom || null,
        telephone,
        email: null,
        notes: null,
      });
      if (resultat.ok) {
        const fiche: ProprietaireOption = {
          id: resultat.id,
          nom: nom.trim(),
          prenom: prenom.trim() || null,
          telephone: telephone.trim(),
        };
        setAjoutes((prev) => [fiche, ...prev]);
        onChange(fiche.id);
        setModeCreation(false);
        setNom("");
        setPrenom("");
        setTelephone("");
      } else {
        setErreur(resultat.erreur);
        setExistantId(resultat.existantId ?? null);
      }
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur inattendue.");
    } finally {
      setCreationEnCours(false);
    }
  }

  function utiliserExistant() {
    if (!existantId) return;
    // La fiche existe en base mais pas forcément dans la liste chargée :
    // on l'affiche avec les infos saisies (le serveur fait foi à l'insertion).
    if (!tous.some((p) => p.id === existantId)) {
      setAjoutes((prev) => [
        { id: existantId, nom: nom.trim() || "Propriétaire", prenom: prenom.trim() || null, telephone: telephone.trim() },
        ...prev,
      ]);
    }
    onChange(existantId);
    setModeCreation(false);
    setErreur(null);
    setExistantId(null);
  }

  // ── Fiche sélectionnée : puce + bouton changer ─────────────────────────────
  if (selectionne) {
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
            {selectionne.nom.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "#0F4C3A" }}>
              {libelle(selectionne)}
            </p>
            <p className="text-xs" style={{ color: "#6B7A71" }}>
              {selectionne.telephone}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer"
          style={{ background: "#fff", color: "#6B7A71", border: "1px solid #E0DAC8" }}
        >
          Changer
        </button>
      </div>
    );
  }

  // ── Mode création rapide ───────────────────────────────────────────────────
  if (modeCreation) {
    return (
      <div className="rounded-xl p-4 space-y-3" style={{ background: "#FAF8F2", border: "1px solid #E0DAC8" }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Nom *"
            maxLength={100}
            className={CHAMP}
            style={CHAMP_STYLE}
          />
          <input
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            placeholder="Prénom"
            maxLength={100}
            className={CHAMP}
            style={CHAMP_STYLE}
          />
        </div>
        <input
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          type="tel"
          placeholder="Téléphone * (ex : 06 12 34 56 78)"
          className={CHAMP}
          style={CHAMP_STYLE}
        />

        {erreur && (
          <div
            className="rounded-lg px-3 py-2 text-xs"
            style={{ background: "#FDF3F2", color: "#B3412F", border: "1px solid #F2D6D1" }}
          >
            {erreur}
            {existantId && (
              <button
                type="button"
                onClick={utiliserExistant}
                className="ml-2 underline font-medium cursor-pointer"
              >
                Utiliser la fiche existante
              </button>
            )}
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
            {creationEnCours ? "Création…" : "Créer la fiche"}
          </button>
          <button
            type="button"
            onClick={() => { setModeCreation(false); setErreur(null); setExistantId(null); }}
            className="px-4 py-2 rounded-lg text-xs cursor-pointer"
            style={{ background: "#fff", color: "#6B7A71", border: "1px solid #E0DAC8" }}
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  // ── Mode recherche ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      <input
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Rechercher par nom ou téléphone…"
        className={CHAMP}
        style={CHAMP_STYLE}
      />
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #F0EDE5" }}>
        {resultats.length === 0 ? (
          <p className="px-4 py-3 text-xs" style={{ color: "#9DB8AD" }}>
            {tous.length === 0
              ? "Aucun propriétaire dans le répertoire — créez-en un ci-dessous."
              : "Aucun résultat pour cette recherche."}
          </p>
        ) : (
          resultats.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p.id)}
              className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left cursor-pointer hover:opacity-90"
              style={{ background: "#fff", borderBottom: "1px solid #F0EDE5" }}
            >
              <span className="text-sm font-medium truncate" style={{ color: "#3D4A42" }}>
                {libelle(p)}
              </span>
              <span className="text-xs flex-shrink-0" style={{ color: "#9DB8AD" }}>
                {p.telephone}
              </span>
            </button>
          ))
        )}
        <button
          type="button"
          onClick={() => setModeCreation(true)}
          className="w-full px-4 py-2.5 text-left text-sm font-medium cursor-pointer"
          style={{ background: "#FAF8F2", color: "#0F4C3A" }}
        >
          + Créer un nouveau propriétaire
        </button>
      </div>
    </div>
  );
}
