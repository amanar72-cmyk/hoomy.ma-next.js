"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, TouchSensor, useSensor, useSensors,
  useDroppable, useDraggable,
} from "@dnd-kit/core";
import {
  mettreDansFile, retirerBienAgent, retirerDeFile, affecterAManuel,
} from "@/app/admin/actions";
import { formaterPrix } from "@/lib/format";

// ── Types ─────────────────────────────────────────────────────────────────────

type ColonneId = "attente" | "file" | "affecte";
type OngletId  = "a_affecter" | "affectes" | "tous";

export type BienFile = {
  id: string;
  reference: string | null;
  titre: string;
  type: string;
  transaction: string;
  prix: number;
  ville: string;
  quartier: string | null;
  photos: string[] | null;
  statut: string | null;
  agent_id: string | null;
  proprietaire_id: string | null;
  date_soumission: string | null;
  date_affectation: string | null;
};

export type Agent = {
  id: string;
  nom_complet: string | null;
  zones: string[] | null;
  avatar_url: string | null;
  nbBiensActifs: number;
};

export type ProprietaireInfo = {
  nom: string | null;
  telephone: string | null;
};

type Etat = { attente: BienFile[]; file: BienFile[]; affecte: BienFile[] };

type ModalState =
  | null
  | { step: "selection"; bienId: string; colonne: ColonneId; ville: string }
  | { step: "confirmation"; bienId: string; colonne: ColonneId; agentId: string };

// ── Utilitaires ───────────────────────────────────────────────────────────────


function formaterDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("fr-MA", { day: "2-digit", month: "short" });
}

function joursDepuis(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function copierEtat(e: Etat): Etat {
  return { attente: [...e.attente], file: [...e.file], affecte: [...e.affecte] };
}

function initialesNom(nom: string | null) {
  if (!nom) return "?";
  const mots = nom.trim().split(/\s+/);
  return mots.length >= 2
    ? (mots[0][0] + mots[mots.length - 1][0]).toUpperCase()
    : nom.slice(0, 2).toUpperCase();
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl pointer-events-none"
      style={{ background: "#0F4C3A", color: "#fff", whiteSpace: "nowrap" }}
    >
      ✓ {message}
    </div>
  );
}

// ── Avatar agent ──────────────────────────────────────────────────────────────

function AvatarAgent({ agent, taille = 36 }: { agent: Agent; taille?: number }) {
  if (agent.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={agent.avatar_url}
        alt={agent.nom_complet ?? ""}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: taille, height: taille }}
      />
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
      style={{ width: taille, height: taille, background: "#0F4C3A", color: "#D4AF37" }}
    >
      {initialesNom(agent.nom_complet)}
    </div>
  );
}

// ── Badge ancienneté ──────────────────────────────────────────────────────────

function BadgeAnciennete({ dateStr }: { dateStr: string | null }) {
  const j = joursDepuis(dateStr);
  if (j === null || j < 1) return null;
  const bg  = j > 5 ? "#FEE2E2" : j > 2 ? "#FEF3C7" : "#F3F4F6";
  const col = j > 5 ? "#991B1B" : j > 2 ? "#92400E" : "#6B7280";
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: bg, color: col }}>
      {j}j
    </span>
  );
}

// ── CarteBienContenu ──────────────────────────────────────────────────────────

function CarteBienContenu({
  bien, agentNom, proprietaireInfo, erreur,
}: {
  bien: BienFile;
  agentNom?: string | null;
  proprietaireInfo?: ProprietaireInfo | null;
  erreur?: string | null;
}) {
  const photo = bien.photos?.[0] ?? null;
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: "#fff", borderColor: "#F0EDE5", boxShadow: "0 1px 8px rgba(15,76,58,0.05)" }}
    >
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5" style={{ borderBottom: "1px solid #F8F5EE" }}>
        <div className="flex items-center gap-1 select-none" style={{ color: "#C4D8CE" }}>
          <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
            <circle cx="3" cy="2" r="1.4"/><circle cx="7" cy="2" r="1.4"/>
            <circle cx="3" cy="7" r="1.4"/><circle cx="7" cy="7" r="1.4"/>
            <circle cx="3" cy="12" r="1.4"/><circle cx="7" cy="12" r="1.4"/>
          </svg>
        </div>
        <span className="text-xs font-mono flex-1" style={{ color: "#9DB8AD" }}>{bien.reference ?? "—"}</span>
        <span className="text-xs mr-1" style={{ color: "#9DB8AD" }}>{bien.type}</span>
        <BadgeAnciennete dateStr={bien.date_soumission} />
      </div>

      <div className="flex gap-3 p-3">
        <div className="flex-shrink-0 rounded-lg overflow-hidden" style={{ width: 54, height: 54, background: "#F4F6F5" }}>
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#C4D8CE" strokeWidth="1.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate mb-0.5" style={{ color: "#1f2a24" }}>{bien.titre}</p>
          <p className="text-xs mb-1" style={{ color: "#9DB8AD" }}>
            {bien.quartier ? `${bien.quartier}, ` : ""}{bien.ville}
          </p>
          <p className="text-sm font-semibold" style={{ color: "#0F4C3A" }}>
            {formaterPrix(bien.prix, bien.transaction)}
          </p>
          {agentNom && (
            <p className="text-xs mt-1 font-medium" style={{ color: "#146C43" }}>🧑‍💼 {agentNom}</p>
          )}
          {bien.date_soumission && (
            <p className="text-xs mt-0.5" style={{ color: "#C4D8CE" }}>Soumis le {formaterDate(bien.date_soumission)}</p>
          )}
          {bien.date_affectation && agentNom && (
            <p className="text-xs" style={{ color: "#C4D8CE" }}>Affecté le {formaterDate(bien.date_affectation)}</p>
          )}
          {proprietaireInfo?.nom && (
            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#F0EDE5", color: "#6B7A71" }}>
                {proprietaireInfo.nom}
              </span>
              {proprietaireInfo.telephone && (
                <a
                  href={`tel:${proprietaireInfo.telephone}`}
                  className="text-xs px-2 py-0.5 rounded-full hover:opacity-70 transition-opacity"
                  style={{ background: "#E8F5ED", color: "#0F4C3A" }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  {proprietaireInfo.telephone}
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {erreur && (
        <div className="px-3 pb-2">
          <p className="text-xs px-2 py-1 rounded-lg truncate"
            style={{ background: "#FEF2F2", color: "#991B1B" }} title={erreur}>
            ✗ {erreur.length > 55 ? erreur.slice(0, 52) + "…" : erreur}
          </p>
        </div>
      )}
    </div>
  );
}

// ── CarteDraggable ─────────────────────────────────────────────────────────────

function CarteDraggable({
  bien, colonne, agentNom, proprietaireInfo, erreur,
  onAffecter, onMettreEnFile, onRetirerDeFile, onRetirerAgent,
}: {
  bien: BienFile; colonne: ColonneId; agentNom?: string | null;
  proprietaireInfo?: ProprietaireInfo | null; erreur?: string | null;
  onAffecter: () => void; onMettreEnFile?: () => void;
  onRetirerDeFile?: () => void; onRetirerAgent?: (enFile: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: bien.id, data: { colonne },
  });

  return (
    <div ref={setNodeRef}
      style={{ opacity: isDragging ? 0.35 : 1, cursor: isDragging ? "grabbing" : "grab", touchAction: "none" }}
      {...listeners} {...attributes}
    >
      <CarteBienContenu bien={bien} agentNom={agentNom} proprietaireInfo={proprietaireInfo} erreur={erreur} />
      <div className="px-3 pb-3 flex flex-wrap gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
        <button type="button" onClick={onAffecter}
          className="text-xs px-2.5 py-1 rounded-lg font-medium cursor-pointer hover:opacity-90 transition-opacity"
          style={{ background: "#D4AF37", color: "#0F4C3A" }}>
          {colonne === "affecte" ? "Changer d'agent" : "Affecter à un agent"}
        </button>
        {colonne === "attente" && onMettreEnFile && (
          <button type="button" onClick={onMettreEnFile}
            className="text-xs px-2.5 py-1 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
            style={{ borderColor: "#BFDBFE", color: "#1E40AF" }}>Mettre en file →</button>
        )}
        {colonne === "file" && onRetirerDeFile && (
          <button type="button" onClick={onRetirerDeFile}
            className="text-xs px-2.5 py-1 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
            style={{ borderColor: "#FDE68A", color: "#92400E" }}>← Retirer de la file</button>
        )}
        {colonne === "affecte" && onRetirerAgent && (
          <>
            <button type="button" onClick={() => onRetirerAgent(true)}
              className="text-xs px-2.5 py-1 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
              style={{ borderColor: "#BFDBFE", color: "#1E40AF" }}>→ Remettre en file</button>
            <button type="button" onClick={() => onRetirerAgent(false)}
              className="text-xs px-2.5 py-1 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
              style={{ borderColor: "#FECACA", color: "#991B1B" }}>Retirer</button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Colonnes Kanban ────────────────────────────────────────────────────────────

type CouleurColonne = { border: string; header: string; badge: string; textBadge: string; survolee: string };

const COULEURS: Record<ColonneId, CouleurColonne> = {
  attente: { border: "#FDE68A", header: "#FFFBEB", badge: "#FCD34D", textBadge: "#78350F", survolee: "#FFFDE7" },
  file:    { border: "#BFDBFE", header: "#EFF6FF", badge: "#93C5FD", textBadge: "#1E40AF", survolee: "#EFF6FF" },
  affecte: { border: "#6EE7B7", header: "#ECFDF5", badge: "#34D399", textBadge: "#064E3B", survolee: "#F0FDF4" },
};

function EnteteColonne({ titre, couleur, count }: { titre: string; couleur: CouleurColonne; count: number }) {
  return (
    <div className="px-4 py-3 flex items-center justify-between border-b"
      style={{ background: couleur.header, borderColor: couleur.border }}>
      <h2 className="text-sm font-semibold" style={{ color: "#1f2a24" }}>{titre}</h2>
      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
        style={{ background: couleur.badge, color: couleur.textBadge }}>{count}</span>
    </div>
  );
}

function ColonneDroppable({ id, titre, couleur, count, children }: {
  id: "attente" | "file"; titre: string; couleur: CouleurColonne; count: number; children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className="flex flex-col rounded-2xl border overflow-hidden"
      style={{ borderColor: isOver ? couleur.badge : couleur.border, flex: "1 1 0", minWidth: 280, minHeight: 300,
        transition: "border-color 0.15s, background 0.15s", background: isOver ? couleur.survolee : undefined }}>
      <EnteteColonne titre={titre} couleur={couleur} count={count} />
      <div className="flex flex-col gap-3 p-3 flex-1" style={{ background: "#FAFAF8" }}>
        {count === 0 ? (
          <div className="flex items-center justify-center flex-1 py-10 rounded-xl text-sm"
            style={{ color: "#C4D8CE", border: "2px dashed #E8E2D2" }}>Aucun bien</div>
        ) : children}
      </div>
    </div>
  );
}

function ColonneStatique({ titre, couleur, count, children }: {
  titre: string; couleur: CouleurColonne; count: number; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border overflow-hidden"
      style={{ borderColor: couleur.border, flex: "1 1 0", minWidth: 280, minHeight: 300 }}>
      <EnteteColonne titre={titre} couleur={couleur} count={count} />
      <div className="flex flex-col gap-3 p-3 flex-1" style={{ background: "#FAFAF8" }}>
        {count === 0 ? (
          <div className="flex items-center justify-center flex-1 py-10 rounded-xl text-sm"
            style={{ color: "#C4D8CE", border: "2px dashed #E8E2D2" }}>Aucun bien</div>
        ) : children}
      </div>
    </div>
  );
}

// ── Modal sélection agent ─────────────────────────────────────────────────────

function ModalSelectionAgent({ agents, villesBien, onChoisir, onFermer }: {
  agents: Agent[]; villesBien: string;
  onChoisir: (agentId: string) => void; onFermer: () => void;
}) {
  const [recherche, setRecherche] = useState("");

  const agentsTries = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    const filtres = agents.filter((a) =>
      !q || a.nom_complet?.toLowerCase().includes(q) || (a.zones ?? []).some((z) => z.toLowerCase().includes(q))
    );
    const ville = villesBien.toLowerCase();
    return [...filtres].sort((a, b) => {
      const aZone = (a.zones ?? []).some((z) => z.toLowerCase().includes(ville));
      const bZone = (b.zones ?? []).some((z) => z.toLowerCase().includes(ville));
      if (aZone !== bZone) return aZone ? -1 : 1;
      return a.nbBiensActifs - b.nbBiensActifs;
    });
  }, [agents, recherche, villesBien]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
      style={{ background: "rgba(15,76,58,0.35)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onFermer(); }}>
      <div className="rounded-2xl w-full max-w-md overflow-hidden"
        style={{ background: "#fff", boxShadow: "0 16px 64px rgba(15,76,58,0.18)" }}>

        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #F0EDE5" }}>
          <div>
            <h3 className="font-semibold text-base" style={{ color: "#0F4C3A" }}>Choisir un conseiller</h3>
            <p className="text-xs mt-0.5" style={{ color: "#9DB8AD" }}>Zone {villesBien} en tête · par charge croissante</p>
          </div>
          <button type="button" onClick={onFermer}
            className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer hover:opacity-70"
            style={{ background: "#F4F6F5", color: "#6B7A71" }}>✕</button>
        </div>

        <div className="px-4 py-3" style={{ borderBottom: "1px solid #F0EDE5" }}>
          <input type="text" value={recherche} onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher…" autoFocus
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none"
            style={{ borderColor: "#E0DAC8", color: "#0F4C3A" }} />
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: 380 }}>
          {agentsTries.length === 0 ? (
            <p className="text-center py-8 text-sm" style={{ color: "#9DB8AD" }}>Aucun conseiller trouvé</p>
          ) : agentsTries.map((a) => {
            const zones = (a.zones as string[] | null) ?? [];
            const zoneMatch = zones.some((z) => z.toLowerCase().includes(villesBien.toLowerCase()));
            return (
              <button key={a.id} type="button" onClick={() => onChoisir(a.id)}
                className="w-full text-left px-4 py-3 flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity"
                style={{ borderBottom: "1px solid #F8F5EE" }}>
                <AvatarAgent agent={a} taille={36} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium" style={{ color: "#1f2a24" }}>{a.nom_complet ?? "—"}</p>
                    {zoneMatch && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                        style={{ background: "#D1FAE5", color: "#064E3B" }}>✓ zone</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {zones.length > 0 && (
                      <p className="text-xs truncate" style={{ color: "#9DB8AD", maxWidth: 160 }}>{zones.join(", ")}</p>
                    )}
                    <span className="text-xs px-1.5 py-0.5 rounded-full"
                      style={{ background: a.nbBiensActifs > 5 ? "#FEF3C7" : "#F0EDE5", color: a.nbBiensActifs > 5 ? "#92400E" : "#6B7A71" }}>
                      {a.nbBiensActifs} actif{a.nbBiensActifs !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#0F4C3A" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Modal confirmation affectation ────────────────────────────────────────────

function ModalConfirmation({ bien, agent, onConfirmer, onRetour }: {
  bien: BienFile; agent: Agent; onConfirmer: () => void; onRetour: () => void;
}) {
  const [chargement, setChargement] = useState(false);

  async function handleConfirmer() {
    setChargement(true);
    onConfirmer();
    setChargement(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
      style={{ background: "rgba(15,76,58,0.35)", backdropFilter: "blur(4px)" }}>
      <div className="rounded-2xl w-full max-w-sm overflow-hidden"
        style={{ background: "#fff", boxShadow: "0 16px 64px rgba(15,76,58,0.18)" }}>

        <div className="px-5 py-4" style={{ borderBottom: "1px solid #F0EDE5" }}>
          <h3 className="font-semibold text-base" style={{ color: "#0F4C3A" }}>Confirmer l&apos;affectation</h3>
        </div>

        <div className="px-5 py-4 flex flex-col gap-3">
          <div className="rounded-xl p-3" style={{ background: "#F8F5EE" }}>
            <p className="text-xs font-mono mb-0.5" style={{ color: "#9DB8AD" }}>{bien.reference ?? "—"}</p>
            <p className="text-sm font-semibold" style={{ color: "#1f2a24" }}>{bien.titre}</p>
            <p className="text-xs" style={{ color: "#9DB8AD" }}>{bien.ville}</p>
          </div>
          <div className="text-xs text-center" style={{ color: "#9DB8AD" }}>sera affecté à</div>
          <div className="rounded-xl p-3 flex items-center gap-3"
            style={{ background: "#ECFDF5", border: "1px solid #D1FAE5" }}>
            <AvatarAgent agent={agent} taille={40} />
            <div>
              <p className="text-sm font-semibold" style={{ color: "#0F4C3A" }}>{agent.nom_complet ?? "—"}</p>
              <p className="text-xs" style={{ color: "#6B7A71" }}>
                {agent.nbBiensActifs} actif{agent.nbBiensActifs !== 1 ? "s" : ""}
                {(agent.zones ?? []).length > 0 && ` · ${(agent.zones as string[]).join(", ")}`}
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-3">
          <button type="button" onClick={onRetour}
            className="flex-1 py-2.5 rounded-xl text-sm border font-medium cursor-pointer hover:opacity-80"
            style={{ borderColor: "#E0DAC8", color: "#6B7A71" }}>← Retour</button>
          <button type="button" onClick={handleConfirmer} disabled={chargement}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer hover:opacity-90 disabled:opacity-60"
            style={{ background: "#0F4C3A", color: "#fff" }}>
            {chargement ? "Affectation…" : "Confirmer"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Onglets ───────────────────────────────────────────────────────────────────

function Onglets({ onglet, setOnglet, compteurs }: {
  onglet: OngletId; setOnglet: (o: OngletId) => void;
  compteurs: { a_affecter: number; affectes: number; tous: number };
}) {
  const tabs: { id: OngletId; label: string; count: number }[] = [
    { id: "a_affecter", label: "À affecter", count: compteurs.a_affecter },
    { id: "affectes",   label: "Affectés",   count: compteurs.affectes },
    { id: "tous",       label: "Tous",       count: compteurs.tous },
  ];
  return (
    <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "#F0EDE5" }}>
      {tabs.map(({ id, label, count }) => {
        const actif = onglet === id;
        return (
          <button key={id} type="button" onClick={() => setOnglet(id)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-sm whitespace-nowrap transition-all cursor-pointer"
            style={{ background: actif ? "#fff" : "transparent", color: actif ? "#0F4C3A" : "#9DB8AD",
              boxShadow: actif ? "0 1px 6px rgba(15,76,58,0.10)" : "none", fontWeight: actif ? 600 : 400 }}>
            {label}
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: actif ? "#E8F5ED" : "#E8E2D2", color: actif ? "#0F4C3A" : "#9DB8AD" }}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function TableauAffectation({
  biensInitiaux, agents, proprietaires,
}: {
  biensInitiaux: { attente: BienFile[]; file: BienFile[]; affecte: BienFile[] };
  agents: Agent[];
  proprietaires: Record<string, ProprietaireInfo>;
}) {
  const [etat, setEtat]           = useState<Etat>(biensInitiaux);
  const [erreurs, setErreurs]     = useState<Record<string, string>>({});
  const [onglet, setOnglet]       = useState<OngletId>("a_affecter");
  const [recherche, setRecherche] = useState("");
  const [modal, setModal]         = useState<ModalState>(null);
  const [toast, setToast]         = useState<string | null>(null);
  const [carteActiveDrag, setCarteActiveDrag] = useState<{ bien: BienFile; colonne: ColonneId } | null>(null);

  const etatRef = useRef(etat);
  etatRef.current = etat;

  const etatFiltree = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return etat;
    const f = (biens: BienFile[]) =>
      biens.filter((b) =>
        b.reference?.toLowerCase().includes(q) ||
        b.titre.toLowerCase().includes(q) ||
        b.ville.toLowerCase().includes(q)
      );
    return { attente: f(etat.attente), file: f(etat.file), affecte: f(etat.affecte) };
  }, [etat, recherche]);

  const nomAgent   = useCallback((id: string | null) => !id ? null : agents.find((a) => a.id === id)?.nom_complet ?? null, [agents]);
  const propInfo   = useCallback((id: string | null) => !id ? null : proprietaires[id] ?? null, [proprietaires]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 6 } })
  );

  const executerMouvement = useCallback(async (
    bienId: string, de: ColonneId, vers: ColonneId, agentId: string | null, action: () => Promise<void>
  ) => {
    const avant = copierEtat(etatRef.current);
    setErreurs((prev) => { const e = { ...prev }; delete e[bienId]; return e; });
    setEtat((prev) => {
      const bien = prev[de].find((b) => b.id === bienId);
      if (!bien) return prev;
      const nouvBien: BienFile = {
        ...bien,
        statut: vers === "attente" ? "en_attente_affectation" : vers === "file" ? "dans_la_file" : "affecte",
        agent_id: vers === "affecte" ? agentId : null,
        date_affectation: vers === "affecte" ? new Date().toISOString() : null,
      };
      return {
        ...prev,
        [de]: prev[de].filter((b) => b.id !== bienId),
        [vers]: vers === "affecte" ? [nouvBien, ...prev[vers]] : [...prev[vers], nouvBien],
      };
    });
    try {
      await action();
      setToast(vers === "affecte" ? "Bien affecté avec succès !" : "Bien déplacé.");
    } catch (err) {
      setEtat(avant);
      setErreurs((prev) => ({ ...prev, [bienId]: err instanceof Error ? err.message : "Erreur — réessayez." }));
    }
  }, []);

  function handleDragStart({ active }: DragStartEvent) {
    const colonne = active.data.current?.colonne as ColonneId;
    const bien = etatRef.current[colonne].find((b) => b.id === active.id);
    if (bien) setCarteActiveDrag({ bien, colonne });
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setCarteActiveDrag(null);
    if (!over) return;
    const bienId = active.id as string;
    const de = active.data.current?.colonne as ColonneId;
    const vers = over.id as ColonneId;
    if (de === vers) return;

    if      (de === "attente" && vers === "file")    executerMouvement(bienId, de, vers, null, () => mettreDansFile(bienId));
    else if (de === "file"    && vers === "attente") executerMouvement(bienId, de, vers, null, () => retirerDeFile(bienId));
    else if (de === "affecte" && vers === "file")    executerMouvement(bienId, de, vers, null, () => retirerBienAgent(bienId, true));
    else if (de === "affecte" && vers === "attente") executerMouvement(bienId, de, vers, null, () => retirerBienAgent(bienId, false));
    else if (vers === "affecte") {
      const bien = etatRef.current[de].find((b) => b.id === bienId);
      setModal({ step: "selection", bienId, colonne: de, ville: bien?.ville ?? "" });
    }
  }

  function ouvrirSelection(bienId: string, colonne: ColonneId) {
    const bien = [...etatRef.current.attente, ...etatRef.current.file, ...etatRef.current.affecte].find((b) => b.id === bienId);
    setModal({ step: "selection", bienId, colonne, ville: bien?.ville ?? "" });
  }

  function handleSelectionAgent(agentId: string) {
    if (!modal || modal.step !== "selection") return;
    setModal({ step: "confirmation", bienId: modal.bienId, colonne: modal.colonne, agentId });
  }

  function handleConfirmerAffectation() {
    if (!modal || modal.step !== "confirmation") return;
    const { bienId, colonne, agentId } = modal;
    setModal(null);
    executerMouvement(bienId, colonne, "affecte", agentId, () => affecterAManuel(bienId, agentId));
  }

  function carteProps(bien: BienFile, colonne: ColonneId) {
    return {
      onAffecter: () => ouvrirSelection(bien.id, colonne),
      onMettreEnFile: colonne === "attente"
        ? () => executerMouvement(bien.id, "attente", "file", null, () => mettreDansFile(bien.id))
        : undefined,
      onRetirerDeFile: colonne === "file"
        ? () => executerMouvement(bien.id, "file", "attente", null, () => retirerDeFile(bien.id))
        : undefined,
      onRetirerAgent: colonne === "affecte"
        ? (enFile: boolean) => executerMouvement(bien.id, "affecte", enFile ? "file" : "attente", null, () => retirerBienAgent(bien.id, enFile))
        : undefined,
    };
  }

  const agentConfirmation = modal?.step === "confirmation" ? agents.find((a) => a.id === modal.agentId) ?? null : null;
  const bienConfirmation  = modal?.step === "confirmation"
    ? [...etat.attente, ...etat.file, ...etat.affecte].find((b) => b.id === modal.bienId) ?? null
    : null;

  const compteurs = {
    a_affecter: etat.attente.length + etat.file.length,
    affectes:   etat.affecte.length,
    tous:       etat.attente.length + etat.file.length + etat.affecte.length,
  };

  const montrerAttente = onglet === "a_affecter" || onglet === "tous";
  const montrerAffecte = onglet === "affectes"   || onglet === "tous";

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex-1 min-w-0">
          <Onglets onglet={onglet} setOnglet={setOnglet} compteurs={compteurs} />
        </div>
        <input
          type="text" value={recherche} onChange={(e) => setRecherche(e.target.value)}
          placeholder="Référence, titre, ville…"
          className="border rounded-xl px-4 py-2 text-sm focus:outline-none sm:w-64"
          style={{ borderColor: "#E0DAC8", color: "#0F4C3A", background: "#fff" }}
        />
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ alignItems: "flex-start" }}>

          {montrerAttente && (
            <ColonneDroppable id="attente" titre="En attente" couleur={COULEURS.attente} count={etatFiltree.attente.length}>
              {etatFiltree.attente.map((b) => (
                <CarteDraggable key={b.id} bien={b} colonne="attente" erreur={erreurs[b.id]}
                  proprietaireInfo={propInfo(b.proprietaire_id)} {...carteProps(b, "attente")} />
              ))}
            </ColonneDroppable>
          )}

          {montrerAttente && (
            <ColonneDroppable id="file" titre="Dans la file" couleur={COULEURS.file} count={etatFiltree.file.length}>
              {etatFiltree.file.map((b) => (
                <CarteDraggable key={b.id} bien={b} colonne="file" erreur={erreurs[b.id]}
                  proprietaireInfo={propInfo(b.proprietaire_id)} {...carteProps(b, "file")} />
              ))}
            </ColonneDroppable>
          )}

          {montrerAffecte && (
            <ColonneStatique titre="Affectés" couleur={COULEURS.affecte} count={etatFiltree.affecte.length}>
              {etatFiltree.affecte.map((b) => (
                <CarteDraggable key={b.id} bien={b} colonne="affecte" agentNom={nomAgent(b.agent_id)}
                  erreur={erreurs[b.id]} proprietaireInfo={propInfo(b.proprietaire_id)} {...carteProps(b, "affecte")} />
              ))}
            </ColonneStatique>
          )}
        </div>

        <DragOverlay dropAnimation={null}>
          {carteActiveDrag ? (
            <div style={{ transform: "rotate(2deg)", opacity: 0.95, pointerEvents: "none" }}>
              <CarteBienContenu
                bien={carteActiveDrag.bien}
                agentNom={nomAgent(carteActiveDrag.bien.agent_id)}
                proprietaireInfo={propInfo(carteActiveDrag.bien.proprietaire_id)}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {modal?.step === "selection" && (
        <ModalSelectionAgent
          agents={agents} villesBien={modal.ville}
          onChoisir={handleSelectionAgent} onFermer={() => setModal(null)}
        />
      )}

      {modal?.step === "confirmation" && bienConfirmation && agentConfirmation && (
        <ModalConfirmation
          bien={bienConfirmation} agent={agentConfirmation}
          onConfirmer={handleConfirmerAffectation}
          onRetour={() => setModal({ step: "selection", bienId: modal.bienId, colonne: modal.colonne, ville: bienConfirmation.ville })}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}
