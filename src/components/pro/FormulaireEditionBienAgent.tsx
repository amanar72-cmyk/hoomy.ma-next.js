"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  modifierBienAgent,
  transmettreAuBo,
  type DonneesModificationBienAgent,
} from "@/app/pro/biens/actions";
import ChampLocalisationCarte from "@/components/partage/ChampLocalisationCarte";
import SelecteurVilleQuartier from "@/components/partage/SelecteurVilleQuartier";
import BoutonGenerationIA from "@/components/partage/BoutonGenerationIA";
import { appliquerFlou } from "@/lib/images/flou";
import { optimiserImage } from "@/lib/images/optimiser";
import CompositionNiveaux, { type NiveauBien } from "@/components/partage/CompositionNiveaux";
import ChampsCaracteristiques from "@/components/partage/ChampsCaracteristiques";
import { filtrerCaracteristiques, type Caracteristiques } from "@/lib/biens/caracteristiques";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BienEditable = {
  id: string;
  reference: string | null;
  titre: string;
  description: string | null;
  type: string;
  transaction: string;
  prix: number;
  ville: string;
  quartier: string | null;
  chambres: number;
  salles_bain: number;
  surface: number;
  equipements: string[] | null;
  composition: NiveauBien[] | null;
  caracteristiques: Caracteristiques | null;
  photos: string[] | null;
  photos_originales: string[] | null;
  statut: string | null;
  latitude: number | null;
  longitude: number | null;
};

// URL publique (floutée tant que non validée) + chemin nette dans le bucket privé.
type PhotoEdition = { url: string; cheminPrive: string };

// ── Helpers UI ────────────────────────────────────────────────────────────────

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <fieldset
      className="rounded-2xl border p-5"
      style={{ background: "#fff", borderColor: "#F0EDE5", boxShadow: "0 2px 12px rgba(15,76,58,0.05)" }}
    >
      <legend className="px-2 text-sm font-semibold" style={{ color: "#0F4C3A" }}>
        {titre}
      </legend>
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

// ── Constantes ────────────────────────────────────────────────────────────────

const TYPES = ["Appartement", "Maison", "Villa", "Riad", "Bureau", "Local commercial", "Terrain"];
const EQUIPEMENTS_LISTE = [
  "Piscine", "Parking", "Terrasse", "Balcon", "Ascenseur", "Gardien",
  "Climatisation", "Chauffage", "Cuisine équipée", "Dressing", "Cave",
  "Jardin", "Vue mer", "Vue montagne", "Sécurité 24h", "Hammam",
];

const inp: React.CSSProperties = { borderColor: "#E0DAC8", color: "#0F4C3A", background: "#fff" };
const cls = "border rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none";

// ── Composant principal ───────────────────────────────────────────────────────

export default function FormulaireEditionBienAgent({
  bien,
  agentId,
  documentsComplets = true,
  documentsSlot,
}: {
  bien: BienEditable;
  agentId: string;
  // Verrou : les 3 documents du dossier (mandat, CIN, certificat) doivent être
  // déposés avant de pouvoir transmettre au back-office.
  documentsComplets?: boolean;
  // Contenu de l'onglet « Documents » (rendu par la page — dépôt/visualisation).
  documentsSlot?: React.ReactNode;
}) {
  const router = useRouter();

  // Onglet actif — découpe la page en rubriques (Informations / Photos / Documents).
  const [onglet, setOnglet] = useState<"infos" | "photos" | "documents">("infos");

  // ── État des champs ──────────────────────────────────────────────────────────
  const [titre, setTitre] = useState(bien.titre);
  const [description, setDescription] = useState(bien.description ?? "");
  const [type, setType] = useState(bien.type);
  const [transaction, setTransaction] = useState(bien.transaction);
  const [prix, setPrix] = useState(bien.prix.toString());
  const [ville, setVille] = useState(bien.ville);
  const [quartier, setQuartier] = useState(bien.quartier ?? "");
  const [chambres, setChambres] = useState(bien.chambres.toString());
  const [sallesBain, setSallesBain] = useState(bien.salles_bain.toString());
  const [surface, setSurface] = useState(bien.surface.toString());
  const [equipements, setEquipements] = useState<string[]>(bien.equipements ?? []);
  const [composition, setComposition] = useState<NiveauBien[]>(bien.composition ?? []);
  const [caracteristiques, setCaracteristiques] = useState<Caracteristiques>(bien.caracteristiques ?? {});
  const [photos, setPhotos] = useState<PhotoEdition[]>(
    (bien.photos ?? []).map((url, i) => ({ url, cheminPrive: bien.photos_originales?.[i] ?? "" }))
  );
  // URL de la photo principale (cochée). Par défaut la 1re. À l'enregistrement,
  // elle est remise en tête du tableau (le reste du site utilise photos[0]).
  const [principaleUrl, setPrincipaleUrl] = useState<string | null>(bien.photos?.[0] ?? null);
  const dragIndex = useRef<number | null>(null);
  const [latitude, setLatitude] = useState<number | null>(bien.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(bien.longitude ?? null);

  // ── État UI ──────────────────────────────────────────────────────────────────
  const [chargement, setChargement] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const [uploadEnCours, setUploadEnCours] = useState(false);
  const [dragDessus, setDragDessus] = useState(false);
  const fichierRef = useRef<HTMLInputElement>(null);

  // ── Équipements ──────────────────────────────────────────────────────────────
  function toggleEquipement(eq: string) {
    setEquipements((prev) =>
      prev.includes(eq) ? prev.filter((x) => x !== eq) : [...prev, eq]
    );
  }

  // ── Photos ───────────────────────────────────────────────────────────────────
  function supprimerPhoto(url: string) {
    setPhotos((prev) => {
      const suivant = prev.filter((p) => p.url !== url);
      // Si on supprime la principale, la 1re restante devient principale.
      if (url === principaleUrl) setPrincipaleUrl(suivant[0]?.url ?? null);
      return suivant;
    });
  }

  // Glisser-déposer : réordonne les photos librement.
  function deposerPhoto(cible: number) {
    const src = dragIndex.current;
    dragIndex.current = null;
    if (src === null || src === cible) return;
    setPhotos((prev) => {
      const arr = [...prev];
      const [deplacee] = arr.splice(src, 1);
      arr.splice(cible, 0, deplacee);
      return arr;
    });
  }

  /** Ordre final envoyé au serveur : la principale d'abord (photos[0] = couverture). */
  function photosOrdonnees(): PhotoEdition[] {
    if (!principaleUrl) return photos;
    const principale = photos.find((p) => p.url === principaleUrl);
    if (!principale) return photos;
    return [principale, ...photos.filter((p) => p.url !== principaleUrl)];
  }

  async function uploadFichiers(fichiers: FileList | File[]) {
    const liste = Array.from(fichiers).filter((f) =>
      ["image/jpeg", "image/png", "image/webp"].includes(f.type) && f.size <= 5 * 1024 * 1024
    );
    if (liste.length === 0) {
      setErreur("Formats acceptés : JPG, PNG, WebP — 5 Mo max par photo.");
      return;
    }
    if (photos.length + liste.length > 15) {
      setErreur("Maximum 15 photos par bien.");
      return;
    }

    setUploadEnCours(true);
    setErreur(null);
    const supabase = createClient();
    const nouvellesPhotos: PhotoEdition[] = [];

    for (const fichier of liste) {
      const chemin = `${agentId}/${Date.now()}-${fichier.name.replace(/\s+/g, "_")}`;
      // Optimisation avant upload (orientation EXIF, resize 2000px, JPEG 0.92,
      // EXIF/GPS effacé) — aucun filigrane.
      const nette: File | Blob = await optimiserImage(fichier);

      // 1. Version NETTE → bucket privé (jamais public tant que non validé)
      const { error: erreurPrive } = await supabase.storage
        .from("biens-prive")
        .upload(chemin, nette, { upsert: false });
      if (erreurPrive) {
        setErreur(`Erreur envoi sécurisé "${fichier.name}" : ${erreurPrive.message}`);
        setUploadEnCours(false);
        return;
      }

      // 2. Version FLOUTÉE (dérivée de la nette) → bucket public
      let floutee: Blob;
      try {
        floutee = await appliquerFlou(nette);
      } catch (err) {
        setErreur(`Erreur lors du floutage de "${fichier.name}".`);
        setUploadEnCours(false);
        return;
      }
      const { data, error } = await supabase.storage
        .from("biens")
        .upload(chemin, floutee, { upsert: false });

      if (error) {
        setErreur(`Erreur upload "${fichier.name}" : ${error.message}`);
        setUploadEnCours(false);
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from("biens").getPublicUrl(data.path);
      nouvellesPhotos.push({ url: publicUrl, cheminPrive: chemin });
    }

    setPhotos((prev) => [...prev, ...nouvellesPhotos]);
    setUploadEnCours(false);
  }

  function handleFichierChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) uploadFichiers(e.target.files);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragDessus(false);
    if (e.dataTransfer.files) uploadFichiers(e.dataTransfer.files);
  }

  // ── Enregistrer ──────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titre.trim()) { setErreur("Le titre est requis."); return; }
    const prixNum = parseFloat(prix);
    if (isNaN(prixNum) || prixNum < 0) { setErreur("Prix invalide."); return; }

    const donnees: DonneesModificationBienAgent = {
      titre: titre.trim(),
      description: description.trim() || null,
      type,
      transaction,
      prix: prixNum,
      ville,
      quartier: quartier.trim() || null,
      chambres: type === "Terrain" ? 0 : Math.max(0, parseInt(chambres) || 0),
      salles_bain: type === "Terrain" ? 0 : Math.max(0, parseInt(sallesBain) || 0),
      surface: Math.max(0, parseFloat(surface) || 0),
      equipements: equipements.length > 0 ? equipements : null,
      composition: composition.length > 0 ? composition : null,
      caracteristiques: filtrerCaracteristiques(type, caracteristiques),
      photos: photos.length > 0 ? photosOrdonnees().map((p) => p.url) : null,
      photosOriginales: photos.length > 0 ? photosOrdonnees().map((p) => p.cheminPrive) : null,
      latitude,
      longitude,
    };

    setErreur(null);
    setSucces(false);
    setChargement(true);
    try {
      await modifierBienAgent(bien.id, donnees);
      setSucces(true);
      router.refresh();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setChargement(false);
    }
  }

  // ── Transmettre au BO ────────────────────────────────────────────────────────
  async function handleTransmettre() {
    if (!documentsComplets) {
      setErreur("Déposez les 3 documents (mandat, CIN, certificat) avant d'envoyer au backoffice.");
      return;
    }
    if (!window.confirm("Transmettre ce bien au back-office pour publication ?")) return;
    setErreur(null);
    setEnvoi(true);
    try {
      await transmettreAuBo(bien.id);
      router.push("/pro/biens");
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur lors de la transmission.");
      setEnvoi(false);
    }
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-4xl">

      {/* Feedback */}
      {succes && (
        <div
          className="px-4 py-3 rounded-xl text-sm border"
          style={{ background: "#D1FAE5", color: "#065F46", borderColor: "#6EE7B7" }}
        >
          ✓ Modifications enregistrées.
        </div>
      )}
      {erreur && (
        <div
          className="px-4 py-3 rounded-xl text-sm border"
          style={{ background: "#FEF2F2", color: "#991B1B", borderColor: "#FECACA" }}
        >
          {erreur}
        </div>
      )}

      {/* ── Onglets (rubriques) ─────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b overflow-x-auto" style={{ borderColor: "#F0EDE5" }}>
        {(
          [
            { id: "infos", label: "Informations" },
            { id: "photos", label: `Photos (${photos.length})` },
            ...(documentsSlot ? [{ id: "documents", label: "Documents" }] : []),
          ] as { id: "infos" | "photos" | "documents"; label: string }[]
        ).map((o) => {
          const actif = onglet === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => setOnglet(o.id)}
              className="px-4 py-2.5 text-sm font-medium cursor-pointer whitespace-nowrap relative -mb-px transition-colors"
              style={{
                color: actif ? "#0F4C3A" : "#9DB8AD",
                borderBottom: actif ? "2px solid #0F4C3A" : "2px solid transparent",
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      {/* ══ Onglet INFORMATIONS (1/2) ═══════════════════════════════════════════ */}
      {onglet === "infos" && (
      <div className="flex flex-col gap-5">
      {/* ── Informations générales ──────────────────────────────────────────── */}
      <Section titre="Informations générales">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Champ label="Titre *">
            <input
              type="text"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              className={cls}
              style={inp}
              placeholder="Appartement lumineux…"
            />
          </Champ>
          <Champ label="Prix (DH)">
            <input
              type="number"
              value={prix}
              onChange={(e) => setPrix(e.target.value)}
              min="0"
              step="1"
              className={cls}
              style={inp}
            />
          </Champ>
          <Champ label="Type de bien">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className={cls}
              style={inp}
            >
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Champ>
          <Champ label="Transaction">
            <select
              value={transaction}
              onChange={(e) => setTransaction(e.target.value)}
              className={cls}
              style={inp}
            >
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
                <input
                  type="number"
                  value={chambres}
                  onChange={(e) => setChambres(e.target.value)}
                  min="0"
                  className={cls}
                  style={inp}
                />
              </Champ>
              <Champ label="Salles de bain">
                <input
                  type="number"
                  value={sallesBain}
                  onChange={(e) => setSallesBain(e.target.value)}
                  min="0"
                  className={cls}
                  style={inp}
                />
              </Champ>
            </>
          )}
          <Champ label="Surface (m²)">
            <input
              type="number"
              value={surface}
              onChange={(e) => setSurface(e.target.value)}
              min="0"
              step="0.01"
              className={cls}
              style={inp}
            />
          </Champ>
        </div>
      </Section>

      {/* ── Description ─────────────────────────────────────────────────────── */}
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

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className={cls}
            style={{ ...inp, resize: "vertical" }}
            placeholder="Description complète du bien…"
          />
        </div>
      </Section>

      </div>
      )}

      {/* ══ Onglet PHOTOS ═══════════════════════════════════════════════════════ */}
      {onglet === "photos" && (
      <Section titre={`Photos (${photos.length}/15)`}>
        {/* Grille des photos existantes */}
        {photos.length > 0 && (
          <>
            <p className="text-xs mb-2" style={{ color: "#9DB8AD" }}>
              Glissez-déposez pour classer • cochez le cercle pour la photo principale • ✕ pour retirer.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
              {photos.map((p, i) => {
                const estPrincipale = p.url === (principaleUrl ?? photos[0]?.url);
                return (
                  <div
                    key={p.url}
                    draggable
                    onDragStart={() => { dragIndex.current = i; }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => deposerPhoto(i)}
                    className="relative rounded-xl overflow-hidden cursor-move"
                    style={{ height: 110, background: "#F4F6F5", outline: estPrincipale ? "2px solid #D4AF37" : "none", outlineOffset: -2 }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.url}
                      alt={`Photo ${i + 1}`}
                      className="w-full h-full object-cover pointer-events-none"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />

                    {/* Cercle « photo principale » (haut gauche) */}
                    <button
                      type="button"
                      onClick={() => setPrincipaleUrl(p.url)}
                      title="Photo principale"
                      className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer z-10"
                      style={{
                        background: estPrincipale ? "#D4AF37" : "rgba(255,255,255,0.9)",
                        border: estPrincipale ? "none" : "1.5px solid #C4D8CE",
                      }}
                    >
                      {estPrincipale && (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0F4C3A" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>

                    {/* × retirer (haut droite) */}
                    <button
                      type="button"
                      onClick={() => supprimerPhoto(p.url)}
                      title="Retirer la photo"
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-white text-sm cursor-pointer z-10"
                      style={{ background: "rgba(220,38,38,0.92)" }}
                    >
                      ✕
                    </button>

                    {estPrincipale && (
                      <span className="absolute bottom-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                        style={{ background: "rgba(212,175,55,0.95)", color: "#0F4C3A" }}>
                        Principale
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Zone de dépôt */}
        <div
          className="rounded-xl flex flex-col items-center justify-center gap-3 py-8 cursor-pointer transition-all"
          style={{
            border: `2px dashed ${dragDessus ? "#0F4C3A" : "#E0DAC8"}`,
            background: dragDessus ? "#F0FAF4" : "#FAFAF8",
          }}
          onClick={() => fichierRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragDessus(true); }}
          onDragLeave={() => setDragDessus(false)}
          onDrop={handleDrop}
        >
          {uploadEnCours ? (
            <p className="text-sm font-medium" style={{ color: "#0F4C3A" }}>
              Upload en cours…
            </p>
          ) : (
            <>
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#9DB8AD" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: "#0F4C3A" }}>
                  Déposez vos photos ici ou cliquez pour parcourir
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#9DB8AD" }}>
                  JPG, PNG, WebP — 5 Mo max — 15 photos maximum
                </p>
              </div>
            </>
          )}
        </div>
        <input
          ref={fichierRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleFichierChange}
        />
      </Section>

      )}

      {/* ══ Onglet INFORMATIONS (2/2) ═══════════════════════════════════════════ */}
      {onglet === "infos" && (
      <div className="flex flex-col gap-5">
      {/* ── Équipements ─────────────────────────────────────────────────────── */}
      <Section titre="Équipements">
        <div className="flex flex-wrap gap-2">
          {EQUIPEMENTS_LISTE.map((eq) => {
            const actif = equipements.includes(eq);
            return (
              <button
                key={eq}
                type="button"
                onClick={() => toggleEquipement(eq)}
                className="px-3 py-1.5 rounded-full text-sm border cursor-pointer transition-all"
                style={
                  actif
                    ? { background: "#0F4C3A", color: "#fff", borderColor: "#0F4C3A" }
                    : { background: "#F4F6F5", color: "#6B7A71", borderColor: "#E0DAC8" }
                }
              >
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

      {/* ── Caractéristiques spécifiques au type (étage, terrain, titre…) ────── */}
      <Section titre={`Caractéristiques — ${type}`}>
        <p className="text-xs mb-4" style={{ color: "#9DB8AD" }}>
          Détails propres à un {type.toLowerCase()}. Les champs s'adaptent au type de bien.
        </p>
        <ChampsCaracteristiques type={type} valeur={caracteristiques} onChange={setCaracteristiques} />
      </Section>

      {/* ── Composition par niveau ──────────────────────────────────────────── */}
      <Section titre="Composition du bien">
        <p className="text-xs mb-4" style={{ color: "#9DB8AD" }}>
          Optionnel — décrivez le bien niveau par niveau (pièces, quantités).
        </p>
        <CompositionNiveaux valeur={composition} onChange={setComposition} />
      </Section>

      </div>
      )}

      {/* ══ Onglet DOCUMENTS ════════════════════════════════════════════════════ */}
      {onglet === "documents" && documentsSlot}

      {/* ── Barre d'actions (toujours visible) ──────────────────────────────── */}
      {!documentsComplets && (
        <p className="text-xs -mb-2" style={{ color: "#92400E" }}>
          📁 Déposez les 3 documents (mandat, CIN, certificat) avant d&apos;envoyer au backoffice —
          onglet « Documents » ci-dessus.
        </p>
      )}
      <div
        className="flex items-center justify-between gap-3 pt-2 pb-4 flex-wrap"
      >
        <button
          type="button"
          onClick={handleTransmettre}
          disabled={envoi || chargement || !documentsComplets}
          title={!documentsComplets ? "Déposez les 3 documents (mandat, CIN, certificat) avant d'envoyer au backoffice." : undefined}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border cursor-pointer transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ borderColor: "#D4AF37", color: "#92400E", background: "#FEF9C3" }}
        >
          {envoi ? (
            "Transmission…"
          ) : (
            <>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              Transmettre au back-office
            </>
          )}
        </button>

        <button
          type="submit"
          disabled={chargement || uploadEnCours}
          className="px-7 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-60 hover:opacity-90 transition-opacity"
          style={{ background: "#0F4C3A", color: "#fff" }}
        >
          {chargement ? "Enregistrement…" : "Enregistrer les modifications"}
        </button>
      </div>
    </form>
  );
}
