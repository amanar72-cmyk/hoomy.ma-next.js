"use client";

import { useState } from "react";
import { changerRoleUtilisateur } from "@/app/admin/actions";

const ROLES = [
  { valeur: "acheteur", label: "Acheteur" },
  { valeur: "vendeur", label: "Vendeur" },
  { valeur: "agent", label: "Agent" },
  { valeur: "admin", label: "Admin" },
];

type Props = {
  id: string;
  roleActuel: string;
};

export default function SelectRole({ id, roleActuel }: Props) {
  const [role, setRole] = useState(roleActuel);
  const [chargement, setChargement] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nouveauRole = e.target.value;
    setRole(nouveauRole);
    setChargement(true);
    await changerRoleUtilisateur(id, nouveauRole);
    setChargement(false);
  }

  return (
    <select
      value={role}
      onChange={handleChange}
      disabled={chargement}
      className="text-xs border rounded-lg px-2 py-1 cursor-pointer disabled:opacity-50"
      style={{ borderColor: "#E0DAC8", color: "#0F4C3A" }}
    >
      {ROLES.map((r) => (
        <option key={r.valeur} value={r.valeur}>
          {r.label}
        </option>
      ))}
    </select>
  );
}
