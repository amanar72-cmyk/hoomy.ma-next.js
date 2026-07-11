"use client";

// « Vos pièces justificatives » — espace propriétaire.
// Deux pièces UNIQUEMENT : CIN et certificat de propriété (le mandat est géré
// par le conseiller ; la RLS l'interdit de toute façon au propriétaire).
//
// Toutes les lectures/écritures passent par le client Supabase AUTHENTIFIÉ du
// navigateur → la RLS s'applique pleinement (jamais de contournement).
// Particularité RLS : le propriétaire n'a que SELECT + INSERT (ni update, ni
// delete). Chaque dépôt/remplacement crée donc un NOUVEAU fichier (nom
// horodaté, jamais de collision → pas d'update storage) et une NOUVELLE ligne
// documents_fiche ; l'affichage retient la plus récente par type.
// Consultation via URL SIGNÉE (bucket privé) — jamais d'URL publique.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { afficherToast } from "@/components/ui/Toaster";
import type { DocumentFiche } from "@/lib/documents/fiche";

const BUCKET = "documents-clients";
const TAILLE_MAX_MO = 10;

const BLOCS: { type: string; titre: string; icone: string; description: string }[] = [
  { type: "cin", titre: "CIN", icone: "🪪", description: "Votre carte d'identité nationale (recto ou recto-verso)" },
  { type: "certificat_propriete", titre: "Certificat de propriété", icone: "📜", description: "Titre foncier ou certificat de propriété du bien" },
];

// Statuts traduits pour le propriétaire (ton rassurant)
const BADGES: Record<string, { label: string; bg: string; color: string }> = {
  depose: { label: "En attente de vérification", bg: "#FEF3C7", color: "#92400E" },
  verifie: { label: "Vérifié ✓", bg: "#D1FAE5", color: "#065F46" },
};

function nomFichier(storagePath: string): string {
  // Retire le préfixe horodaté pour afficher un nom lisible
  const brut = storagePath.split("/").pop() ?? storagePath;
  return brut.replace(/^\d{13}-/, "");
}

function nettoyerNom(nom: string): string {
  const propre = nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_");
  return propre.length > 70 ? propre.slice(-70) : propre;
}

type Props = {
  bienId: string;
  documents: DocumentFiche[]; // la plus récente par type (préparé côté serveur)
};

export default function DocumentsProprietaire({ bienId, documents }: Props) {
  const router = useRouter();
  const [docs, setDocs] = useState<Record<string, DocumentFiche>>(
    Object.fromEntries(documents.map((d) => [d.type_document, d]))
  );
  const [enCours, setEnCours] = useState<string | null>(null);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const inputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  function poserErreur(type: string, message: string | null) {
    setErreurs((prev) => ({ ...prev, [type]: message ?? "" }));
  }

  async function deposer(type: string, fichier: File) {
    const estPdf = fichier.type === "application/pdf";
    const estImage = fichier.type.startsWith("image/");
    if (!estPdf && !estImage) {
      poserErreur(type, "Format non accepté — PDF ou photo uniquement.");
      return;
    }
    if (fichier.size > TAILLE_MAX_MO * 1024 * 1024) {
      poserErreur(type, `Fichier trop lourd (maximum ${TAILLE_MAX_MO} Mo).`);
      return;
    }

    setEnCours(type);
    poserErreur(type, null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        poserErreur(type, "Session expirée — reconnectez-vous puis réessayez.");
        return;
      }

      // 1. Upload — nom horodaté : toujours un INSERT (le propriétaire n'a pas
      //    le droit d'écraser un fichier existant, et n'en a pas besoin)
      const chemin = `${bienId}/${type}/${Date.now()}-${nettoyerNom(fichier.name)}`;
      const { error: eUpload } = await supabase.storage
        .from(BUCKET)
        .upload(chemin, fichier, { upsert: false });
      if (eUpload) {
        // Refus RLS ou autre — message propre, jamais de contournement
        poserErreur(type, "Dépôt refusé. Vérifiez que vous êtes bien connecté avec le compte propriétaire de ce bien.");
        console.error("[documents proprio] upload refusé :", eUpload.message);
        return;
      }

      // 2. Nouvelle ligne documents_fiche (statut 'depose', rôle propriétaire)
      const { data: ligne, error: eLigne } = await supabase
        .from("documents_fiche")
        .insert({
          fiche_id: bienId,
          type_document: type,
          statut: "depose",
          storage_path: chemin,
          uploaded_by: user.id,
          uploaded_by_role: "proprietaire",
        })
        .select("id, type_document, statut, storage_path, cree_le, signe_le")
        .single();

      if (eLigne || !ligne) {
        poserErreur(type, "Enregistrement refusé. Réessayez dans un instant ou contactez votre conseiller.");
        console.error("[documents proprio] insert refusé :", eLigne?.message);
        return;
      }

      setDocs((prev) => ({ ...prev, [type]: ligne as DocumentFiche }));
      afficherToast("Document bien reçu ✓ Votre conseiller va le vérifier.");
      router.refresh();
    } finally {
      setEnCours(null);
    }
  }

  async function voir(doc: DocumentFiche) {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, 300); // 5 minutes, bucket privé
    if (error || !data?.signedUrl) {
      afficherToast("Impossible d'ouvrir le document pour le moment.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {BLOCS.map(({ type, titre, icone, description }) => {
        const doc = docs[type] ?? null;
        const badge = doc ? BADGES[doc.statut] ?? BADGES.depose : null;
        const occupe = enCours === type;
        const estVerifie = doc?.statut === "verifie";
        const erreur = erreurs[type];

        return (
          <div
            key={type}
            className="rounded-xl px-4 py-3.5 flex flex-col gap-2"
            style={{
              background: doc ? "#F8FBF9" : "#FDFBF5",
              border: doc ? "1px solid #C6E8D4" : "1px dashed #E0DAC8",
            }}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg" aria-hidden="true">{icone}</span>
              <p className="text-sm font-semibold flex-1" style={{ color: "#0F4C3A" }}>{titre}</p>
              {badge && (
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
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
                  {/* Remplacement possible tant que le document n'est pas vérifié */}
                  {!estVerifie && (
                    <button
                      type="button"
                      onClick={() => inputsRef.current[type]?.click()}
                      disabled={occupe}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer hover:opacity-80 disabled:opacity-50"
                      style={{ background: "transparent", color: "#0F4C3A", border: "1px solid #C6E8D4" }}
                    >
                      {occupe ? "Envoi…" : "Remplacer"}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <p className="text-xs" style={{ color: "#9DB8AD" }}>{description}</p>
                <button
                  type="button"
                  onClick={() => inputsRef.current[type]?.click()}
                  disabled={occupe}
                  className="mt-auto text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer hover:opacity-90 disabled:opacity-60 w-fit"
                  style={{ background: "#D4AF37", color: "#0F4C3A", border: "none" }}
                >
                  {occupe ? "Envoi en cours…" : "＋ Ajouter"}
                </button>
              </>
            )}

            {erreur && (
              <p className="text-xs" style={{ color: "#B45454" }}>{erreur}</p>
            )}

            <input
              ref={(el) => { inputsRef.current[type] = el; }}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void deposer(type, f);
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
