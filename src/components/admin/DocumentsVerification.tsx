"use client";

// « Documents du dossier » — carte de vérification admin.
// Pour chaque pièce (mandat, CIN, certificat) : version la plus récente,
// déposant (agent/propriétaire) + date, badge de statut, « Voir » (URL signée
// 5 min, bucket privé) et « Marquer vérifié » via la SERVER ACTION réservée
// admin (jamais d'update direct depuis le client). Pièce absente = « Non
// déposé ». Indicateur global : dossier complet ET tout vérifié.

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { afficherToast } from "@/components/ui/Toaster";
import { marquerDocumentVerifie } from "@/app/admin/actions";
import type { DocumentFiche } from "@/lib/documents/fiche";

const BUCKET = "documents-clients";

export type DocumentVerification = DocumentFiche & { uploaded_by_role: string | null };

const TYPES: { type: string; titre: string; icone: string }[] = [
  { type: "mandat", titre: "Mandat signé", icone: "✍️" },
  { type: "cin", titre: "CIN", icone: "🪪" },
  { type: "certificat_propriete", titre: "Certificat de propriété", icone: "📜" },
];

const BADGES: Record<string, { label: string; bg: string; color: string }> = {
  en_attente: { label: "En attente", bg: "#FEF3C7", color: "#92400E" },
  signe: { label: "Signé", bg: "#D4AF37", color: "#0F4C3A" },
  depose: { label: "Déposé", bg: "#DBEAFE", color: "#1E40AF" },
  verifie: { label: "Vérifié ✓", bg: "#D1FAE5", color: "#065F46" },
};

const ROLES: Record<string, string> = {
  agent: "l'agent",
  proprietaire: "le propriétaire",
  admin: "l'admin",
};

function dateFr(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-MA", { day: "2-digit", month: "short", year: "numeric" });
}

type Props = {
  // La pièce la plus récente par type (préparée côté serveur)
  documents: DocumentVerification[];
};

export default function DocumentsVerification({ documents }: Props) {
  const [enCours, demarrer] = useTransition();
  // Statuts locaux (mise à jour optimiste après « Marquer vérifié »)
  const [statuts, setStatuts] = useState<Record<string, string>>(
    Object.fromEntries(documents.map((d) => [d.id, d.statut]))
  );

  const parType = Object.fromEntries(documents.map((d) => [d.type_document, d]));
  const nbPresents = TYPES.filter((t) => parType[t.type]).length;
  const toutVerifie =
    nbPresents === TYPES.length &&
    documents.every((d) => (statuts[d.id] ?? d.statut) === "verifie");

  async function voir(doc: DocumentVerification) {
    const supabase = createClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, 300); // 5 minutes — jamais public
    if (error || !data?.signedUrl) {
      afficherToast("Impossible d'ouvrir le document.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  function verifier(doc: DocumentVerification) {
    demarrer(async () => {
      try {
        await marquerDocumentVerifie(doc.id);
        setStatuts((prev) => ({ ...prev, [doc.id]: "verifie" }));
        afficherToast("Document marqué vérifié ✓");
      } catch (e) {
        afficherToast(e instanceof Error ? e.message : "Erreur lors de la vérification");
      }
    });
  }

  return (
    <div
      className="rounded-xl px-3 py-2.5 mb-3"
      style={{ background: "#F8F5EE", border: "1px solid #EDE7D7" }}
    >
      {/* Indicateur global du dossier */}
      <div className="flex items-center gap-2 mb-2">
        <p className="text-xs font-semibold flex-1" style={{ color: "#0F4C3A" }}>
          Documents du dossier
        </p>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
          style={
            toutVerifie
              ? { background: "#D1FAE5", color: "#065F46" }
              : { background: "#FEF3C7", color: "#92400E" }
          }
        >
          {toutVerifie ? "Complet et vérifié ✓" : `${nbPresents}/3 déposés`}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {TYPES.map(({ type, titre, icone }) => {
          const doc = parType[type] ?? null;
          if (!doc) {
            return (
              <div
                key={type}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg"
                style={{ background: "#FEF2F2", border: "1px dashed #FECACA" }}
              >
                <span aria-hidden="true">{icone}</span>
                <span className="text-xs font-medium flex-1" style={{ color: "#991B1B" }}>{titre}</span>
                <span className="text-xs font-semibold" style={{ color: "#991B1B" }}>Non déposé</span>
              </div>
            );
          }

          const statut = statuts[doc.id] ?? doc.statut;
          const badge = BADGES[statut] ?? BADGES.depose;
          const estVerifie = statut === "verifie";

          return (
            <div
              key={type}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg flex-wrap"
              style={{ background: "#fff", border: "1px solid #EDE7D7" }}
            >
              <span aria-hidden="true">{icone}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium" style={{ color: "#0F4C3A" }}>{titre}</p>
                <p className="text-xs" style={{ color: "#9DB8AD" }}>
                  par {ROLES[doc.uploaded_by_role ?? ""] ?? "—"} · {dateFr(doc.cree_le)}
                </p>
              </div>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                style={{ background: badge.bg, color: badge.color }}
              >
                {badge.label}
              </span>
              <button
                type="button"
                onClick={() => voir(doc)}
                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg cursor-pointer hover:opacity-90"
                style={{ background: "#0F4C3A", color: "#fff", border: "none" }}
              >
                Voir
              </button>
              {!estVerifie && (
                <button
                  type="button"
                  onClick={() => verifier(doc)}
                  disabled={enCours}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg cursor-pointer hover:opacity-90 disabled:opacity-50"
                  style={{ background: "#D4AF37", color: "#0F4C3A", border: "none" }}
                >
                  {enCours ? "…" : "Marquer vérifié"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
