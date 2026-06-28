"use client";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PieceNiveau = {
  type: string;
  nombre: number;
};

export type NiveauBien = {
  niveau: string;
  pieces: PieceNiveau[];
};

// ── Référentiels ──────────────────────────────────────────────────────────────

const NIVEAUX_DISPONIBLES = [
  "Sous-sol",
  "Rez-de-chaussée",
  "Mezzanine",
  "1er étage",
  "2e étage",
  "3e étage",
  "4e étage",
  "5e étage",
  "Combles/Dernier étage",
];

const TYPES_PIECES = [
  "Salon",
  "Salle à manger",
  "Chambre",
  "Suite parentale",
  "Cuisine",
  "Salle de bain",
  "Toilette séparée (WC)",
  "Balcon",
  "Terrasse",
  "Bureau",
  "Buanderie",
  "Dressing",
  "Garage",
  "Cave",
  "Jardin",
  "Hall/Entrée",
  "Débarras",
];

// ── Styles partagés ───────────────────────────────────────────────────────────

const selCls = "border rounded-xl px-3 py-2 text-sm focus:outline-none w-full";
const selStyle: React.CSSProperties = { borderColor: "#E0DAC8", color: "#0F4C3A", background: "#fff" };

// ── Composant ─────────────────────────────────────────────────────────────────

type Props = {
  valeur: NiveauBien[];
  onChange: (v: NiveauBien[]) => void;
};

export default function CompositionNiveaux({ valeur, onChange }: Props) {
  function ajouterNiveau() {
    const deja = new Set(valeur.map((n) => n.niveau));
    const prochain = NIVEAUX_DISPONIBLES.find((n) => !deja.has(n)) ?? NIVEAUX_DISPONIBLES[0];
    onChange([...valeur, { niveau: prochain, pieces: [] }]);
  }

  function supprimerNiveau(i: number) {
    onChange(valeur.filter((_, idx) => idx !== i));
  }

  function changerNomNiveau(i: number, nom: string) {
    onChange(valeur.map((n, idx) => (idx === i ? { ...n, niveau: nom } : n)));
  }

  function ajouterPiece(i: number) {
    const deja = new Set(valeur[i].pieces.map((p) => p.type));
    const prochaine = TYPES_PIECES.find((t) => !deja.has(t)) ?? TYPES_PIECES[0];
    onChange(
      valeur.map((n, idx) =>
        idx === i ? { ...n, pieces: [...n.pieces, { type: prochaine, nombre: 1 }] } : n
      )
    );
  }

  function supprimerPiece(iNiveau: number, iPiece: number) {
    onChange(
      valeur.map((n, idx) =>
        idx === iNiveau ? { ...n, pieces: n.pieces.filter((_, j) => j !== iPiece) } : n
      )
    );
  }

  function changerTypePiece(iNiveau: number, iPiece: number, type: string) {
    onChange(
      valeur.map((n, idx) =>
        idx === iNiveau
          ? { ...n, pieces: n.pieces.map((p, j) => (j === iPiece ? { ...p, type } : p)) }
          : n
      )
    );
  }

  function changerNombrePiece(iNiveau: number, iPiece: number, delta: number) {
    onChange(
      valeur.map((n, idx) =>
        idx === iNiveau
          ? {
              ...n,
              pieces: n.pieces.map((p, j) =>
                j === iPiece ? { ...p, nombre: Math.max(1, p.nombre + delta) } : p
              ),
            }
          : n
      )
    );
  }

  return (
    <div className="flex flex-col gap-4">

      {valeur.length === 0 && (
        <p className="text-sm" style={{ color: "#9DB8AD" }}>
          Aucun niveau ajouté. Cliquez sur &laquo;&nbsp;Ajouter un niveau&nbsp;&raquo; pour décrire la composition du bien.
        </p>
      )}

      {valeur.map((niveau, iNiveau) => (
        <div
          key={iNiveau}
          className="rounded-xl p-4"
          style={{ background: "#F9F7F4", border: "1px solid #EDE7D7" }}
        >
          {/* ── En-tête du niveau ──────────────────────────────────────────── */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <select
              value={niveau.niveau}
              onChange={(e) => changerNomNiveau(iNiveau, e.target.value)}
              className={selCls}
              style={{ ...selStyle, fontWeight: 600, maxWidth: 260 }}
            >
              {NIVEAUX_DISPONIBLES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => supprimerNiveau(iNiveau)}
              className="ml-auto text-xs px-3 py-1.5 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
              style={{ borderColor: "#FECACA", color: "#DC2626", background: "#FFF5F5" }}
            >
              ✕ Supprimer ce niveau
            </button>
          </div>

          {/* ── Pièces du niveau ────────────────────────────────────────────── */}
          {niveau.pieces.length > 0 && (
            <div className="flex flex-col gap-2 mb-3">
              {niveau.pieces.map((piece, iPiece) => (
                <div key={iPiece} className="flex items-center gap-2 flex-wrap">

                  {/* Sélecteur de type */}
                  <select
                    value={piece.type}
                    onChange={(e) => changerTypePiece(iNiveau, iPiece, e.target.value)}
                    className={selCls}
                    style={{ ...selStyle, flex: "1 1 160px", maxWidth: 240 }}
                  >
                    {TYPES_PIECES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>

                  {/* Compteur de nombre */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => changerNombrePiece(iNiveau, iPiece, -1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-base cursor-pointer border hover:opacity-80"
                      style={{ borderColor: "#E0DAC8", color: "#0F4C3A", background: "#fff" }}
                      aria-label="Diminuer"
                    >
                      −
                    </button>
                    <span
                      className="w-6 text-center text-sm font-semibold"
                      style={{ color: "#0F4C3A" }}
                    >
                      {piece.nombre}
                    </span>
                    <button
                      type="button"
                      onClick={() => changerNombrePiece(iNiveau, iPiece, 1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-base cursor-pointer border hover:opacity-80"
                      style={{ borderColor: "#E0DAC8", color: "#0F4C3A", background: "#fff" }}
                      aria-label="Augmenter"
                    >
                      +
                    </button>
                  </div>

                  {/* Supprimer la pièce */}
                  <button
                    type="button"
                    onClick={() => supprimerPiece(iNiveau, iPiece)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs cursor-pointer border hover:opacity-80 flex-shrink-0"
                    style={{ borderColor: "#FECACA", color: "#DC2626", background: "#FFF5F5" }}
                    aria-label="Supprimer la pièce"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Bouton ajouter pièce ─────────────────────────────────────────── */}
          <button
            type="button"
            onClick={() => ajouterPiece(iNiveau)}
            className="text-xs px-3 py-1.5 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
            style={{ borderColor: "#0F4C3A", color: "#0F4C3A", background: "#fff" }}
          >
            + Ajouter une pièce
          </button>
        </div>
      ))}

      {/* ── Bouton ajouter niveau ─────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={ajouterNiveau}
        disabled={valeur.length >= NIVEAUX_DISPONIBLES.length}
        className="self-start text-sm px-4 py-2.5 rounded-xl border cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-default"
        style={{ borderColor: "#D4AF37", color: "#92400E", background: "#FEF9C3" }}
      >
        + Ajouter un niveau
      </button>
    </div>
  );
}
