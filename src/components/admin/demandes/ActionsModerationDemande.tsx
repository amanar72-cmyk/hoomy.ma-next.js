"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { publierDemandeRecherche, refuserDemandeRecherche } from "@/app/admin/demandes-recherche/actions";
import { afficherToast } from "@/components/ui/Toaster";

export default function ActionsModerationDemande({ id, statut }: { id: string; statut: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [motifOuvert, setMotifOuvert] = useState(false);
  const [motif, setMotif] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  if (statut !== "en_validation" && statut !== "brouillon") return null;

  function publier() {
    setErreur(null);
    startTransition(async () => {
      try {
        await publierDemandeRecherche(id);
        afficherToast("Demande publiée sur hoomy.ma/demandes");
        router.refresh();
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  function refuser() {
    if (!motif.trim()) { setErreur("Motif requis."); return; }
    setErreur(null);
    startTransition(async () => {
      try {
        await refuserDemandeRecherche(id, motif);
        afficherToast("Demande refusée");
        setMotifOuvert(false);
        router.refresh();
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  return (
    <div className="rounded-2xl p-5 mb-6" style={{ background: "#FEF9EC", border: "1px solid #F3E0A8" }}>
      <p className="text-sm font-semibold mb-3" style={{ color: "#92400E" }}>
        Vérifiez qu&apos;aucune donnée identifiante ne traîne dans le texte libre avant de publier.
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={publier}
          disabled={pending}
          className="text-sm font-semibold px-4 py-2 rounded-xl cursor-pointer disabled:opacity-60"
          style={{ background: "#0F4C3A", color: "#fff" }}
        >
          {pending ? "…" : "Publier"}
        </button>
        <button
          type="button"
          onClick={() => setMotifOuvert((v) => !v)}
          className="text-sm px-4 py-2 rounded-xl cursor-pointer"
          style={{ background: "#fff", color: "#991B1B", border: "1px solid #FECACA" }}
        >
          Refuser
        </button>
      </div>

      {motifOuvert && (
        <div className="mt-3 flex flex-col gap-2">
          <textarea
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
            rows={2}
            placeholder="Motif du refus (visible en interne uniquement)"
            className="w-full border rounded-xl px-3 py-2 text-sm"
            style={{ borderColor: "#E0DAC8" }}
          />
          <button
            type="button"
            onClick={refuser}
            disabled={pending}
            className="self-start text-sm font-semibold px-4 py-2 rounded-xl cursor-pointer disabled:opacity-60"
            style={{ background: "#991B1B", color: "#fff" }}
          >
            Confirmer le refus
          </button>
        </div>
      )}

      {erreur && <p className="text-xs mt-2" style={{ color: "#991B1B" }}>{erreur}</p>}
    </div>
  );
}
