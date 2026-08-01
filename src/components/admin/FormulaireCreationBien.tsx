"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { creerBien } from "@/app/admin/actions";
import ChampLocalisationCarte from "@/components/partage/ChampLocalisationCarte";
import SelecteurVilleQuartier from "@/components/partage/SelecteurVilleQuartier";
import BoutonGenerationIA from "@/components/partage/BoutonGenerationIA";
import SelecteurProprietaire, { type ProprietaireOption } from "@/components/proprietaires/SelecteurProprietaire";
import ChampsCaracteristiques from "@/components/partage/ChampsCaracteristiques";
import { filtrerCaracteristiques, type Caracteristiques } from "@/lib/biens/caracteristiques";

// ── Constantes partagées (mêmes que FormulaireEditionBien) ───────────────────

const TYPES = ["Appartement", "Maison", "Villa", "Riad", "Bureau", "Local commercial", "Terrain"];
const EQUIPEMENTS_LISTE = [
  "Piscine", "Parking", "Terrasse", "Balcon", "Ascenseur", "Gardien",
  "Climatisation", "Chauffage", "Cuisine équipée", "Dressing", "Cave",
  "Jardin", "Vue mer", "Vue montagne", "Sécurité 24h", "Hammam",
];

// ── Helpers UI ───────────────────────────────────────────────────────────────

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-2xl border p-5"
      style={{ background: "#fff", borderColor: "#F0EDE5", boxShadow: "0 2px 12px rgba(15,76,58,0.05)" }}>
      <legend className="px-2 text-sm font-semibold" style={{ color: "#0F4C3A" }}>{titre}</legend>
      <div className="mt-3">{children}</div>
    </fieldset>
  );
}

function Champ({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: "#555" }}>{label}</label>
      {children}
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

type Props = {
  // Répertoire chargé côté serveur ; vendeurInitial = arrivée depuis une
  // fiche propriétaire (« Ajouter un bien » → ?vendeur=<id>)
  proprietaires: ProprietaireOption[];
  vendeurInitial?: string | null;
};

export default function FormulaireCreationBien({ proprietaires, vendeurInitial }: Props) {
  const router = useRouter();

  // Champs du formulaire — valeurs par défaut
  const [vendeurId, setVendeurId] = useState<string | null>(vendeurInitial ?? null);
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("Appartement");
  const [transaction, setTransaction] = useState("vente");
  const [prix, setPrix] = useState("");
  const [ville, setVille] = useState("Casablanca");
  const [quartier, setQuartier] = useState("");
  const [chambres, setChambres] = useState("0");
  const [sallesBain, setSallesBain] = useState("0");
  const [surface, setSurface] = useState("");
  const [equipements, setEquipements] = useState<string[]>([]);
  const [caracteristiques, setCaracteristiques] = useState<Caracteristiques>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [nouvelleUrl, setNouvelleUrl] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // États UI
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Référence pour savoir quelle action a été déclenchée
  // onClick du bouton submit se déclenche AVANT onSubmit du formulaire
  const actionCible = useRef<"brouillon" | "file">("brouillon");

  // ── Handlers ────────────────────────────────────────────────────────────────

  function toggleEquipement(e: string) {
    setEquipements((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]
    );
  }

  function supprimerPhoto(url: string) {
    setPhotos((prev) => prev.filter((p) => p !== url));
  }

  function monterPhoto(i: number) {
    if (i === 0) return;
    const arr = [...photos];
    [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
    setPhotos(arr);
  }

  function ajouterPhoto() {
    const url = nouvelleUrl.trim();
    if (url && !photos.includes(url)) {
      setPhotos((prev) => [...prev, url]);
      setNouvelleUrl("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!titre.trim()) { setErreur("Le titre est requis."); return; }
    const prixNum = parseFloat(prix);
    if (isNaN(prixNum) || prixNum < 0) { setErreur("Veuillez saisir un prix valide."); return; }
    const surfaceNum = parseFloat(surface);
    if (isNaN(surfaceNum) || surfaceNum <= 0) { setErreur("Veuillez saisir une surface valide."); return; }

    if (!vendeurId) {
      setErreur("Veuillez rattacher le bien à un propriétaire (section en haut du formulaire).");
      return;
    }

    const mettreEnFile = actionCible.current === "file";

    setErreur(null);
    setChargement(true);

    try {
      const { id } = await creerBien(
        {
          titre: titre.trim(),
          description: description.trim() || null,
          type,
          transaction,
          prix: prixNum,
          ville,
          quartier: quartier.trim() || null,
          chambres: type === "Terrain" ? 0 : Math.max(0, parseInt(chambres) || 0),
          salles_bain: type === "Terrain" ? 0 : Math.max(0, parseInt(sallesBain) || 0),
          surface: surfaceNum,
          equipements: equipements.length > 0 ? equipements : null,
          caracteristiques: filtrerCaracteristiques(type, caracteristiques),
          photos: photos.length > 0 ? photos : null,
          latitude,
          longitude,
          vendeurId,
        },
        mettreEnFile
      );

      // Redirection selon l'action choisie
      if (mettreEnFile) {
        router.push("/admin/affectation?message=bien-cree-file");
      } else {
        router.push(`/admin/biens/${id}?message=bien-cree`);
      }
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur inconnue.");
      setChargement(false);
    }
  }

  // ── Styles ──────────────────────────────────────────────────────────────────

  const inp: React.CSSProperties = { borderColor: "#E0DAC8", color: "#0F4C3A", background: "#fff" };
  const cls = "border rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none";

  // ── Rendu ────────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-4xl">

      {/* Erreur globale */}
      {erreur && (
        <div className="px-4 py-3 rounded-xl text-sm border"
          style={{ background: "#FEF2F2", color: "#991B1B", borderColor: "#FECACA" }}>
          {erreur}
        </div>
      )}

      {/* Propriétaire (vendeur) — obligatoire */}
      <div className="rounded-2xl p-6" style={{ background: "#fff", border: "1px solid #EBEBEB" }}>
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

      {/* Informations générales */}
      <Section titre="Informations générales">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Champ label="Titre *">
            <input type="text" value={titre} onChange={(e) => setTitre(e.target.value)}
              className={cls} style={inp} placeholder="Ex: Appartement lumineux 3 pièces…" />
          </Champ>
          <Champ label="Prix (DH) *">
            <input type="number" value={prix} onChange={(e) => setPrix(e.target.value)}
              min="0" step="1" className={cls} style={inp} placeholder="Ex: 1500000" />
          </Champ>
          <Champ label="Type de bien">
            <select value={type} onChange={(e) => setType(e.target.value)} className={cls} style={inp}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Champ>
          <Champ label="Transaction">
            <select value={transaction} onChange={(e) => setTransaction(e.target.value)} className={cls} style={inp}>
              <option value="vente">Vente</option>
              <option value="location">Location</option>
            </select>
          </Champ>
          <div className="col-span-full">
            <SelecteurVilleQuartier
              ville={ville}
              quartier={quartier}
              onVilleChange={setVille}
              onQuartierChange={setQuartier}
              labelCls="text-xs font-medium mb-1.5 block"
              labelStyle={{ color: "#555" }}
              selectCls={cls}
              selectStyle={inp}
            />
          </div>
          <div className="col-span-full">
            <label className="text-xs font-medium block mb-1" style={{ color: "#555" }}>
              Position exacte sur la carte
            </label>
            <p className="text-xs mb-2" style={{ color: "#9DB8AD" }}>
              Cliquez pour épingler l'emplacement précis — les visiteurs ne voient qu'une zone approximative
            </p>
            <ChampLocalisationCarte
              latitude={latitude}
              longitude={longitude}
              ville={ville}
              quartier={quartier}
              onChangement={(lat, lng) => { setLatitude(lat); setLongitude(lng); }}
            />
          </div>
          {type !== "Terrain" && (
            <>
              <Champ label="Chambres">
                <input type="number" value={chambres} onChange={(e) => setChambres(e.target.value)}
                  min="0" className={cls} style={inp} />
              </Champ>
              <Champ label="Salles de bain">
                <input type="number" value={sallesBain} onChange={(e) => setSallesBain(e.target.value)}
                  min="0" className={cls} style={inp} />
              </Champ>
            </>
          )}
          <Champ label="Surface (m²) *">
            <input type="number" value={surface} onChange={(e) => setSurface(e.target.value)}
              min="0" step="0.01" className={cls} style={inp} placeholder="Ex: 120" />
          </Champ>
        </div>
      </Section>

      {/* Description */}
      <Section titre="Description">
        <div className="flex flex-col gap-3">
          <BoutonGenerationIA
            type={type}
            transaction={transaction}
            ville={ville}
            quartier={quartier}
            prix={prix}
            surface={surface}
            chambres={chambres}
            sallesBain={sallesBain}
            equipements={equipements}
            onGenere={(fr) => { setDescription(fr); }}
          />

          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            rows={5} className={cls} style={{ ...inp, resize: "vertical" }}
            placeholder="Description complète du bien : emplacement, état, atouts…" />
        </div>
      </Section>

      {/* Photos */}
      <Section titre={`Photos ${photos.length > 0 ? `(${photos.length})` : ""}`}>
        {photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
            {photos.map((url, i) => (
              <div key={url} className="relative rounded-xl overflow-hidden group"
                style={{ height: 110, background: "#F4F6F5" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                {i === 0 && (
                  <span className="absolute top-1.5 left-1.5 text-xs px-1.5 py-0.5 rounded-md font-medium"
                    style={{ background: "rgba(15,76,58,0.88)", color: "#fff" }}>
                    Principale
                  </span>
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: "rgba(0,0,0,0.55)" }}>
                  {i > 0 && (
                    <button type="button" onClick={() => monterPhoto(i)}
                      className="text-white text-xs px-2.5 py-1 rounded-lg cursor-pointer"
                      style={{ background: "rgba(255,255,255,0.2)" }}>
                      ↑ Principal
                    </button>
                  )}
                  <button type="button" onClick={() => supprimerPhoto(url)}
                    className="text-white text-xs px-2.5 py-1 rounded-lg cursor-pointer"
                    style={{ background: "rgba(220,38,38,0.8)" }}>
                    ✕ Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl flex items-center justify-center mb-4"
            style={{ height: 80, background: "#F4F6F5", border: "2px dashed #E0DAC8" }}>
            <p className="text-sm" style={{ color: "#C4D8CE" }}>Aucune photo — ajoutez une URL ci-dessous</p>
          </div>
        )}
        <div className="flex gap-2">
          <input type="url" value={nouvelleUrl} onChange={(e) => setNouvelleUrl(e.target.value)}
            placeholder="https://exemple.com/photo.jpg"
            className={`${cls} flex-1`} style={inp}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); ajouterPhoto(); } }} />
          <button type="button" onClick={ajouterPhoto}
            className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer flex-shrink-0"
            style={{ background: "#F4F6F5", color: "#0F4C3A", border: "1px solid #E0DAC8" }}>
            + Ajouter
          </button>
        </div>
        <p className="text-xs mt-1.5" style={{ color: "#9DB8AD" }}>
          La première photo sera l'image principale. Survolez pour réorganiser ou supprimer.
        </p>
      </Section>

      {/* Équipements */}
      <Section titre="Équipements">
        <div className="flex flex-wrap gap-2">
          {EQUIPEMENTS_LISTE.map((eq) => {
            const actif = equipements.includes(eq);
            return (
              <button key={eq} type="button" onClick={() => toggleEquipement(eq)}
                className="px-3 py-1.5 rounded-full text-sm border cursor-pointer transition-all"
                style={actif
                  ? { background: "#0F4C3A", color: "#fff", borderColor: "#0F4C3A" }
                  : { background: "#F4F6F5", color: "#6B7A71", borderColor: "#E0DAC8" }
                }>
                {eq}
              </button>
            );
          })}
        </div>
        {equipements.length > 0 && (
          <p className="text-xs mt-3" style={{ color: "#9DB8AD" }}>
            {equipements.length} équipement{equipements.length > 1 ? "s" : ""} sélectionné{equipements.length > 1 ? "s" : ""}
          </p>
        )}
      </Section>

      {/* Caractéristiques spécifiques au type (étage, terrain, titre juridique…) */}
      <Section titre={`Caractéristiques — ${type}`}>
        <ChampsCaracteristiques type={type} valeur={caracteristiques} onChange={setCaracteristiques} />
      </Section>

      {/* Info génération auto */}
      <div className="rounded-xl px-4 py-3 text-sm flex items-start gap-3"
        style={{ background: "#F4F6F5", border: "1px solid #E0DAC8", color: "#6B7A71" }}>
        <span className="flex-shrink-0 mt-0.5">ℹ️</span>
        <span>
          La <strong style={{ color: "#0F4C3A" }}>référence</strong> (HM-XXXXX) et le <strong style={{ color: "#0F4C3A" }}>slug URL</strong> sont générés automatiquement à partir du titre et de la ville.
        </span>
      </div>

      {/* Barre d'actions — deux boutons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2 pb-4">
        <button
          type="submit"
          disabled={chargement}
          onClick={() => { actionCible.current = "brouillon"; }}
          className="px-6 py-2.5 rounded-xl text-sm font-medium border cursor-pointer disabled:opacity-60 hover:bg-gray-50 transition-colors"
          style={{ borderColor: "#E0DAC8", color: "#3D4A42", background: "#fff" }}
        >
          {chargement && actionCible.current === "brouillon" ? "Enregistrement…" : "Enregistrer en brouillon"}
        </button>
        <button
          type="submit"
          disabled={chargement}
          onClick={() => { actionCible.current = "file"; }}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-60 hover:opacity-90 transition-opacity"
          style={{ background: "#0F4C3A", color: "#fff" }}
        >
          {chargement && actionCible.current === "file" ? "Création…" : "Créer et mettre dans la file"}
        </button>
      </div>
    </form>
  );
}
