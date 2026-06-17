"use client";

import { useState, useRef, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import {
  mettreDansFile,
  retirerBienAgent,
  retirerDeFile,
  affecterAManuel,
} from "@/app/admin/actions";

// ── Types ─────────────────────────────────────────────────────────────────────

type ColonneId = "attente" | "file" | "affecte";

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
  date_soumission: string | null;
  date_affectation: string | null;
};

export type Agent = {
  id: string;
  nom_complet: string | null;
  zones: string[] | null;
};

type Etat = { attente: BienFile[]; file: BienFile[]; affecte: BienFile[] };

// ── Utilitaires ───────────────────────────────────────────────────────────────

function formaterPrix(prix: number, transaction: string) {
  const m = prix.toLocaleString("fr-MA");
  return transaction === "location" ? `${m} DH/mois` : `${m} DH`;
}

function formaterDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("fr-MA", { day: "2-digit", month: "short" });
}

function copierEtat(e: Etat): Etat {
  return { attente: [...e.attente], file: [...e.file], affecte: [...e.affecte] };
}

// ── CarteBienContenu — visuel pur, utilisé dans DragOverlay aussi ─────────────

function CarteBienContenu({
  bien,
  agentNom,
  erreur,
  dragHandleProps,
}: {
  bien: BienFile;
  agentNom?: string | null;
  erreur?: string | null;
  dragHandleProps?: {
    listeners: ReturnType<typeof useDraggable>["listeners"];
    attributes: ReturnType<typeof useDraggable>["attributes"];
  };
}) {
  const photo = bien.photos?.[0] ?? null;
  return (
    <div className="rounded-xl border overflow-hidden"
      style={{ background: "#fff", borderColor: "#F0EDE5", boxShadow: "0 1px 8px rgba(15,76,58,0.05)" }}>

      {/* Ligne du haut : poignée + référence + type */}
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5"
        style={{ borderBottom: "1px solid #F8F5EE" }}>
        <div
          {...(dragHandleProps?.listeners ?? {})}
          {...(dragHandleProps?.attributes ?? {})}
          className="flex items-center gap-1 select-none"
          style={{ color: "#C4D8CE", cursor: "grab", touchAction: "none" }}
          title="Glisser pour déplacer"
        >
          {/* Grille 2×3 drag handle */}
          <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
            <circle cx="3" cy="2" r="1.4"/><circle cx="7" cy="2" r="1.4"/>
            <circle cx="3" cy="7" r="1.4"/><circle cx="7" cy="7" r="1.4"/>
            <circle cx="3" cy="12" r="1.4"/><circle cx="7" cy="12" r="1.4"/>
          </svg>
        </div>
        <span className="text-xs font-mono flex-1" style={{ color: "#9DB8AD" }}>
          {bien.reference ?? "—"}
        </span>
        <span className="text-xs" style={{ color: "#9DB8AD" }}>{bien.type}</span>
      </div>

      {/* Corps : photo + infos */}
      <div className="flex gap-3 p-3">
        <div className="flex-shrink-0 rounded-lg overflow-hidden"
          style={{ width: 54, height: 54, background: "#F4F6F5" }}>
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
          <p className="text-sm font-medium truncate mb-0.5" style={{ color: "#1f2a24" }}>
            {bien.titre}
          </p>
          <p className="text-xs mb-1" style={{ color: "#9DB8AD" }}>
            {bien.quartier ? `${bien.quartier}, ` : ""}{bien.ville}
          </p>
          <p className="text-sm font-semibold" style={{ color: "#0F4C3A" }}>
            {formaterPrix(bien.prix, bien.transaction)}
          </p>
          {agentNom && (
            <p className="text-xs mt-1 font-medium" style={{ color: "#146C43" }}>
              🧑‍💼 {agentNom}
            </p>
          )}
          {bien.date_soumission && (
            <p className="text-xs mt-0.5" style={{ color: "#C4D8CE" }}>
              Soumis le {formaterDate(bien.date_soumission)}
            </p>
          )}
          {bien.date_affectation && agentNom && (
            <p className="text-xs" style={{ color: "#C4D8CE" }}>
              Affecté le {formaterDate(bien.date_affectation)}
            </p>
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

// ── CarteDraggable — ajoute les hooks DND + boutons d'action ─────────────────

function CarteDraggable({
  bien,
  colonne,
  agentNom,
  erreur,
  onAffecter,
  onMettreEnFile,
  onRetirerDeFile,
  onRetirerAgent,
}: {
  bien: BienFile;
  colonne: ColonneId;
  agentNom?: string | null;
  erreur?: string | null;
  onAffecter: () => void;
  onMettreEnFile?: () => void;
  onRetirerDeFile?: () => void;
  onRetirerAgent?: (enFile: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: bien.id,
    data: { colonne },
  });

  const style: React.CSSProperties = {
    opacity: isDragging ? 0.35 : 1,
    transform: transform
      ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
      : undefined,
    transition: isDragging ? undefined : "opacity 0.15s",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <CarteBienContenu
        bien={bien}
        agentNom={agentNom}
        erreur={erreur}
        dragHandleProps={{ listeners, attributes }}
      />

      {/* Boutons d'action — fallback mobile et raccourcis */}
      <div className="px-3 pb-3 flex flex-wrap gap-1.5">
        <button type="button" onClick={onAffecter}
          className="text-xs px-2.5 py-1 rounded-lg font-medium cursor-pointer hover:opacity-90 transition-opacity"
          style={{ background: "#D4AF37", color: "#0F4C3A" }}>
          {colonne === "affecte" ? "Changer d'agent" : "Affecter à un agent"}
        </button>

        {colonne === "attente" && onMettreEnFile && (
          <button type="button" onClick={onMettreEnFile}
            className="text-xs px-2.5 py-1 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
            style={{ borderColor: "#BFDBFE", color: "#1E40AF" }}>
            Mettre en file →
          </button>
        )}

        {colonne === "file" && onRetirerDeFile && (
          <button type="button" onClick={onRetirerDeFile}
            className="text-xs px-2.5 py-1 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
            style={{ borderColor: "#FDE68A", color: "#92400E" }}>
            ← Retirer de la file
          </button>
        )}

        {colonne === "affecte" && onRetirerAgent && (
          <>
            <button type="button" onClick={() => onRetirerAgent(true)}
              className="text-xs px-2.5 py-1 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
              style={{ borderColor: "#BFDBFE", color: "#1E40AF" }}>
              → Remettre en file
            </button>
            <button type="button" onClick={() => onRetirerAgent(false)}
              className="text-xs px-2.5 py-1 rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
              style={{ borderColor: "#FECACA", color: "#991B1B" }}>
              Retirer
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── ColonneDroppable — zone de dépôt ─────────────────────────────────────────

type CouleurColonne = { border: string; header: string; badge: string; textBadge: string; survolee: string };

function ColonneDroppable({
  id,
  titre,
  couleur,
  count,
  children,
}: {
  id: "attente" | "file";
  titre: string;
  couleur: CouleurColonne;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className="flex flex-col rounded-2xl border overflow-hidden"
      style={{
        borderColor: isOver ? couleur.badge : couleur.border,
        flex: "1 1 0",
        minWidth: 280,
        minHeight: 300,
        transition: "border-color 0.15s, background 0.15s",
        background: isOver ? couleur.survolee : undefined,
      }}>
      <EnteteColonne titre={titre} couleur={couleur} count={count} />
      <div className="flex flex-col gap-3 p-3 flex-1" style={{ background: "#FAFAF8" }}>
        {count === 0 ? (
          <div className="flex items-center justify-center flex-1 py-10 rounded-xl text-sm"
            style={{ color: "#C4D8CE", border: "2px dashed #E8E2D2" }}>
            Aucun bien
          </div>
        ) : children}
      </div>
    </div>
  );
}

function ColonneStatique({
  titre, couleur, count, children,
}: {
  titre: string;
  couleur: CouleurColonne;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border overflow-hidden"
      style={{ borderColor: couleur.border, flex: "1 1 0", minWidth: 280, minHeight: 300 }}>
      <EnteteColonne titre={titre} couleur={couleur} count={count} />
      <div className="flex flex-col gap-3 p-3 flex-1" style={{ background: "#FAFAF8" }}>
        {count === 0 ? (
          <div className="flex items-center justify-center flex-1 py-10 rounded-xl text-sm"
            style={{ color: "#C4D8CE", border: "2px dashed #E8E2D2" }}>
            Aucun bien
          </div>
        ) : children}
      </div>
    </div>
  );
}

function EnteteColonne({ titre, couleur, count }: { titre: string; couleur: CouleurColonne; count: number }) {
  return (
    <div className="px-4 py-3 flex items-center justify-between border-b"
      style={{ background: couleur.header, borderColor: couleur.border }}>
      <h2 className="text-sm font-semibold" style={{ color: "#1f2a24" }}>{titre}</h2>
      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
        style={{ background: couleur.badge, color: couleur.textBadge }}>
        {count}
      </span>
    </div>
  );
}

// ── Modal sélection d'agent ───────────────────────────────────────────────────

function ModalAffectation({
  agents,
  onChoisir,
  onFermer,
}: {
  agents: Agent[];
  onChoisir: (agentId: string) => void;
  onFermer: () => void;
}) {
  const [recherche, setRecherche] = useState("");
  const filtres = agents.filter(
    a => a.nom_complet?.toLowerCase().includes(recherche.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(15,76,58,0.35)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onFermer(); }}>
      <div className="rounded-2xl w-full max-w-md overflow-hidden"
        style={{ background: "#fff", boxShadow: "0 16px 64px rgba(15,76,58,0.18)" }}>

        {/* En-tête */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid #F0EDE5" }}>
          <h3 className="font-semibold text-base" style={{ color: "#0F4C3A" }}>
            Choisir un agent
          </h3>
          <button type="button" onClick={onFermer}
            className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer hover:opacity-70"
            style={{ background: "#F4F6F5", color: "#6B7A71" }}>
            ✕
          </button>
        </div>

        {/* Recherche */}
        <div className="px-4 py-3" style={{ borderBottom: "1px solid #F0EDE5" }}>
          <input
            type="text"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher un agent…"
            autoFocus
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none"
            style={{ borderColor: "#E0DAC8", color: "#0F4C3A" }}
          />
        </div>

        {/* Liste des agents */}
        <div className="overflow-y-auto" style={{ maxHeight: 380 }}>
          {filtres.length === 0 ? (
            <p className="text-center py-8 text-sm" style={{ color: "#9DB8AD" }}>
              Aucun agent trouvé
            </p>
          ) : (
            filtres.map((a) => {
              const zones = Array.isArray(a.zones) ? (a.zones as string[]) : [];
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => onChoisir(a.id)}
                  className="w-full text-left px-5 py-3 flex items-center gap-3 cursor-pointer hover:opacity-90 transition-opacity"
                  style={{ borderBottom: "1px solid #F8F5EE" }}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: "#E8F5ED", color: "#0F4C3A" }}>
                    {(a.nom_complet ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: "#1f2a24" }}>
                      {a.nom_complet ?? "—"}
                    </p>
                    {zones.length > 0 && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: "#9DB8AD" }}>
                        {zones.join(", ")}
                      </p>
                    )}
                  </div>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24"
                    stroke="#0F4C3A" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ── Couleurs des colonnes ─────────────────────────────────────────────────────

const COULEURS: Record<ColonneId, CouleurColonne> = {
  attente: { border: "#FDE68A", header: "#FFFBEB", badge: "#FCD34D", textBadge: "#78350F", survolee: "#FFFDE7" },
  file:    { border: "#BFDBFE", header: "#EFF6FF", badge: "#93C5FD", textBadge: "#1E40AF", survolee: "#EFF6FF" },
  affecte: { border: "#6EE7B7", header: "#ECFDF5", badge: "#34D399", textBadge: "#064E3B", survolee: "#F0FDF4" },
};

// ── Composant principal ───────────────────────────────────────────────────────

export default function TableauAffectation({
  biensInitiaux,
  agents,
}: {
  biensInitiaux: { attente: BienFile[]; file: BienFile[]; affecte: BienFile[] };
  agents: Agent[];
}) {
  const [etat, setEtat] = useState<Etat>(biensInitiaux);
  const [erreurs, setErreurs] = useState<Record<string, string>>({});
  const [carteActiveDrag, setCarteActiveDrag] = useState<{ bien: BienFile; colonne: ColonneId } | null>(null);
  const [modal, setModal] = useState<{ bienId: string; colonne: ColonneId } | null>(null);

  // Ref pour snapshot avant mutation optimiste
  const etatRef = useRef(etat);
  etatRef.current = etat;

  // Résolution du nom d'agent
  const nomAgent = useCallback((agentId: string | null) => {
    if (!agentId) return null;
    return agents.find(a => a.id === agentId)?.nom_complet ?? null;
  }, [agents]);

  // ── Senseurs DND (souris + tactile) ────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  );

  // ── Mutation optimiste avec rollback ────────────────────────────────────────

  const executerMouvement = useCallback(async (
    bienId: string,
    de: ColonneId,
    vers: ColonneId,
    agentId: string | null,
    action: () => Promise<void>
  ) => {
    const avant = copierEtat(etatRef.current);

    setErreurs(prev => { const e = { ...prev }; delete e[bienId]; return e; });
    setEtat(prev => {
      const bien = prev[de].find(b => b.id === bienId);
      if (!bien) return prev;
      const nouvBien: BienFile = {
        ...bien,
        statut: vers === "attente" ? "en_attente_affectation" : vers === "file" ? "dans_la_file" : "affecte",
        agent_id: vers === "affecte" ? agentId : null,
        date_affectation: vers === "affecte" ? new Date().toISOString() : null,
      };
      return {
        ...prev,
        [de]: prev[de].filter(b => b.id !== bienId),
        [vers]: vers === "affecte" ? [nouvBien, ...prev[vers]] : [...prev[vers], nouvBien],
      };
    });

    try {
      await action();
    } catch (err) {
      setEtat(avant);
      setErreurs(prev => ({
        ...prev,
        [bienId]: err instanceof Error ? err.message : "Erreur — réessayez.",
      }));
    }
  }, []);

  // ── Drag handlers ────────────────────────────────────────────────────────────

  function handleDragStart({ active }: DragStartEvent) {
    const colonne = active.data.current?.colonne as ColonneId;
    const bien = etatRef.current[colonne].find(b => b.id === active.id);
    if (bien) setCarteActiveDrag({ bien, colonne });
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setCarteActiveDrag(null);
    if (!over) return;

    const bienId = active.id as string;
    const de = active.data.current?.colonne as ColonneId;
    const vers = over.id as ColonneId;

    if (de === vers) return;

    // Règles de déplacement autorisées par drag
    if (de === "attente" && vers === "file") {
      executerMouvement(bienId, de, vers, null, () => mettreDansFile(bienId));
    } else if (de === "file" && vers === "attente") {
      executerMouvement(bienId, de, vers, null, () => retirerDeFile(bienId));
    } else if (de === "affecte" && vers === "file") {
      executerMouvement(bienId, de, vers, null, () => retirerBienAgent(bienId, true));
    } else if (de === "affecte" && vers === "attente") {
      executerMouvement(bienId, de, vers, null, () => retirerBienAgent(bienId, false));
    }
    // drag vers "affecte" → pas de dépôt direct, ouvrir le modal
    else if (vers === "affecte") {
      setModal({ bienId, colonne: de });
    }
  }

  // ── Affectation via modal ────────────────────────────────────────────────────

  function handleChoisirAgent(agentId: string) {
    if (!modal) return;
    const { bienId, colonne: de } = modal;
    setModal(null);
    executerMouvement(bienId, de, "affecte", agentId, () => affecterAManuel(bienId, agentId));
  }

  // ── Helpers pour les boutons de chaque carte ─────────────────────────────────

  function carteProps(bien: BienFile, colonne: ColonneId) {
    return {
      onAffecter: () => setModal({ bienId: bien.id, colonne }),
      onMettreEnFile: colonne === "attente"
        ? () => executerMouvement(bien.id, "attente", "file", null, () => mettreDansFile(bien.id))
        : undefined,
      onRetirerDeFile: colonne === "file"
        ? () => executerMouvement(bien.id, "file", "attente", null, () => retirerDeFile(bien.id))
        : undefined,
      onRetirerAgent: colonne === "affecte"
        ? (enFile: boolean) => executerMouvement(
            bien.id, "affecte",
            enFile ? "file" : "attente",
            null,
            () => retirerBienAgent(bien.id, enFile)
          )
        : undefined,
    };
  }

  // ── Rendu ────────────────────────────────────────────────────────────────────

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ alignItems: "flex-start" }}>

          {/* Colonne 1 — En attente */}
          <ColonneDroppable id="attente" titre="En attente"
            couleur={COULEURS.attente} count={etat.attente.length}>
            {etat.attente.map(b => (
              <CarteDraggable key={b.id} bien={b} colonne="attente"
                erreur={erreurs[b.id]} {...carteProps(b, "attente")} />
            ))}
          </ColonneDroppable>

          {/* Colonne 2 — Dans la file */}
          <ColonneDroppable id="file" titre="Dans la file"
            couleur={COULEURS.file} count={etat.file.length}>
            {etat.file.map(b => (
              <CarteDraggable key={b.id} bien={b} colonne="file"
                erreur={erreurs[b.id]} {...carteProps(b, "file")} />
            ))}
          </ColonneDroppable>

          {/* Colonne 3 — Affectés (statique — pas de dépôt DND direct) */}
          <ColonneStatique titre="Affectés" couleur={COULEURS.affecte} count={etat.affecte.length}>
            {etat.affecte.map(b => (
              <CarteDraggable key={b.id} bien={b} colonne="affecte"
                agentNom={nomAgent(b.agent_id)}
                erreur={erreurs[b.id]}
                {...carteProps(b, "affecte")} />
            ))}
          </ColonneStatique>
        </div>

        {/* Overlay drag — carte fantôme pendant le glissement */}
        <DragOverlay dropAnimation={null}>
          {carteActiveDrag ? (
            <div style={{ transform: "rotate(2deg)", opacity: 0.95, pointerEvents: "none" }}>
              <CarteBienContenu
                bien={carteActiveDrag.bien}
                agentNom={nomAgent(carteActiveDrag.bien.agent_id)}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modal affectation agent */}
      {modal && (
        <ModalAffectation
          agents={agents}
          onChoisir={handleChoisirAgent}
          onFermer={() => setModal(null)}
        />
      )}
    </>
  );
}
