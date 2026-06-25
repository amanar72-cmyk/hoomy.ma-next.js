"use client";

import { useState } from "react";
import { changerRole } from "@/app/admin/actions";

// 'admin' intentionnellement absent — ne peut être assigné via l'interface
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
  const [role, setRole]           = useState(roleActuel);
  const [chargement, setChargement] = useState(false);
  const [succes, setSucces]       = useState(false);
  const [erreur, setErreur]       = useState<string | null>(null);

  if (roleActuel === "admin") {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-semibold select-none"
        style={{ background: "#D4AF37", color: "#111", border: "1px solid #B8951F" }}
        title="Le rôle administrateur ne peut être modifié que via SQL"
      >
        🔒 Admin
      </span>
    );
  }

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nouveau   = e.target.value;
    const precedent = role;
    setRole(nouveau);
    setChargement(true);
    setSucces(false);
    setErreur(null);
    try {
      await changerRole(id, nouveau);
      setSucces(true);
      setTimeout(() => setSucces(false), 3000);
    } catch (err) {
      setRole(precedent);
      setErreur(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <span className="inline-flex flex-col gap-0.5">
      <select
        value={role}
        onChange={handleChange}
        disabled={chargement}
        className="text-xs border rounded-lg px-2.5 py-1.5 cursor-pointer disabled:opacity-50 transition-colors"
        style={{ borderColor: "#EBEBEB", color: "#555", background: "#fff" }}
      >
        {ROLES_ASSIGNABLES.map((r) => (
          <option key={r.valeur} value={r.valeur}>{r.label}</option>
        ))}
      </select>

      {succes && (
        <span className="text-xs font-medium" style={{ color: "#065F46" }}>✓ Rôle mis à jour</span>
      )}
      {erreur && (
        <span className="text-xs" style={{ color: "#DC2626" }} title={erreur}>
          ✗ {erreur.length > 50 ? erreur.slice(0, 47) + "…" : erreur}
        </span>
      )}
    </span>
  );
}
