"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LISTE_VILLES_ACTIVES } from "@/lib/villes";
import SelecteurContact from "@/components/repertoire/SelecteurContact";
import type { DonneesDemandeRechercheInterne } from "@/lib/demandes/creerInterne";

// Formulaire PARTAGÉ admin + agent : création d'une demande de recherche pour
// un client contacté hors-ligne, obligatoirement liée à une fiche du
// répertoire contacts (jamais de nom/téléphone saisis en texte libre ici —
// c'est la fiche répertoire qui fait foi, pour ne jamais perdre le lien).
// La demande créée passe TOUJOURS par la modération admin avant publication
// (voir creerInterne.ts) — même pour une création admin.

type Props = {
  creerAction: (donnees: DonneesDemandeRechercheInterne) => Promise<{ id: string }>;
  // Chemin de base ("/admin/demandes-recherche" ou "/pro/demandes-recherche")
  // — pas une fonction : un Server Component ne peut passer à un Client
  // Component qu'une "use server" action ou une valeur sérialisable simple.
  basePathApresCreation: string;
};

const CHAMP = "w-full border rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2";
const CHAMP_STYLE = { borderColor: "#E0DAC8", color: "#0F4C3A", background: "#fff" };
const LABEL = "block text-xs font-medium mb-1.5";
const LABEL_STYLE = { color: "#6B7A71" };

export default function FormulaireDemandeRechercheInterne({ creerAction, basePathApresCreation }: Props) {
  const router = useRouter();
  const [contactId, setContactId] = useState<string | null>(null);
  const [transaction, setTransaction] = useState<"achat" | "location">("achat");
  const [typeBien, setTypeBien] = useState("");
  const [ville, setVille] = useState("");
  const [quartiers, setQuartiers] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [surfaceMin, setSurfaceMin] = useState("");
  const [chambresMin, setChambresMin] = useState("");
  const [urgence, setUrgence] = useState("");
  const [criteres, setCriteres] = useState("");
  const [description, setDescription] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (!contactId) { setErreur("Sélectionnez ou créez le contact concerné."); return; }
    if (!ville) { setErreur("La ville est requise."); return; }
    setEnvoi(true);

    try {
      const { id } = await creerAction({
        contactId,
        transaction,
        typeBien: typeBien || null,
        ville,
        quartiers: quartiers.split(",").map((q) => q.trim()).filter(Boolean),
        budgetMin: budgetMin ? Number(budgetMin) : null,
        budgetMax: budgetMax ? Number(budgetMax) : null,
        surfaceMin: surfaceMin ? Number(surfaceMin) : null,
        chambresMin: chambresMin ? Number(chambresMin) : null,
        criteresSupplementaires: criteres || null,
        urgence: urgence || null,
        description: description || null,
      });
      router.push(`${basePathApresCreation}/${id}`);
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur inattendue.");
      setEnvoi(false);
    }
  }

  return (
    <form onSubmit={soumettre} className="flex flex-col gap-5 max-w-2xl">
      <div>
        <label className={LABEL} style={LABEL_STYLE}>Contact (répertoire) *</label>
        <SelecteurContact valeur={contactId} onChange={(id) => setContactId(id)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={LABEL} style={LABEL_STYLE}>Le contact souhaite *</label>
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
          {envoi ? "Enregistrement…" : "Créer la demande"}
        </button>
      </div>
      <p className="text-xs" style={{ color: "#9DB8AD" }}>
        Publication toujours soumise à modération — la demande apparaît « en validation », jamais publiée directement.
      </p>
    </form>
  );
}
