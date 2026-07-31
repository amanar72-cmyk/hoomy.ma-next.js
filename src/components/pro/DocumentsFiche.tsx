"use client";

// Section « Documents » de la fiche bien côté agent — 3 pièces du dossier :
// mandat signé, CIN, certificat de propriété.
// - Upload direct vers le bucket PRIVÉ "documents-clients" au chemin imposé
//   <bien_id>/<type_document>/<fichier> (la RLS storage s'appuie dessus)
// - Consultation via URL SIGNÉE (createSignedUrl) — jamais d'URL publique
// - Insert/maj de la ligne documents_fiche (mandat → signe + signe_le ;
//   cin / certificat → depose), uploaded_by = auth.uid(), rôle agent
// - « Remplacer » : upload upsert:true + mise à jour de la même ligne

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { afficherToast } from "@/components/ui/Toaster";
import type { DocumentFiche } from "@/lib/documents/fiche";

const BUCKET = "documents-clients";
const TAILLE_MAX_MO = 10;

const BLOCS: { type: string; titre: string; icone: string; description: string }[] = [
  { type: "mandat", titre: "Mandat signé", icone: "✍️", description: "Mandat de vente/location signé par le propriétaire" },
  { type: "cin", titre: "CIN", icone: "🪪", description: "Carte d'identité nationale du propriétaire" },
  { type: "certificat_propriete", titre: "Certificat de propriété", icone: "📜", description: "Titre foncier ou certificat de propriété" },
];

const BADGES_STATUT: Record<string, { label: string; bg: string; color: string }> = {
  en_attente: { label: "En attente", bg: "#FEF3C7", color: "#92400E" },
  signe: { label: "Signé", bg: "#D4AF37", color: "#0F4C3A" },
  verifie: { label: "Vérifié ✓", bg: "#D1FAE5", color: "#065F46" },
  depose: { label: "Déposé", bg: "#DBEAFE", color: "#1E40AF" },
};

function nomFichier(storagePath: string): string {
  return storagePath.split("/").pop() ?? storagePath;
}

// Nom de fichier sûr pour Storage (accents/espaces/caractères spéciaux retirés)
function nettoyerNom(nom: string): string {
  const propre = nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
  return propre.length > 80 ? propre.slice(-80) : propre;
}

type Props = {
  bienId: string;
  documents: DocumentFiche[]; // le plus récent par type (préparé côté serveur)
  /** Rôle de l'uploadeur — trace qui a déposé (agent en pro, admin en back-office). */
  role?: "agent" | "admin";
};

export default function DocumentsFiche({ bienId, documents, role = "agent" }: Props) {
  const router = useRouter();
  const [docs, setDocs] = useState<Record<string, DocumentFiche>>(
    Object.fromEntries(documents.map((d) => [d.type_document, d]))
  );
  const [enCours, setEnCours] = useState<string | null>(null); // type en cours d'envoi
  const inputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  async function uploader(type: string, fichier: File) {
    // Garde-fous côté client (la RLS reste la vraie barrière)
    const estPdf = fichier.type === "application/pdf";
    const estImage = fichier.type.startsWith("image/");
    if (!estPdf && !estImage) {
      afficherToast("Format non accepté — PDF ou image uniquement.");
      return;
    }
    if (fichier.size > TAILLE_MAX_MO * 1024 * 1024) {
      afficherToast(`Fichier trop lourd (max ${TAILLE_MAX_MO} Mo).`);
      return;
    }

    setEnCours(type);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        afficherToast("Session expirée — reconnectez-vous.");
        return;
      }

      // 1. Upload vers le bucket privé — chemin imposé par la RLS storage
      const chemin = `${bienId}/${type}/${nettoyerNom(fichier.name)}`;
      const { error: eUpload } = await supabase.storage
        .from(BUCKET)
        .upload(chemin, fichier, { upsert: true });
      if (eUpload) {
        afficherToast(`Envoi impossible : ${eUpload.message}`);
        return;
      }

      // 2. Insert / mise à jour de la ligne documents_fiche
      const statut = type === "mandat" ? "signe" : "depose";
      const signeLe = type === "mandat" ? new Date().toISOString() : null;
      const existant = docs[type];

      const colonnes = "id, type_document, statut, storage_path, cree_le, signe_le";
      const valeurs = {
        storage_path: chemin,
        statut,
        signe_le: signeLe,
        uploaded_by: user.id,
        uploaded_by_role: role,
      };

      const { data: ligne, error: eLigne } = existant
        ? await supabase.from("documents_fiche").update(valeurs).eq("id", existant.id).select(colonnes).single()
        : await supabase.from("documents_fiche").insert({ fiche_id: bienId, type_document: type, ...valeurs }).select(colonnes).single();

      if (eLigne || !ligne) {
        afficherToast(`Enregistrement impossible : ${eLigne?.message ?? "erreur inconnue"}`);
        return;
      }

      setDocs((prev) => ({ ...prev, [type]: ligne as DocumentFiche }));
      afficherToast(existant ? "Document remplacé ✓" : "Document déposé ✓");
      // Resynchronise le Server Component (verrou d'envoi au back-office)
      router.refresh();
    } finally {
      setEnCours(null);
    }
  }

  async function voir(doc: DocumentFiche) {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, 300); // 5 minutes
    if (error || !data?.signedUrl) {
      afficherToast("Impossible d'ouvrir le document.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  const nbPresents = BLOCS.filter((b) => docs[b.type]).length;

  return (
    <div>
      {/* Compteur d'avancement du dossier */}
      <div className="flex items-center gap-2 mb-3">
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={
            nbPresents === BLOCS.length
              ? { background: "#D1FAE5", color: "#065F46" }
              : { background: "#FEF3C7", color: "#92400E" }
          }
        >
          {nbPresents}/{BLOCS.length}
        </span>
        <span className="text-xs" style={{ color: "#9DB8AD" }}>
          {nbPresents === BLOCS.length
            ? "Dossier complet — le bien peut être transmis au back-office."
            : "documents déposés — les 3 sont requis pour transmettre au back-office."}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {BLOCS.map(({ type, titre, icone, description }) => {
          const doc = docs[type] ?? null;
          const badge = doc ? BADGES_STATUT[doc.statut] ?? BADGES_STATUT.depose : null;
          const occupe = enCours === type;

          return (
            <div
              key={type}
              className="rounded-xl px-4 py-3.5 flex flex-col gap-2"
              style={{
                background: doc ? "#F8FBF9" : "#F8F5EE",
                border: doc ? "1px solid #C6E8D4" : "1px dashed #E0DAC8",
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden="true">{icone}</span>
                <p className="text-sm font-semibold flex-1" style={{ color: "#0F4C3A" }}>{titre}</p>
                {badge && (
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    {badge.label}
                  </span>
                )}
              </div>

              {doc ? (
                <>
                  <p className="text-xs truncate" title={nomFichier(doc.storage_path)} style={{ color: "#6B7A71" }}>
                    📎 {nomFichier(doc.storage_path)}
                  </p>
                  <div className="flex gap-2 mt-auto">
                    <button
                      type="button"
                      onClick={() => voir(doc)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer hover:opacity-90"
                      style={{ background: "#0F4C3A", color: "#fff", border: "none" }}
                    >
                      Voir
                    </button>
                    <button
                      type="button"
                      onClick={() => inputsRef.current[type]?.click()}
                      disabled={occupe}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer hover:opacity-80 disabled:opacity-50"
                      style={{ background: "transparent", color: "#0F4C3A", border: "1px solid #C6E8D4" }}
                    >
                      {occupe ? "Envoi…" : "Remplacer"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs" style={{ color: "#9DB8AD" }}>{description}</p>
                  <button
                    type="button"
                    onClick={() => inputsRef.current[type]?.click()}
                    disabled={occupe}
                    className="mt-auto text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer hover:opacity-90 disabled:opacity-60"
                    style={{ background: "#D4AF37", color: "#0F4C3A", border: "none" }}
                  >
                    {occupe ? "Envoi en cours…" : "＋ Déposer le document"}
                  </button>
                </>
              )}

              {/* Input fichier masqué (PDF + images) */}
              <input
                ref={(el) => { inputsRef.current[type] = el; }}
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = ""; // permet de re-sélectionner le même fichier
                  if (f) void uploader(type, f);
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
