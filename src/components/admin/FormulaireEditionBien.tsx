"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { modifierBien, supprimerBien } from "@/app/admin/actions";
import ChampLocalisationCarte from "@/components/partage/ChampLocalisationCarte";
import SelecteurVilleQuartier from "@/components/partage/SelecteurVilleQuartier";
import BoutonGenerationIA from "@/components/partage/BoutonGenerationIA";
import CompositionNiveaux, { type NiveauBien } from "@/components/partage/CompositionNiveaux";
import ChampsCaracteristiques from "@/components/partage/ChampsCaracteristiques";
import { filtrerCaracteristiques, type Caracteristiques } from "@/lib/biens/caracteristiques";
import { createClient } from "@/lib/supabase/client";
import { appliquerFlou } from "@/lib/images/flou";
import { optimiserImage } from "@/lib/images/optimiser";

// ── Types ────────────────────────────────────────────────────────────────────

type BienComplet = {
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
  verifie: boolean;
  statut: string | null;
  latitude: number | null;
  longitude: number | null;
};

// URL publique (floutée tant que non validée) + chemin nette dans le bucket privé.
type PhotoEdition = { url: string; cheminPrive: string };

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

// ── Constantes ───────────────────────────────────────────────────────────────

const TYPES = ["Appartement", "Maison", "Villa", "Riad", "Bureau", "Local commercial", "Terrain"];
const STATUTS = [
  "brouillon", "en_attente_affectation", "dans_la_file",
  "affecte", "finalise", "rejete", "suspendu", "archive", "transacte",
];
const EQUIPEMENTS_LISTE = [
  "Piscine", "Parking", "Terrasse", "Balcon", "Ascenseur", "Gardien",
  "Climatisation", "Chauffage", "Cuisine équipée", "Dressing", "Cave",
  "Jardin", "Vue mer", "Vue montagne", "Sécurité 24h", "Hammam",
];

// ── Composant principal ───────────────────────────────────────────────────────

export default function FormulaireEditionBien({
  bien,
  documentsSlot,
}: {
  bien: BienComplet;
  // Contenu de l'onglet « Documents » (rendu par la page — dépôt/visualisation).
  documentsSlot?: React.ReactNode;
}) {
  const router = useRouter();

  // Onglet actif — découpe la page en rubriques (Informations / Photos / Documents).
  const [onglet, setOnglet] = useState<"infos" | "photos" | "documents">("infos");

  // Champs du formulaire
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
  // Photo principale (cochée) — remise en tête à l'enregistrement (photos[0] = couverture).
  const [principaleUrl, setPrincipaleUrl] = useState<string | null>(bien.photos?.[0] ?? null);
  const dragIndex = useRef<number | null>(null);
  const [nouvelleUrl, setNouvelleUrl] = useState("");
  const [verifie, setVerifie] = useState(bien.verifie);
  const [statut, setStatut] = useState(bien.statut ?? "");
  const [latitude, setLatitude] = useState<number | null>(bien.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(bien.longitude ?? null);

  // États UI
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const [uploadEnCours, setUploadEnCours] = useState(false);
  const [erreurPhoto, setErreurPhoto] = useState<string | null>(null);
  const inputFichierRef = useRef<HTMLInputElement>(null);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function toggleEquipement(e: string) {
    setEquipements((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]
    );
  }

  function supprimerPhoto(url: string) {
    setPhotos((prev) => {
      const suivant = prev.filter((p) => p.url !== url);
      if (url === principaleUrl) setPrincipaleUrl(suivant[0]?.url ?? null);
      return suivant;
    });
  }

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

  /** Ordre final : principale en tête (photos[0] = couverture). */
  function photosOrdonnees(): PhotoEdition[] {
    if (!principaleUrl) return photos;
    const principale = photos.find((p) => p.url === principaleUrl);
    if (!principale) return photos;
    return [principale, ...photos.filter((p) => p.url !== principaleUrl)];
  }

  function ajouterPhoto() {
    const url = nouvelleUrl.trim();
    if (!url) {
      setErreurPhoto("Veuillez saisir une URL valide avant de cliquer Ajouter.");
      return;
    }
    if (photos.some((p) => p.url === url)) {
      setErreurPhoto("Cette URL est déjà dans la liste.");
      return;
    }
    // URL collée manuellement : pas d'original privé associé (supposée déjà publique/sûre).
    setPhotos((prev) => [...prev, { url, cheminPrive: "" }]);
    setNouvelleUrl("");
    setErreurPhoto(null);
  }

  async function uploadFichiers(fichiers: FileList | null) {
    if (!fichiers || fichiers.length === 0) return;
    const liste = Array.from(fichiers).filter(
      (f) => ["image/jpeg", "image/png", "image/webp"].includes(f.type) && f.size <= 10 * 1024 * 1024
    );
    if (liste.length === 0) {
      setErreurPhoto("Formats acceptés : JPG, PNG, WebP — 10 Mo max par photo.");
      return;
    }
    if (photos.length + liste.length > 15) {
      setErreurPhoto("Maximum 15 photos par bien.");
      return;
    }
    setUploadEnCours(true);
    setErreurPhoto(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const prefix = user?.id ?? "admin";
    const nouvellesPhotos: PhotoEdition[] = [];
    for (const fichier of liste) {
      const chemin = `${prefix}/${Date.now()}-${fichier.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      // Optimisation avant upload (orientation EXIF, resize 2000px, JPEG 0.92,
      // EXIF/GPS effacé) — aucun filigrane.
      const nette: File | Blob = await optimiserImage(fichier);

      // 1. Version NETTE → bucket privé
      const { error: erreurPrive } = await supabase.storage.from("biens-prive").upload(chemin, nette);
      if (erreurPrive) {
        setErreurPhoto(`Erreur envoi sécurisé "${fichier.name}" : ${erreurPrive.message}`);
        setUploadEnCours(false);
        return;
      }

      // 2. Version FLOUTÉE → bucket public
      let floutee: Blob;
      try {
        floutee = await appliquerFlou(nette);
      } catch {
        setErreurPhoto(`Erreur lors du floutage de "${fichier.name}".`);
        setUploadEnCours(false);
        return;
      }
      const { data, error } = await supabase.storage.from("biens").upload(chemin, floutee);
      if (error) {
        setErreurPhoto(`Erreur upload "${fichier.name}" : ${error.message}`);
        setUploadEnCours(false);
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from("biens").getPublicUrl(data.path);
      nouvellesPhotos.push({ url: publicUrl, cheminPrive: chemin });
    }
    setPhotos((prev) => [...prev, ...nouvellesPhotos]);
    setUploadEnCours(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!titre.trim()) { setErreur("Le titre est requis."); return; }
    const prixNum = parseFloat(prix);
    if (isNaN(prixNum) || prixNum < 0) { setErreur("Prix invalide."); return; }

    setErreur(null);
    setSucces(false);
    setChargement(true);
    try {
      const res = await modifierBien(bien.id, {
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
        verifie,
        statut: statut || null,
        latitude,
        longitude,
      });
      // Le titre a pu être régénéré par l'IA côté serveur : on l'affiche.
      if (res?.titre) setTitre(res.titre);
      setSucces(true);
      router.refresh();
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setChargement(false);
    }
  }

  async function handleSupprimer() {
    if (!window.confirm(`Supprimer définitivement "${bien.titre}" ? Cette action est irréversible.`)) return;
    setChargement(true);
    try {
      await supprimerBien(bien.id);
      router.push("/admin/biens");
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur lors de la suppression.");
      setChargement(false);
    }
  }

  // ── Styles ──────────────────────────────────────────────────────────────────

  const inp: React.CSSProperties = { borderColor: "#E0DAC8", color: "#0F4C3A", background: "#fff" };
  const cls = "border rounded-xl px-4 py-2.5 text-sm w-full focus:outline-none";

  // ── Rendu ────────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-4xl">

      {/* Feedback */}
      {succes && (
        <div className="px-4 py-3 rounded-xl text-sm border"
          style={{ background: "#D1FAE5", color: "#065F46", borderColor: "#6EE7B7" }}>
          ✓ Bien mis à jour avec succès.
        </div>
      )}
      {erreur && (
        <div className="px-4 py-3 rounded-xl text-sm border"
          style={{ background: "#FEF2F2", color: "#991B1B", borderColor: "#FECACA" }}>
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
      {/* Informations générales */}
      <Section titre="Informations générales">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Champ label="Titre *">
            <input type="text" value={titre} onChange={(e) => setTitre(e.target.value)}
              className={cls} style={inp} placeholder="Appartement lumineux…" />
          </Champ>
          <Champ label="Prix (DH)">
            <input type="number" value={prix} onChange={(e) => setPrix(e.target.value)}
              min="0" step="1" className={cls} style={inp} />
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
          <Champ label="Surface (m²)">
            <input type="number" value={surface} onChange={(e) => setSurface(e.target.value)}
              min="0" step="0.01" className={cls} style={inp} />
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
            placeholder="Description complète du bien…" />
        </div>
      </Section>

      </div>
      )}

      {/* ══ Onglet PHOTOS ═══════════════════════════════════════════════════════ */}
      {onglet === "photos" && (
      <Section titre={`Photos (${photos.length})`}>
        {photos.length > 0 ? (
          <>
          <p className="text-xs mb-2" style={{ color: "#9DB8AD" }}>
            Glissez-déposez pour classer • cochez le cercle pour la photo principale • ✕ pour retirer.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
            {photos.map((p, i) => {
              const estPrincipale = p.url === (principaleUrl ?? photos[0]?.url);
              return (
              <div key={p.url}
                draggable
                onDragStart={() => { dragIndex.current = i; }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => deposerPhoto(i)}
                className="relative rounded-xl overflow-hidden cursor-move"
                style={{ height: 110, background: "#F4F6F5", outline: estPrincipale ? "2px solid #D4AF37" : "none", outlineOffset: -2 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover pointer-events-none"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />

                {/* Cercle « photo principale » (haut gauche) */}
                <button type="button" onClick={() => setPrincipaleUrl(p.url)} title="Photo principale"
                  className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer z-10"
                  style={{ background: estPrincipale ? "#D4AF37" : "rgba(255,255,255,0.9)", border: estPrincipale ? "none" : "1.5px solid #C4D8CE" }}>
                  {estPrincipale && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0F4C3A" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>

                {/* × retirer (haut droite) */}
                <button type="button" onClick={() => supprimerPhoto(p.url)} title="Retirer la photo"
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center text-white text-sm cursor-pointer z-10"
                  style={{ background: "rgba(220,38,38,0.92)" }}>✕</button>

                {estPrincipale && (
                  <span className="absolute bottom-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                    style={{ background: "rgba(212,175,55,0.95)", color: "#0F4C3A" }}>Principale</span>
                )}
              </div>
              );
            })}
          </div>
          </>
        ) : (
          <div className="rounded-xl flex items-center justify-center mb-4"
            style={{ height: 80, background: "#F4F6F5", border: "2px dashed #E0DAC8" }}>
            <p className="text-sm" style={{ color: "#C4D8CE" }}>Aucune photo — ajoutez une URL ci-dessous</p>
          </div>
        )}
        {/* Feedback erreur photos */}
        {erreurPhoto && (
          <div className="px-4 py-2 rounded-xl text-xs border mb-3"
            style={{ background: "#FEF2F2", color: "#991B1B", borderColor: "#FECACA" }}>
            {erreurPhoto}
          </div>
        )}

        {/* Upload fichier — input caché déclenché par le bouton */}
        <input
          ref={inputFichierRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => { uploadFichiers(e.target.files); e.target.value = ""; }}
        />
        <button
          type="button"
          onClick={() => inputFichierRef.current?.click()}
          disabled={uploadEnCours}
          className="w-full mb-3 py-2.5 rounded-xl text-sm font-medium cursor-pointer disabled:opacity-60 transition-opacity hover:opacity-90"
          style={{ background: "#0F4C3A", color: "#fff" }}>
          {uploadEnCours ? "Upload en cours…" : "＋ Ajouter des photos"}
        </button>

        {/* Ajout par URL (option alternative) */}
        <div className="flex gap-2">
          <input type="url" value={nouvelleUrl} onChange={(e) => { setNouvelleUrl(e.target.value); setErreurPhoto(null); }}
            placeholder="Ou coller une URL : https://…"
            className={`${cls} flex-1`} style={inp}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); ajouterPhoto(); } }} />
          <button type="button" onClick={ajouterPhoto}
            className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer flex-shrink-0"
            style={{ background: "#F4F6F5", color: "#0F4C3A", border: "1px solid #E0DAC8" }}>
            + URL
          </button>
        </div>
        <p className="text-xs mt-1.5" style={{ color: "#9DB8AD" }}>
          Cochez le cercle pour choisir la photo principale, glissez-déposez pour classer, ✕ pour retirer.
        </p>
      </Section>

      )}

      {/* ══ Onglet INFORMATIONS (2/2) ═══════════════════════════════════════════ */}
      {onglet === "infos" && (
      <div className="flex flex-col gap-5">
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

      {/* Composition par niveau — parité avec l'espace agent (étages, pièces) */}
      <Section titre="Composition par niveau">
        <p className="text-xs mb-3" style={{ color: "#9DB8AD" }}>
          Optionnel — décrivez le bien niveau par niveau (RDC, étages…) avec les pièces et leur quantité.
        </p>
        <CompositionNiveaux valeur={composition} onChange={setComposition} />
      </Section>

      {/* Statut & Modération */}
      <Section titre="Statut & Modération">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Champ label="Statut du bien">
            <select value={statut} onChange={(e) => setStatut(e.target.value)} className={cls} style={inp}>
              <option value="">— Sans statut —</option>
              {STATUTS.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
              ))}
            </select>
          </Champ>

          <Champ label="Vérifié par HOOMY">
            <div className="flex items-center gap-3 mt-1">
              <button type="button" onClick={() => setVerifie((v) => !v)}
                className="relative inline-flex h-7 w-12 cursor-pointer rounded-full transition-colors duration-200"
                style={{ background: verifie ? "#0F4C3A" : "#D1D5DB" }}
                role="switch" aria-checked={verifie}>
                <span className="absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all duration-200"
                  style={{ left: verifie ? 26 : 4 }} />
              </button>
              <span className="text-sm font-medium"
                style={{ color: verifie ? "#0F4C3A" : "#6B7A71" }}>
                {verifie ? "✓ Vérifié" : "Non vérifié"}
              </span>
            </div>
          </Champ>
        </div>
      </Section>

      </div>
      )}

      {/* ══ Onglet DOCUMENTS ════════════════════════════════════════════════════ */}
      {onglet === "documents" && documentsSlot}

      {/* Barre d'actions (toujours visible) */}
      <div className="flex items-center justify-between pt-2 pb-4">
        <button type="button" onClick={handleSupprimer} disabled={chargement}
          className="px-5 py-2.5 rounded-xl text-sm font-medium border cursor-pointer disabled:opacity-60 transition-colors hover:bg-red-50"
          style={{ borderColor: "#FECACA", color: "#DC2626" }}>
          Supprimer ce bien
        </button>
        <button type="submit" disabled={chargement}
          className="px-7 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-60 hover:opacity-90 transition-opacity"
          style={{ background: "#0F4C3A", color: "#fff" }}>
          {chargement ? "Enregistrement…" : "Enregistrer les modifications"}
        </button>
      </div>
    </form>
  );
}
