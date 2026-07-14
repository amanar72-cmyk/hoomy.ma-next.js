// Onglet « Fiche du bien » — informations générales en colonnes, partagé entre
// les fiches pro et admin. N'affiche que les champs réellement présents en base.

import { formaterPrix, formaterMontant } from "@/lib/format";
import type { NiveauBien } from "@/components/partage/CompositionNiveaux";

export type BienFiche = {
  reference: string | null;
  type: string;
  transaction: string;
  prix: number;
  charges: number | null;
  ville: string;
  quartier: string | null;
  surface: number;
  chambres: number;
  salles_bain: number;
  description: string | null;
  equipements: unknown;
  composition: unknown;
  cree_le: string;
  date_soumission: string | null;
  date_affectation: string | null;
  date_publication?: string | null;
  nombre_vues?: number | null;
};

function formaterDate(d: string | null | undefined): string | null {
  if (!d) return null;
  return new Date(d).toLocaleDateString("fr-MA", { day: "2-digit", month: "long", year: "numeric" });
}

function Info({ label, valeur }: { label: string; valeur: string | null }) {
  if (!valeur) return null;
  return (
    <div>
      <p className="text-xs mb-0.5 uppercase tracking-wider" style={{ color: "#9DB8AD" }}>{label}</p>
      <p className="text-sm font-semibold" style={{ color: "#1f2a24" }}>{valeur}</p>
    </div>
  );
}

export default function FicheInfosBien({ bien }: { bien: BienFiche }) {
  const equipements = (Array.isArray(bien.equipements) ? bien.equipements : []) as string[];
  const composition = (Array.isArray(bien.composition) ? bien.composition : []) as NiveauBien[];
  const vues = bien.nombre_vues ?? 0;

  return (
    <div className="flex flex-col gap-6">

      {/* Informations générales en colonnes */}
      <section className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid #F0EDE5" }}>
        <h2 className="text-base font-semibold mb-4" style={{ color: "#0F4C3A" }}>
          Informations générales
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
          <Info label="Type de bien" valeur={bien.type} />
          <Info label="Transaction" valeur={bien.transaction === "location" ? "À louer" : "À vendre"} />
          <Info label="Prix" valeur={formaterPrix(bien.prix, bien.transaction)} />
          {(bien.charges ?? 0) > 0 && (
            <Info label="Charges" valeur={`${formaterMontant(bien.charges!)} DH`} />
          )}
          <Info label="Surface" valeur={bien.surface > 0 ? `${bien.surface} m²` : null} />
          <Info label="Chambres" valeur={bien.chambres > 0 ? String(bien.chambres) : null} />
          <Info label="Salles de bain" valeur={bien.salles_bain > 0 ? String(bien.salles_bain) : null} />
          <Info label="Ville" valeur={bien.ville} />
          <Info label="Quartier" valeur={bien.quartier} />
          <Info label="Référence" valeur={bien.reference} />
        </div>
      </section>

      {/* Suivi : dates du cycle de vie + vues */}
      <section className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid #F0EDE5" }}>
        <h2 className="text-base font-semibold mb-4" style={{ color: "#0F4C3A" }}>
          Suivi
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
          <Info label="Créé le" valeur={formaterDate(bien.cree_le)} />
          <Info label="Soumis le" valeur={formaterDate(bien.date_soumission)} />
          <Info label="Affecté le" valeur={formaterDate(bien.date_affectation)} />
          <Info label="Publié le" valeur={formaterDate(bien.date_publication) ?? "—"} />
          <Info label="Vues de l'annonce" valeur={`${vues} vue${vues !== 1 ? "s" : ""}`} />
        </div>
      </section>

      {/* Composition par niveau (si renseignée) */}
      {composition.length > 0 && (
        <section className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid #F0EDE5" }}>
          <h2 className="text-base font-semibold mb-3" style={{ color: "#0F4C3A" }}>
            Composition
          </h2>
          <div className="flex flex-col gap-2">
            {composition.map((n, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="font-semibold flex-shrink-0" style={{ color: "#0F4C3A" }}>{n.niveau}</span>
                <span style={{ color: "#6B7A71" }}>
                  {(n.pieces ?? []).map((p) => `${p.nombre} ${p.type}`).join(" · ") || "—"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Description */}
      {bien.description && (
        <section className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid #F0EDE5" }}>
          <h2 className="text-base font-semibold mb-2" style={{ color: "#0F4C3A" }}>
            Description
          </h2>
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#3D4A42" }}>
            {bien.description}
          </p>
        </section>
      )}

      {/* Équipements */}
      {equipements.length > 0 && (
        <section className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid #F0EDE5" }}>
          <h2 className="text-base font-semibold mb-3" style={{ color: "#0F4C3A" }}>
            Équipements
          </h2>
          <div className="flex flex-wrap gap-2">
            {equipements.map((e) => (
              <span
                key={e}
                className="text-xs font-medium px-3 py-1.5 rounded-full"
                style={{ background: "#FAFAF8", border: "1px solid #E0DAC8", color: "#3D4A42" }}
              >
                {e}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
