"use client";

import { useState } from "react";
import { supprimerBien } from "@/app/admin/actions";

type Props = {
  id: string;
  titre: string;
};

export default function BoutonSupprimer({ id, titre }: Props) {
  const [chargement, setChargement] = useState(false);

  async function handleSupprimer() {
    const confirme = confirm(`Supprimer définitivement "${titre}" ? Cette action est irréversible.`);
    if (!confirme) return;

    setChargement(true);
    await supprimerBien(id);
    // La revalidation dans l'action rafraîchit la page automatiquement
  }

  return (
    <button
      type="button"
      onClick={handleSupprimer}
      disabled={chargement}
      className="text-xs px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50"
      style={{ background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA" }}
    >
      {chargement ? "…" : "Supprimer"}
    </button>
  );
}
