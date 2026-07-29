"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { annulerPublication, relancerPublication } from "@/app/admin/publications/actions";
import { afficherToast } from "@/components/ui/Toaster";

export default function ActionsPublication({ id, statut }: { id: string; statut: string }) {
  const router = useRouter();
  const [pending, demarrer] = useTransition();

  function agir(fn: () => Promise<void>, message: string) {
    demarrer(async () => {
      try {
        await fn();
        afficherToast(message);
        router.refresh();
      } catch (e) {
        afficherToast(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  if (statut === "en_attente") {
    return (
      <button
        type="button"
        onClick={() => agir(() => annulerPublication(id), "Publication annulée")}
        disabled={pending}
        className="text-xs px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-60 whitespace-nowrap"
        style={{ background: "#fff", color: "#991B1B", border: "1px solid #FECACA" }}
      >
        Annuler
      </button>
    );
  }

  if (statut === "echec" || statut === "annule") {
    return (
      <button
        type="button"
        onClick={() => agir(() => relancerPublication(id), "Publication remise en file")}
        disabled={pending}
        className="text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer disabled:opacity-60 whitespace-nowrap"
        style={{ background: "#0F4C3A", color: "#fff" }}
      >
        Relancer
      </button>
    );
  }

  return null;
}
