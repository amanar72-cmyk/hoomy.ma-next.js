"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { creerBienAgent, type DonneesBienAgent } from "@/app/pro/biens/actions";
import ChampLocalisationCarte from "@/components/partage/ChampLocalisationCarte";
import SelecteurVilleQuartier from "@/components/partage/SelecteurVilleQuartier";
import BoutonGenerationIA from "@/components/partage/BoutonGenerationIA";
import CompositionNiveaux, { type NiveauBien } from "@/components/partage/CompositionNiveaux";
import SelecteurProprietaire, { type ProprietaireOption } from "@/components/proprietaires/SelecteurProprietaire";

const TYPES = ["Appartement", "Villa", "Riad", "Bureau", "Terrain"];
const EQUIPEMENTS_LISTE = [
  "Parking", "Piscine", "Jardin", "Terrasse", "Balcon", "Ascenseur",
  "Gardien", "Climatisation", "Chauffage central", "Double vitrage",
  "Cuisine équipée", "Digicode", "Interphone", "Cave",
];

const sel =
  "w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-all";
const selStyle = {
  borderColor: "#E0DAC8",
  color: "#1f2a24",
  background: "#fff",
};
const selFocus = "#0F4C3A";

const labelClass = "block text-xs font-semibold mb-1.5";
const labelStyle = { color: "#0F4C3A" };

type Props = {
  // Répertoire chargé côté serveur ; vendeurInitial = arrivée depuis une
  // fiche propriétaire (« Ajouter un bien » → ?vendeur=<id>)
  proprietaires: ProprietaireOption[];
  vendeurInitial?: string | null;
};

export default function FormulaireCreationBienAgent({ proprietaires, vendeurInitial }: Props) {
  const router = useRouter();
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [vendeurId, setVendeurId] = useState<string | null>(vendeurInitial ?? null);
  const [equipementsChoisis, setEquipementsChoisis] = useState<string[]>([]);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [villeSelectionnee, setVilleSelectionnee] = useState("");
  // Champs contrôlés pour la génération IA
  const [typeSelectionne, setTypeSelectionne] = useState("");
  const [transactionSelectionnee, setTransactionSelectionnee] = useState("");
  const [description, setDescription] = useState("");
  const [prixSaisi, setPrixSaisi] = useState("");
  const [surfaceSaisie, setSurfaceSaisie] = useState("");
  const [chambresSaisies, setChambresSaisies] = useState("0");
  const [sallesBainSaisies, setSallesBainSaisies] = useState("0");
  const [quartierSaisi, setQuartierSaisi] = useState("");
  const [composition, setComposition] = useState<NiveauBien[]>([]);

  function toggleEquipement(eq: string) {
    setEquipementsChoisis((prev) =>
      prev.includes(eq) ? prev.filter((e) => e !== eq) : [...prev, eq]
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!vendeurId) {
      setErreur("Veuillez rattacher le bien à un propriétaire (section en haut du formulaire).");
      return;
    }
    setErreur(null);
    setChargement(true);

    const form = e.currentTarget;
    const fd = new FormData(form);

    const typeResolu = typeSelectionne || String(fd.get("type") ?? "");
    // Un terrain n'a ni chambres, ni salles de bain, ni équipements bâti
    const estTerrain = typeResolu === "Terrain";

    const donnees: DonneesBienAgent = {
      titre: String(fd.get("titre") ?? "").trim(),
      description: description.trim() || null,
      type: typeResolu,
      transaction: transactionSelectionnee || String(fd.get("transaction") ?? ""),
      prix: Number(prixSaisi || fd.get("prix")),
      ville: villeSelectionnee || String(fd.get("ville") ?? ""),
      quartier: quartierSaisi.trim() || String(fd.get("quartier") ?? "").trim() || null,
      chambres: estTerrain ? 0 : Number(chambresSaisies || fd.get("chambres")),
      salles_bain: estTerrain ? 0 : Number(sallesBainSaisies || fd.get("salles_bain")),
      surface: Number(surfaceSaisie || fd.get("surface")),
      equipements: !estTerrain && equipementsChoisis.length > 0 ? equipementsChoisis : null,
      composition: !estTerrain && composition.length > 0 ? composition : null,
      latitude,
      longitude,
      vendeurId,
    };

    try {
      await creerBienAgent(donnees);
      router.push("/pro/biens");
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur lors de la création.");
      setChargement(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">

      {/* ── Propriétaire (vendeur) ────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "#fff", border: "1px solid #F0EDE5", boxShadow: "0 2px 12px rgba(15,76,58,0.06)" }}
      >
        <h2 className="text-base font-semibold mb-1" style={{ color: "#0F4C3A" }}>
          Propriétaire (vendeur) *
        </h2>
        <p className="text-xs mb-4" style={{ color: "#9DB8AD" }}>
          Chaque bien doit être rattaché à une fiche du répertoire propriétaires.
        </p>
        <SelecteurProprietaire
          proprietaires={proprietaires}
          valeur={vendeurId}
          onChange={setVendeurId}
        />
      </div>

      {/* ── Informations de base ──────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "#fff", border: "1px solid #F0EDE5", boxShadow: "0 2px 12px rgba(15,76,58,0.06)" }}
      >
        <h2 className="text-base font-semibold mb-4" style={{ color: "#0F4C3A" }}>
          Informations de base
        </h2>

        <div className="flex flex-col gap-4">
          <div>
            <label htmlFor="titre" className={labelClass} style={labelStyle}>
              Titre de l'annonce *
            </label>
            <input
              id="titre"
              name="titre"
              type="text"
              required
              placeholder="Ex : Villa moderne avec piscine, Casablanca"
              className={sel}
              style={selStyle}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="type" className={labelClass} style={labelStyle}>
                Type de bien *
              </label>
              <select
                id="type"
                name="type"
                required
                className={sel}
                style={selStyle}
                value={typeSelectionne}
                onChange={(e) => setTypeSelectionne(e.target.value)}
              >
                <option value="">Sélectionner</option>
                {TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="transaction" className={labelClass} style={labelStyle}>
                Transaction *
              </label>
              <select
                id="transaction"
                name="transaction"
                required
                className={sel}
                style={selStyle}
                value={transactionSelectionnee}
                onChange={(e) => setTransactionSelectionnee(e.target.value)}
              >
                <option value="">Sélectionner</option>
                <option value="vente">Vente</option>
                <option value="location">Location</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <BoutonGenerationIA
              type={typeSelectionne}
              transaction={transactionSelectionnee}
              ville={villeSelectionnee}
              quartier={quartierSaisi}
              prix={prixSaisi}
              surface={surfaceSaisie}
              chambres={chambresSaisies}
              sallesBain={sallesBainSaisies}
              equipements={equipementsChoisis}
              onGenere={(fr) => { setDescription(fr); }}
            />

            <div>
              <label htmlFor="description" className={labelClass} style={labelStyle}>
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                placeholder="Décrivez le bien : caractéristiques, environnement, atouts…"
                className={sel}
                style={{ ...selStyle, resize: "vertical" }}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Localisation ─────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "#fff", border: "1px solid #F0EDE5", boxShadow: "0 2px 12px rgba(15,76,58,0.06)" }}
      >
        <h2 className="text-base font-semibold mb-4" style={{ color: "#0F4C3A" }}>
          Localisation
        </h2>

        <SelecteurVilleQuartier
          ville={villeSelectionnee}
          quartier={quartierSaisi}
          onVilleChange={setVilleSelectionnee}
          onQuartierChange={setQuartierSaisi}
          labelCls={labelClass}
          labelStyle={labelStyle}
          selectCls={sel}
          selectStyle={selStyle}
          villeRequise
        />

        <div className="mt-4">
          <label className={labelClass} style={labelStyle}>
            Position exacte sur la carte
          </label>
          <p className="text-xs mb-2" style={{ color: "#9DB8AD" }}>
            Cliquez pour épingler l'emplacement précis — les visiteurs ne verront qu'une zone approximative
          </p>
          <ChampLocalisationCarte
            latitude={latitude}
            longitude={longitude}
            ville={villeSelectionnee}
            quartier={quartierSaisi}
            onChangement={(lat, lng) => { setLatitude(lat); setLongitude(lng); }}
          />
        </div>
      </div>

      {/* ── Caractéristiques ─────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-6"
        style={{ background: "#fff", border: "1px solid #F0EDE5", boxShadow: "0 2px 12px rgba(15,76,58,0.06)" }}
      >
        <h2 className="text-base font-semibold mb-4" style={{ color: "#0F4C3A" }}>
          Caractéristiques
        </h2>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <label htmlFor="prix" className={labelClass} style={labelStyle}>
              Prix (DH) *
            </label>
            <input
              id="prix"
              name="prix"
              type="number"
              required
              min="0"
              step="1000"
              placeholder="1 500 000"
              className={sel}
              style={selStyle}
              value={prixSaisi}
              onChange={(e) => setPrixSaisi(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="surface" className={labelClass} style={labelStyle}>
              Surface (m²) *
            </label>
            <input
              id="surface"
              name="surface"
              type="number"
              required
              min="1"
              placeholder="120"
              className={sel}
              style={selStyle}
              value={surfaceSaisie}
              onChange={(e) => setSurfaceSaisie(e.target.value)}
            />
          </div>

          {typeSelectionne !== "Terrain" && (
            <>
              <div>
                <label htmlFor="chambres" className={labelClass} style={labelStyle}>
                  Chambres
                </label>
                <input
                  id="chambres"
                  name="chambres"
                  type="number"
                  min="0"
                  className={sel}
                  style={selStyle}
                  value={chambresSaisies}
                  onChange={(e) => setChambresSaisies(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="salles_bain" className={labelClass} style={labelStyle}>
                  Salles de bain
                </label>
                <input
                  id="salles_bain"
                  name="salles_bain"
                  type="number"
                  min="0"
                  className={sel}
                  style={selStyle}
                  value={sallesBainSaisies}
                  onChange={(e) => setSallesBainSaisies(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Équipements — sans objet pour un terrain ─────────────────────── */}
      {typeSelectionne !== "Terrain" && (
      <div
        className="rounded-2xl p-6"
        style={{ background: "#fff", border: "1px solid #F0EDE5", boxShadow: "0 2px 12px rgba(15,76,58,0.06)" }}
      >
        <h2 className="text-base font-semibold mb-4" style={{ color: "#0F4C3A" }}>
          Équipements
        </h2>

        <div className="flex flex-wrap gap-2">
          {EQUIPEMENTS_LISTE.map((eq) => {
            const choisi = equipementsChoisis.includes(eq);
            return (
              <button
                key={eq}
                type="button"
                onClick={() => toggleEquipement(eq)}
                className="text-xs font-medium px-3 py-1.5 rounded-full border transition-all cursor-pointer"
                style={
                  choisi
                    ? { background: "#0F4C3A", color: "#fff", borderColor: "#0F4C3A" }
                    : { background: "#fff", color: "#6B7A71", borderColor: "#E0DAC8" }
                }
              >
                {choisi && (
                  <span className="mr-1">✓</span>
                )}
                {eq}
              </button>
            );
          })}
        </div>
      </div>
      )}

      {/* ── Composition par niveau — sans objet pour un terrain ──────────── */}
      {typeSelectionne !== "Terrain" && (
      <div
        className="rounded-2xl p-6"
        style={{ background: "#fff", border: "1px solid #F0EDE5", boxShadow: "0 2px 12px rgba(15,76,58,0.06)" }}
      >
        <h2 className="text-base font-semibold mb-1" style={{ color: "#0F4C3A" }}>
          Composition du bien
        </h2>
        <p className="text-xs mb-4" style={{ color: "#9DB8AD" }}>
          Optionnel — décrivez le bien niveau par niveau (pièces, quantités).
        </p>
        <CompositionNiveaux valeur={composition} onChange={setComposition} />
      </div>
      )}

      {/* ── Erreur + Soumettre ────────────────────────────────────────────── */}
      {erreur && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "#FEE2E2", color: "#991B1B" }}
        >
          {erreur}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm px-5 py-2.5 rounded-xl border cursor-pointer transition-colors hover:bg-gray-50"
          style={{ borderColor: "#E0DAC8", color: "#6B7A71" }}
        >
          Annuler
        </button>

        <button
          type="submit"
          disabled={chargement}
          className="flex items-center gap-2 text-sm font-semibold px-6 py-2.5 rounded-xl transition-opacity cursor-pointer"
          style={{
            background: chargement ? "#9DB8AD" : "#0F4C3A",
            color: "#fff",
            opacity: chargement ? 0.7 : 1,
          }}
        >
          {chargement ? (
            "Création en cours…"
          ) : (
            <>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Créer le brouillon
            </>
          )}
        </button>
      </div>

    </form>
  );
}
