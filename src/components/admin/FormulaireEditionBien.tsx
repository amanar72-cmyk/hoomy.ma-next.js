"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { modifierBien, supprimerBien } from "@/app/admin/actions";

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
  photos: string[] | null;
  verifie: boolean;
  statut: string | null;
};

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

const TYPES = ["Appartement", "Villa", "Riad", "Bureau", "Terrain"];
const VILLES = ["Casablanca", "Marrakech", "Rabat", "Tanger", "Agadir", "Fès"];
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

export default function FormulaireEditionBien({ bien }: { bien: BienComplet }) {
  const router = useRouter();

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
  const [photos, setPhotos] = useState<string[]>(bien.photos ?? []);
  const [nouvelleUrl, setNouvelleUrl] = useState("");
  const [verifie, setVerifie] = useState(bien.verifie);
  const [statut, setStatut] = useState(bien.statut ?? "");

  // États UI
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

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
    if (isNaN(prixNum) || prixNum < 0) { setErreur("Prix invalide."); return; }

    setErreur(null);
    setSucces(false);
    setChargement(true);
    try {
      await modifierBien(bien.id, {
        titre: titre.trim(),
        description: description.trim() || null,
        type,
        transaction,
        prix: prixNum,
        ville,
        quartier: quartier.trim() || null,
        chambres: Math.max(0, parseInt(chambres) || 0),
        salles_bain: Math.max(0, parseInt(sallesBain) || 0),
        surface: Math.max(0, parseFloat(surface) || 0),
        equipements: equipements.length > 0 ? equipements : null,
        photos: photos.length > 0 ? photos : null,
        verifie,
        statut: statut || null,
      });
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

      {/* Informations générales */}
      <Section titre="Informations générales">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <Champ label="Ville">
            <select value={ville} onChange={(e) => setVille(e.target.value)} className={cls} style={inp}>
              {VILLES.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </Champ>
          <Champ label="Quartier">
            <input type="text" value={quartier} onChange={(e) => setQuartier(e.target.value)}
              className={cls} style={inp} placeholder="Ex: Maarif, Guéliz…" />
          </Champ>
          <Champ label="Chambres">
            <input type="number" value={chambres} onChange={(e) => setChambres(e.target.value)}
              min="0" className={cls} style={inp} />
          </Champ>
          <Champ label="Salles de bain">
            <input type="number" value={sallesBain} onChange={(e) => setSallesBain(e.target.value)}
              min="0" className={cls} style={inp} />
          </Champ>
          <Champ label="Surface (m²)">
            <input type="number" value={surface} onChange={(e) => setSurface(e.target.value)}
              min="0" step="0.01" className={cls} style={inp} />
          </Champ>
        </div>
      </Section>

      {/* Description */}
      <Section titre="Description">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
          rows={6} className={cls} style={{ ...inp, resize: "vertical" }}
          placeholder="Description complète du bien…" />
      </Section>

      {/* Photos */}
      <Section titre={`Photos (${photos.length})`}>
        {photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
            {photos.map((url, i) => (
              <div key={url} className="relative rounded-xl overflow-hidden group"
                style={{ height: 110, background: "#F4F6F5" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                {/* Badge photo principale */}
                {i === 0 && (
                  <span className="absolute top-1.5 left-1.5 text-xs px-1.5 py-0.5 rounded-md font-medium"
                    style={{ background: "rgba(15,76,58,0.88)", color: "#fff" }}>
                    Principale
                  </span>
                )}
                {/* Overlay actions au survol */}
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
        {/* Ajout par URL */}
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

      {/* Barre d'actions */}
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
