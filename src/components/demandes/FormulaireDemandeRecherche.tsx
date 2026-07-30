"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LISTE_VILLES_ACTIVES } from "@/lib/villes";
import {
  creerDemandeRecherche,
  modifierDemandeRecherche,
  type DonneesDemandeRecherche,
} from "@/app/mon-compte/demandes-recherche/actions";

// Formulaire "Publier ma demande" — création ET édition (tant que non publiée).

type Props = {
  initial?: (DonneesDemandeRecherche & { id: string }) | null;
};

const CHAMP = "w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2";
const CHAMP_STYLE = { borderColor: "#E0DAC8", color: "#0F4C3A", background: "#fff" };
const LABEL = "block text-xs font-medium mb-1.5";
const LABEL_STYLE = { color: "#6B7A71" };

export default function FormulaireDemandeRecherche({ initial }: Props) {
  const router = useRouter();
  const [nom, setNom] = useState(initial?.nom ?? "");
  const [prenom, setPrenom] = useState(initial?.prenom ?? "");
  const [telephone, setTelephone] = useState(initial?.telephone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [profilDemandeur, setProfilDemandeur] = useState<"particulier" | "agence">(initial?.profilDemandeur ?? "particulier");
  const [transaction, setTransaction] = useState<"achat" | "location">(initial?.transaction ?? "achat");
  const [typeBien, setTypeBien] = useState(initial?.typeBien ?? "");
  const [ville, setVille] = useState(initial?.ville ?? "");
  const [quartiers, setQuartiers] = useState(initial?.quartiers.join(", ") ?? "");
  const [budgetMin, setBudgetMin] = useState(initial?.budgetMin?.toString() ?? "");
  const [budgetMax, setBudgetMax] = useState(initial?.budgetMax?.toString() ?? "");
  const [surfaceMin, setSurfaceMin] = useState(initial?.surfaceMin?.toString() ?? "");
  const [chambresMin, setChambresMin] = useState(initial?.chambresMin?.toString() ?? "");
  const [urgence, setUrgence] = useState(initial?.urgence ?? "");
  const [criteres, setCriteres] = useState(initial?.criteresSupplementaires ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);

    const donnees: DonneesDemandeRecherche = {
      nom, prenom: prenom || null, telephone, email: email || null,
      profilDemandeur, transaction, typeBien: typeBien || null, ville,
      quartiers: quartiers.split(",").map((q) => q.trim()).filter(Boolean),
      budgetMin: budgetMin ? Number(budgetMin) : null,
      budgetMax: budgetMax ? Number(budgetMax) : null,
      surfaceMin: surfaceMin ? Number(surfaceMin) : null,
      chambresMin: chambresMin ? Number(chambresMin) : null,
      criteresSupplementaires: criteres || null,
      urgence: urgence || null,
      description: description || null,
    };

    try {
      if (initial) {
        await modifierDemandeRecherche(initial.id, donnees);
      } else {
        const { id } = await creerDemandeRecherche(donnees);
        router.push(`/mon-compte/demandes-recherche?creee=${id}`);
      }
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur inattendue.");
      setEnvoi(false);
    }
  }

  return (
    <form onSubmit={soumettre} className="flex flex-col gap-5 max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL} style={LABEL_STYLE}>Nom *</label>
          <input value={nom} onChange={(e) => setNom(e.target.value)} required maxLength={100} className={CHAMP} style={CHAMP_STYLE} />
        </div>
        <div>
          <label className={LABEL} style={LABEL_STYLE}>Prénom</label>
          <input value={prenom} onChange={(e) => setPrenom(e.target.value)} maxLength={100} className={CHAMP} style={CHAMP_STYLE} />
        </div>
        <div>
          <label className={LABEL} style={LABEL_STYLE}>Téléphone *</label>
          <input value={telephone} onChange={(e) => setTelephone(e.target.value)} type="tel" required className={CHAMP} style={CHAMP_STYLE} />
        </div>
        <div>
          <label className={LABEL} style={LABEL_STYLE}>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className={CHAMP} style={CHAMP_STYLE} />
        </div>
      </div>

      <div>
        <label className={LABEL} style={LABEL_STYLE}>Vous êtes</label>
        <div className="flex gap-3">
          {(["particulier", "agence"] as const).map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: "#3D4A42" }}>
              <input type="radio" checked={profilDemandeur === p} onChange={() => setProfilDemandeur(p)} />
              {p === "particulier" ? "Particulier" : "Agence"}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL} style={LABEL_STYLE}>Je souhaite *</label>
          <select value={transaction} onChange={(e) => setTransaction(e.target.value as "achat" | "location")} required className={CHAMP} style={CHAMP_STYLE}>
            <option value="achat">Acheter</option>
            <option value="location">Louer</option>
          </select>
        </div>
        <div>
          <label className={LABEL} style={LABEL_STYLE}>Type de bien</label>
          <select value={typeBien} onChange={(e) => setTypeBien(e.target.value)} className={CHAMP} style={CHAMP_STYLE}>
            <option value="">Peu importe</option>
            {["Appartement", "Maison", "Villa", "Riad", "Bureau", "Local commercial", "Terrain"].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL} style={LABEL_STYLE}>Ville *</label>
          <select value={ville} onChange={(e) => setVille(e.target.value)} required className={CHAMP} style={CHAMP_STYLE}>
            <option value="">Sélectionner</option>
            {LISTE_VILLES_ACTIVES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL} style={LABEL_STYLE}>Quartiers souhaités</label>
          <input value={quartiers} onChange={(e) => setQuartiers(e.target.value)} placeholder="Gueliz, Hivernage…" className={CHAMP} style={CHAMP_STYLE} />
        </div>
        <div>
          <label className={LABEL} style={LABEL_STYLE}>Budget min (DH)</label>
          <input value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} type="number" min={0} className={CHAMP} style={CHAMP_STYLE} />
        </div>
        <div>
          <label className={LABEL} style={LABEL_STYLE}>Budget max (DH)</label>
          <input value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} type="number" min={0} className={CHAMP} style={CHAMP_STYLE} />
        </div>
        <div>
          <label className={LABEL} style={LABEL_STYLE}>Surface minimale (m²)</label>
          <input value={surfaceMin} onChange={(e) => setSurfaceMin(e.target.value)} type="number" min={0} className={CHAMP} style={CHAMP_STYLE} />
        </div>
        <div>
          <label className={LABEL} style={LABEL_STYLE}>Chambres minimum</label>
          <input value={chambresMin} onChange={(e) => setChambresMin(e.target.value)} type="number" min={0} className={CHAMP} style={CHAMP_STYLE} />
        </div>
      </div>

      <div>
        <label className={LABEL} style={LABEL_STYLE}>Urgence</label>
        <input value={urgence} onChange={(e) => setUrgence(e.target.value)} placeholder="Ex : dans les 3 mois" className={CHAMP} style={CHAMP_STYLE} />
      </div>
      <div>
        <label className={LABEL} style={LABEL_STYLE}>Critères supplémentaires</label>
        <textarea value={criteres} onChange={(e) => setCriteres(e.target.value)} rows={2} placeholder="Garage, piscine, étage, vue…" className={CHAMP} style={CHAMP_STYLE} />
      </div>
      <div>
        <label className={LABEL} style={LABEL_STYLE}>Description libre</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={CHAMP} style={CHAMP_STYLE} />
      </div>

      {erreur && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "#FDF3F2", color: "#B3412F", border: "1px solid #F2D6D1" }}>
          {erreur}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={envoi} className="px-6 py-2.5 rounded-xl text-sm font-medium cursor-pointer disabled:opacity-60" style={{ background: "#0F4C3A", color: "#fff" }}>
          {envoi ? "Enregistrement…" : initial ? "Enregistrer les modifications" : "Publier ma demande"}
        </button>
      </div>
      {!initial && (
        <p className="text-xs" style={{ color: "#9DB8AD" }}>
          Votre demande sera relue par un conseiller avant publication (statut « en validation »).
        </p>
      )}
    </form>
  );
}
