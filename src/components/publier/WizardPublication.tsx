"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { publierBien } from "@/app/publier/actions";
import ChampLocalisationCarte from "@/components/partage/ChampLocalisationCarte";
import { appliquerWatermark } from "@/lib/images/watermark";

// ── Types ─────────────────────────────────────────────────────────────────────

type PhotoUploadee = {
  id: string;
  url: string;
  nom: string;
};

type DonneesWizard = {
  transaction: "vente" | "location" | "";
  type: string;
  ville: string;
  quartier: string;
  surface: number;
  chambres: number;
  salles_bain: number;
  equipements: string[];
  photos: PhotoUploadee[];
  titre: string;
  description: string;
  prix: number;
  latitude: number | null;
  longitude: number | null;
};

const ETAPE_LABELS = [
  "Transaction",
  "Type de bien",
  "Localisation",
  "Caractéristiques",
  "Photos",
  "Annonce",
];

const VILLES = ["Casablanca", "Marrakech", "Rabat", "Tanger", "Agadir", "Fès"];

const TYPES_BIENS = [
  { valeur: "Appartement", icone: "🏢" },
  { valeur: "Villa", icone: "🏡" },
  { valeur: "Riad", icone: "🕌" },
  { valeur: "Bureau", icone: "🏢" },
  { valeur: "Terrain", icone: "🌍" },
];

const EQUIPEMENTS = [
  "Ascenseur",
  "Parking",
  "Piscine",
  "Climatisation",
  "Terrasse",
  "Jardin",
  "Sécurité",
  "Meublé",
];

const MAX_PHOTOS = 15;
const MAX_TAILLE_MB = 5;
const FORMATS_ACCEPTES = ["image/jpeg", "image/png", "image/webp"];

// ── Barre de progression ──────────────────────────────────────────────────────

function BarreProgression({ etape, total }: { etape: number; total: number }) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-3">
        {ETAPE_LABELS.map((label, i) => {
          const num = i + 1;
          const estActif = num === etape;
          const estFait = num < etape;
          return (
            <div key={i} className="flex flex-col items-center gap-1" style={{ flex: 1 }}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all"
                style={{
                  background: estFait ? "#146C43" : estActif ? "#0F4C3A" : "#E8E2D2",
                  color: estFait || estActif ? "#fff" : "#9DB8AD",
                }}
              >
                {estFait ? (
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : num}
              </div>
              <span className="text-xs hidden sm:block" style={{ color: estActif ? "#0F4C3A" : "#9DB8AD", fontWeight: estActif ? 600 : 400 }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="relative h-1.5 rounded-full" style={{ background: "#E8E2D2" }}>
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
          style={{ width: `${((etape - 1) / (total - 1)) * 100}%`, background: "linear-gradient(90deg,#0F4C3A,#146C43)" }}
        />
      </div>
    </div>
  );
}

// ── Carte de choix ────────────────────────────────────────────────────────────

function CarteChoix({
  icone,
  titre,
  sous_titre,
  selectionne,
  onClick,
}: {
  icone: string;
  titre: string;
  sous_titre?: string;
  selectionne: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all cursor-pointer w-full"
      style={{
        background: selectionne ? "#0F4C3A" : "#fff",
        borderColor: selectionne ? "#0F4C3A" : "#E8E2D2",
        color: selectionne ? "#fff" : "#1f2a24",
        boxShadow: selectionne ? "0 4px 20px rgba(15,76,58,0.25)" : "0 2px 8px rgba(15,76,58,0.06)",
        transform: selectionne ? "scale(1.02)" : "scale(1)",
      }}
    >
      <span style={{ fontSize: 36 }}>{icone}</span>
      <span className="text-base font-semibold">{titre}</span>
      {sous_titre && (
        <span className="text-sm" style={{ color: selectionne ? "rgba(255,255,255,0.75)" : "#9DB8AD" }}>
          {sous_titre}
        </span>
      )}
    </button>
  );
}

// ── Compteur +/- ──────────────────────────────────────────────────────────────

function Compteur({
  label,
  valeur,
  onChange,
  min = 0,
  max = 20,
}: {
  label: string;
  valeur: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: "#F0EDE5" }}>
      <span className="text-sm font-medium" style={{ color: "#1f2a24" }}>{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, valeur - 1))}
          className="w-9 h-9 rounded-full border flex items-center justify-center text-lg font-medium transition-colors"
          style={{ borderColor: valeur <= min ? "#E8E2D2" : "#0F4C3A", color: valeur <= min ? "#C4D8CE" : "#0F4C3A" }}
        >
          −
        </button>
        <span className="w-6 text-center text-base font-semibold" style={{ color: "#0F4C3A" }}>
          {valeur}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, valeur + 1))}
          className="w-9 h-9 rounded-full border flex items-center justify-center text-lg font-medium transition-colors"
          style={{ borderColor: valeur >= max ? "#E8E2D2" : "#0F4C3A", color: valeur >= max ? "#C4D8CE" : "#0F4C3A" }}
        >
          +
        </button>
      </div>
    </div>
  );
}

// ── Page de succès ────────────────────────────────────────────────────────────

function PageSucces() {
  const router = useRouter();
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{ background: "#E8F5ED" }}
      >
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <path d="M8 20l8 8 16-16" stroke="#0F4C3A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="text-2xl font-normal mb-3" style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}>
        Votre bien a été soumis !
      </h2>
      <p className="text-base mb-2 max-w-sm" style={{ color: "#3D4A42" }}>
        Notre équipe va étudier votre annonce et vous recontacter dans les plus brefs délais.
      </p>
      <p className="text-sm mb-8" style={{ color: "#9DB8AD" }}>
        Vous pouvez suivre l'avancement depuis votre espace personnel.
      </p>
      <button
        type="button"
        onClick={() => router.push("/mon-compte/mes-biens")}
        className="px-8 py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
        style={{ background: "#0F4C3A", color: "#fff" }}
      >
        Voir mes biens →
      </button>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function WizardPublication({ userId }: { userId: string }) {
  const [etape, setEtape] = useState(1);
  const [succes, setSucces] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enSoumission, setEnSoumission] = useState(false);

  const [donnees, setDonnees] = useState<DonneesWizard>({
    transaction: "",
    type: "",
    ville: "",
    quartier: "",
    surface: 0,
    chambres: 1,
    salles_bain: 1,
    equipements: [],
    photos: [],
    titre: "",
    description: "",
    prix: 0,
    latitude: null,
    longitude: null,
  });

  // Upload photos
  const [uploadEnCours, setUploadEnCours] = useState(false);
  const [uploadsProgression, setUploadsProgression] = useState<Record<string, number>>({});
  const [erreurUpload, setErreurUpload] = useState<string | null>(null);
  const inputFichierRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const mettreAJour = useCallback(<K extends keyof DonneesWizard>(champ: K, val: DonneesWizard[K]) => {
    setDonnees((prev) => ({ ...prev, [champ]: val }));
  }, []);

  // ── Validation par étape ──────────────────────────────────────────────────

  const validerEtape = (): string | null => {
    switch (etape) {
      case 1:
        if (!donnees.transaction) return "Veuillez choisir un type de transaction.";
        break;
      case 2:
        if (!donnees.type) return "Veuillez choisir un type de bien.";
        break;
      case 3:
        if (!donnees.ville) return "Veuillez choisir une ville.";
        break;
      case 4:
        if (donnees.surface <= 0) return "Veuillez indiquer la surface du bien.";
        break;
      case 5:
        if (donnees.photos.length === 0) return "Veuillez ajouter au moins une photo.";
        break;
      case 6:
        if (!donnees.titre.trim()) return "Veuillez saisir un titre pour l'annonce.";
        if (donnees.prix <= 0) return "Veuillez indiquer un prix.";
        break;
    }
    return null;
  };

  const allerEtapeSuivante = () => {
    const err = validerEtape();
    if (err) { setErreur(err); return; }
    setErreur(null);
    setEtape((e) => e + 1);
  };

  const allerEtapePrecedente = () => {
    setErreur(null);
    setEtape((e) => e - 1);
  };

  // ── Upload photos ─────────────────────────────────────────────────────────

  const traiterFichiers = async (fichiers: File[]) => {
    setErreurUpload(null);
    const restant = MAX_PHOTOS - donnees.photos.length;
    if (restant <= 0) {
      setErreurUpload(`Maximum ${MAX_PHOTOS} photos atteint.`);
      return;
    }
    const aUploader = fichiers.slice(0, restant);
    const invalides = aUploader.filter(
      (f) => !FORMATS_ACCEPTES.includes(f.type) || f.size > MAX_TAILLE_MB * 1024 * 1024
    );
    if (invalides.length > 0) {
      setErreurUpload(`Certains fichiers sont invalides (formats acceptés : JPG, PNG, WebP — max ${MAX_TAILLE_MB} Mo).`);
      return;
    }

    setUploadEnCours(true);
    const nouvellesPhotos: PhotoUploadee[] = [];

    for (const fichier of aUploader) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setUploadsProgression((prev) => ({ ...prev, [id]: 0 }));

      const chemin = `${userId}/${Date.now()}-${fichier.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      let aUploader: File | Blob = fichier;
      try {
        aUploader = await appliquerWatermark(fichier);
      } catch (err) {
        console.warn("[HOOMY] Watermark échoué, upload original :", err);
      }
      const { data, error } = await supabase.storage.from("biens").upload(chemin, aUploader);

      if (error) {
        setErreurUpload(`Erreur lors de l'upload de "${fichier.name}" : ${error.message}`);
        setUploadsProgression((prev) => { const n = { ...prev }; delete n[id]; return n; });
        continue;
      }

      const { data: urlData } = supabase.storage.from("biens").getPublicUrl(data.path);
      nouvellesPhotos.push({ id, url: urlData.publicUrl, nom: fichier.name });
      setUploadsProgression((prev) => { const n = { ...prev }; delete n[id]; return n; });
    }

    if (nouvellesPhotos.length > 0) {
      setDonnees((prev) => ({ ...prev, photos: [...prev.photos, ...nouvellesPhotos] }));
    }
    setUploadEnCours(false);
  };

  const supprimerPhoto = (id: string) => {
    setDonnees((prev) => ({ ...prev, photos: prev.photos.filter((p) => p.id !== id) }));
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) traiterFichiers(Array.from(e.target.files));
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) traiterFichiers(Array.from(e.dataTransfer.files));
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

  // ── Soumission finale ─────────────────────────────────────────────────────

  const soumettre = async () => {
    const err = validerEtape();
    if (err) { setErreur(err); return; }
    setErreur(null);
    setEnSoumission(true);
    try {
      await publierBien({
        transaction: donnees.transaction,
        type: donnees.type,
        ville: donnees.ville,
        quartier: donnees.quartier,
        surface: donnees.surface,
        chambres: donnees.chambres,
        salles_bain: donnees.salles_bain,
        equipements: donnees.equipements,
        photos: donnees.photos.map((p) => p.url),
        titre: donnees.titre,
        description: donnees.description,
        prix: donnees.prix,
        latitude: donnees.latitude,
        longitude: donnees.longitude,
      });
      setSucces(true);
    } catch (e: unknown) {
      setErreur(e instanceof Error ? e.message : "Une erreur est survenue.");
    } finally {
      setEnSoumission(false);
    }
  };

  // ── Rendu étapes ──────────────────────────────────────────────────────────

  const toggleEquipement = (eq: string) => {
    setDonnees((prev) => ({
      ...prev,
      equipements: prev.equipements.includes(eq)
        ? prev.equipements.filter((e) => e !== eq)
        : [...prev.equipements, eq],
    }));
  };

  const nbUploadsEnCours = Object.keys(uploadsProgression).length;

  const contenu = () => {
    if (succes) return <PageSucces />;

    switch (etape) {
      // ── Étape 1 : Transaction ────────────────────────────────────────────
      case 1:
        return (
          <div>
            <h2 className="text-xl font-normal mb-2" style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}>
              Que souhaitez-vous faire ?
            </h2>
            <p className="text-sm mb-6" style={{ color: "#9DB8AD" }}>Choisissez le type de transaction pour votre bien.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <CarteChoix
                icone="🏷️"
                titre="Je vends"
                sous_titre="Mettre en vente votre bien"
                selectionne={donnees.transaction === "vente"}
                onClick={() => mettreAJour("transaction", "vente")}
              />
              <CarteChoix
                icone="🔑"
                titre="Je loue"
                sous_titre="Proposer votre bien à la location"
                selectionne={donnees.transaction === "location"}
                onClick={() => mettreAJour("transaction", "location")}
              />
            </div>
          </div>
        );

      // ── Étape 2 : Type de bien ───────────────────────────────────────────
      case 2:
        return (
          <div>
            <h2 className="text-xl font-normal mb-2" style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}>
              Quel type de bien ?
            </h2>
            <p className="text-sm mb-6" style={{ color: "#9DB8AD" }}>Sélectionnez la catégorie qui correspond à votre bien.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {TYPES_BIENS.map((t) => (
                <CarteChoix
                  key={t.valeur}
                  icone={t.icone}
                  titre={t.valeur}
                  selectionne={donnees.type === t.valeur}
                  onClick={() => mettreAJour("type", t.valeur)}
                />
              ))}
            </div>
          </div>
        );

      // ── Étape 3 : Localisation ───────────────────────────────────────────
      case 3:
        return (
          <div>
            <h2 className="text-xl font-normal mb-2" style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}>
              Où se situe votre bien ?
            </h2>
            <p className="text-sm mb-6" style={{ color: "#9DB8AD" }}>Indiquez la ville et le quartier pour affiner la localisation.</p>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "#3D4A42" }}>Ville *</label>
                <select
                  value={donnees.ville}
                  onChange={(e) => mettreAJour("ville", e.target.value)}
                  className="w-full border rounded-xl px-4 py-3 text-sm"
                  style={{ borderColor: "#E0DAC8", color: "#0F4C3A", background: "#fff" }}
                >
                  <option value="">Sélectionner une ville…</option>
                  {VILLES.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "#3D4A42" }}>Quartier</label>
                <input
                  type="text"
                  value={donnees.quartier}
                  onChange={(e) => mettreAJour("quartier", e.target.value)}
                  placeholder="Ex : Gauthier, Guéliz, Souissi…"
                  className="w-full border rounded-xl px-4 py-3 text-sm"
                  style={{ borderColor: "#E0DAC8", color: "#1f2a24" }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "#3D4A42" }}>
                  Position exacte sur la carte
                </label>
                <p className="text-xs mb-2" style={{ color: "#9DB8AD" }}>
                  Facultatif — cliquez pour épingler l'emplacement. Les visiteurs verront seulement une zone approximative.
                </p>
                <ChampLocalisationCarte
                  latitude={donnees.latitude}
                  longitude={donnees.longitude}
                  ville={donnees.ville}
                  onChangement={(lat, lng) => {
                    mettreAJour("latitude", lat);
                    mettreAJour("longitude", lng);
                  }}
                />
              </div>
            </div>
          </div>
        );

      // ── Étape 4 : Caractéristiques ───────────────────────────────────────
      case 4:
        return (
          <div>
            <h2 className="text-xl font-normal mb-2" style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}>
              Caractéristiques du bien
            </h2>
            <p className="text-sm mb-6" style={{ color: "#9DB8AD" }}>Renseignez les informations principales de votre bien.</p>

            {/* Surface */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1.5" style={{ color: "#3D4A42" }}>Surface (m²) *</label>
              <input
                type="number"
                min="1"
                value={donnees.surface || ""}
                onChange={(e) => mettreAJour("surface", Number(e.target.value))}
                placeholder="Ex : 120"
                className="w-full border rounded-xl px-4 py-3 text-sm"
                style={{ borderColor: "#E0DAC8", color: "#1f2a24" }}
              />
            </div>

            {/* Compteurs */}
            <div className="mb-6">
              <Compteur label="Chambres" valeur={donnees.chambres} onChange={(v) => mettreAJour("chambres", v)} min={0} />
              <Compteur label="Salles de bain" valeur={donnees.salles_bain} onChange={(v) => mettreAJour("salles_bain", v)} min={0} />
            </div>

            {/* Équipements */}
            <div>
              <p className="text-sm font-medium mb-3" style={{ color: "#3D4A42" }}>Équipements</p>
              <div className="flex flex-wrap gap-2">
                {EQUIPEMENTS.map((eq) => {
                  const actif = donnees.equipements.includes(eq);
                  return (
                    <button
                      key={eq}
                      type="button"
                      onClick={() => toggleEquipement(eq)}
                      className="px-3 py-1.5 rounded-full text-sm border transition-all"
                      style={{
                        background: actif ? "#0F4C3A" : "#fff",
                        borderColor: actif ? "#0F4C3A" : "#E8E2D2",
                        color: actif ? "#fff" : "#3D4A42",
                      }}
                    >
                      {eq}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );

      // ── Étape 5 : Photos ─────────────────────────────────────────────────
      case 5:
        return (
          <div>
            <h2 className="text-xl font-normal mb-2" style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}>
              Photos du bien
            </h2>
            <p className="text-sm mb-6" style={{ color: "#9DB8AD" }}>
              Ajoutez jusqu&apos;à {MAX_PHOTOS} photos ({donnees.photos.length}/{MAX_PHOTOS}) — JPG, PNG ou WebP, max {MAX_TAILLE_MB} Mo chacune.
            </p>

            {/* Zone drag & drop */}
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onClick={() => !uploadEnCours && inputFichierRef.current?.click()}
              className="border-2 border-dashed rounded-2xl flex flex-col items-center justify-center py-10 px-6 mb-4 transition-colors cursor-pointer"
              style={{
                borderColor: uploadEnCours ? "#146C43" : "#D4D0C4",
                background: uploadEnCours ? "#F0F9F4" : "#FAFAF8",
              }}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: "#E8F5ED" }}>
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#0F4C3A" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4-4a3 3 0 014.24 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M14 8h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              {uploadEnCours ? (
                <p className="text-sm font-medium" style={{ color: "#146C43" }}>
                  Upload en cours… ({nbUploadsEnCours} en attente)
                </p>
              ) : (
                <>
                  <p className="text-sm font-medium mb-1" style={{ color: "#0F4C3A" }}>
                    Glissez vos photos ici
                  </p>
                  <p className="text-xs" style={{ color: "#9DB8AD" }}>ou cliquez pour sélectionner</p>
                </>
              )}
            </div>

            <input
              ref={inputFichierRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={onInputChange}
            />

            {/* Barre de progression globale */}
            {nbUploadsEnCours > 0 && (
              <div className="mb-4">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#E8E2D2" }}>
                  <div className="h-full rounded-full animate-pulse" style={{ width: "60%", background: "#0F4C3A" }} />
                </div>
              </div>
            )}

            {erreurUpload && (
              <p className="text-sm mb-4 px-3 py-2 rounded-xl" style={{ background: "#FEF2F2", color: "#991B1B" }}>
                {erreurUpload}
              </p>
            )}

            {/* Grille aperçu */}
            {donnees.photos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {donnees.photos.map((photo, i) => (
                  <div key={photo.id} className="relative group rounded-xl overflow-hidden aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt={photo.nom} className="w-full h-full object-cover" />
                    {i === 0 && (
                      <span className="absolute top-1 left-1 text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: "#D4AF37", color: "#0F4C3A" }}>
                        Principal
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => supprimerPhoto(photo.id)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: "rgba(0,0,0,0.65)", color: "#fff" }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      // ── Étape 6 : Annonce ─────────────────────────────────────────────────
      case 6:
        return (
          <div>
            <h2 className="text-xl font-normal mb-2" style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}>
              Votre annonce
            </h2>
            <p className="text-sm mb-6" style={{ color: "#9DB8AD" }}>
              Donnez un titre accrocheur, une bonne description et fixez votre prix.
            </p>

            <div className="flex flex-col gap-4 mb-8">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "#3D4A42" }}>Titre de l&apos;annonce *</label>
                <input
                  type="text"
                  value={donnees.titre}
                  onChange={(e) => mettreAJour("titre", e.target.value)}
                  placeholder="Ex : Appartement lumineux avec vue mer à Casablanca"
                  className="w-full border rounded-xl px-4 py-3 text-sm"
                  style={{ borderColor: "#E0DAC8", color: "#1f2a24" }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "#3D4A42" }}>Description</label>
                <textarea
                  value={donnees.description}
                  onChange={(e) => mettreAJour("description", e.target.value)}
                  placeholder="Décrivez votre bien : emplacement, état, atouts…"
                  rows={4}
                  className="w-full border rounded-xl px-4 py-3 text-sm resize-none"
                  style={{ borderColor: "#E0DAC8", color: "#1f2a24" }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "#3D4A42" }}>
                  Prix {donnees.transaction === "location" ? "(DH/mois)" : "(DH)"} *
                </label>
                <input
                  type="number"
                  min="1"
                  value={donnees.prix || ""}
                  onChange={(e) => mettreAJour("prix", Number(e.target.value))}
                  placeholder={donnees.transaction === "location" ? "Ex : 8000" : "Ex : 1500000"}
                  className="w-full border rounded-xl px-4 py-3 text-sm"
                  style={{ borderColor: "#E0DAC8", color: "#1f2a24" }}
                />
              </div>
            </div>

            {/* Récapitulatif */}
            <div className="rounded-2xl p-5 border" style={{ background: "#F9F7F2", borderColor: "#E8E2D2" }}>
              <p className="text-sm font-semibold mb-3" style={{ color: "#0F4C3A" }}>Récapitulatif</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                <span style={{ color: "#9DB8AD" }}>Transaction</span>
                <span className="font-medium capitalize" style={{ color: "#1f2a24" }}>{donnees.transaction}</span>
                <span style={{ color: "#9DB8AD" }}>Type</span>
                <span className="font-medium" style={{ color: "#1f2a24" }}>{donnees.type}</span>
                <span style={{ color: "#9DB8AD" }}>Ville</span>
                <span className="font-medium" style={{ color: "#1f2a24" }}>{donnees.ville}{donnees.quartier ? `, ${donnees.quartier}` : ""}</span>
                <span style={{ color: "#9DB8AD" }}>Surface</span>
                <span className="font-medium" style={{ color: "#1f2a24" }}>{donnees.surface} m²</span>
                <span style={{ color: "#9DB8AD" }}>Chambres</span>
                <span className="font-medium" style={{ color: "#1f2a24" }}>{donnees.chambres}</span>
                <span style={{ color: "#9DB8AD" }}>Salles de bain</span>
                <span className="font-medium" style={{ color: "#1f2a24" }}>{donnees.salles_bain}</span>
                <span style={{ color: "#9DB8AD" }}>Photos</span>
                <span className="font-medium" style={{ color: "#1f2a24" }}>{donnees.photos.length} photo{donnees.photos.length > 1 ? "s" : ""}</span>
                {donnees.equipements.length > 0 && (
                  <>
                    <span style={{ color: "#9DB8AD" }}>Équipements</span>
                    <span className="font-medium" style={{ color: "#1f2a24" }}>{donnees.equipements.join(", ")}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* En-tête */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-normal mb-2" style={{ fontFamily: "var(--font-marcellus),serif", color: "#0F4C3A" }}>
          Publier un bien
        </h1>
        <p className="text-sm" style={{ color: "#9DB8AD" }}>Déposez votre annonce en quelques minutes</p>
      </div>

      {!succes && <BarreProgression etape={etape} total={6} />}

      {/* Carte du wizard */}
      <div className="rounded-2xl p-6 sm:p-8" style={{ background: "#fff", boxShadow: "0 4px 32px rgba(15,76,58,0.10)" }}>
        {contenu()}

        {/* Message d'erreur */}
        {erreur && !succes && (
          <div className="mt-4 px-4 py-3 rounded-xl text-sm" style={{ background: "#FEF2F2", color: "#991B1B" }}>
            {erreur}
          </div>
        )}

        {/* Navigation */}
        {!succes && (
          <div className="flex justify-between mt-8 gap-3">
            {etape > 1 ? (
              <button
                type="button"
                onClick={allerEtapePrecedente}
                className="px-5 py-2.5 rounded-xl text-sm font-medium border transition-colors"
                style={{ borderColor: "#E0DAC8", color: "#0F4C3A", background: "#fff" }}
              >
                ← Précédent
              </button>
            ) : (
              <div />
            )}

            {etape < 6 ? (
              <button
                type="button"
                onClick={allerEtapeSuivante}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: "#0F4C3A", color: "#fff" }}
              >
                Suivant →
              </button>
            ) : (
              <button
                type="button"
                onClick={soumettre}
                disabled={enSoumission}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: "#D4AF37", color: "#0F4C3A" }}
              >
                {enSoumission ? "Publication en cours…" : "Publier mon bien ✓"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
