"use client";

import { useState } from "react";
import { changerRole } from "@/app/admin/actions";

// Rôles assignables via l'interface — 'admin' intentionnellement absent
const ROLES_ASSIGNABLES = [
  { valeur: "acheteur", label: "Acheteur" },
  { valeur: "vendeur",  label: "Vendeur"  },
  { valeur: "agent",    label: "Agent"    },
  { valeur: "agence",   label: "Agence"   },
];

type Props = {
  id: string;
  roleActuel: string;
};

export default function SelectRole({ id, roleActuel }: Props) {
  const [role, setRole] = useState(roleActuel);
  const [chargement, setChargement] = useState(false);
  const [succes, setSucces] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Compte admin → badge verrouillé, aucune interaction
  if (roleActuel === "admin") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-semibold select-none"
        style={{ background: "#D4AF37", color: "#0F4C3A", border: "1px solid #B8951F" }}
        title="Le rôle administrateur ne peut être modifié que via SQL">
        🔒 Administrateur
      </span>
    );
  }

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nouveau = e.target.value;
    const precedent = role;
    setRole(nouveau);
    setChargement(true);
    setSucces(false);
    setErreur(null);

    try {
      await changerRole(id, nouveau);
      setSucces(true);
      // Efface le message de succès après 3 secondes
      setTimeout(() => setSucces(false), 3000);
    } catch (err) {
      // Revert optimiste en cas d'erreur
      setRole(precedent);
      setErreur(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <select
        value={role}
        onChange={handleChange}
        disabled={chargement}
        className="text-xs border rounded-lg px-2.5 py-1 cursor-pointer disabled:opacity-50 transition-colors"
        style={{ borderColor: "#E0DAC8", color: "#0F4C3A", background: "#fff" }}
      >
        {ROLES_ASSIGNABLES.map((r) => (
          <option key={r.valeur} value={r.valeur}>{r.label}</option>
        ))}
      </select>

      {succes && (
        <span className="text-xs font-medium" style={{ color: "#146C43" }}>
          ✓ Rôle mis à jour
        </span>
      )}
      {erreur && (
        <span className="text-xs" style={{ color: "#DC2626" }} title={erreur}>
          ✗ {erreur.length > 60 ? erreur.slice(0, 57) + "…" : erreur}
        </span>
      )}
    </span>
  );
}
