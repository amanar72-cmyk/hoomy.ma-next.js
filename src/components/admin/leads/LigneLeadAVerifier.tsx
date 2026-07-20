"use client";

// Une ligne de /admin/leads/a-verifier : lead Meta reçu sans téléphone
// exploitable. Deux actions : corriger le numéro (contact créé/dédoublonné,
// lead réintègre le circuit normal) ou ignorer (suppression, spam/irrécupérable).

import { useState, useTransition } from "react";
import { corrigerNumeroLeadAVerifier, ignorerLeadAVerifier } from "@/app/admin/leads/actions";
import { afficherToast } from "@/components/ui/Toaster";
import BoutonAction from "@/components/admin/BoutonAction";

export type LeadAVerifier = {
  id: string;
  cree_le: string;
  nom: string;
  telephone: string;
  message: string | null;
  campagne: string | null;
  bien_ref: string | null;
  biens: { titre: string } | null;
};

export default function LigneLeadAVerifier({ lead }: { lead: LeadAVerifier }) {
  const [correction, setCorrection] = useState(false);
  const [valeur, setValeur] = useState(lead.telephone);
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    startTransition(async () => {
      try {
        await corrigerNumeroLeadAVerifier(lead.id, valeur);
        afficherToast("Numéro corrigé — le lead a rejoint la file d'affectation.");
        setCorrection(false);
      } catch (err) {
        setErreur(err instanceof Error ? err.message : "Erreur — réessayez.");
      }
    });
  }

  return (
    <div
      className="rounded-2xl px-4 sm:px-5 py-4"
      style={{ background: "#fff", border: "1px solid #EBEBEB" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: "#0F4C3A" }}>
            {lead.nom || "(sans nom)"}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#B3412F" }}>
            Numéro reçu : <span className="font-mono">{lead.telephone || "(absent)"}</span>
          </p>
          {lead.message && (
            <p className="text-xs mt-1.5" style={{ color: "#3D4A42" }}>
              {lead.message}
            </p>
          )}
          <p className="text-xs mt-1.5 flex flex-wrap gap-x-3" style={{ color: "#9DB8AD" }}>
            {lead.campagne && <span>Campagne : {lead.campagne}</span>}
            {(lead.biens?.titre || lead.bien_ref) && (
              <span>Bien : {lead.biens?.titre ?? lead.bien_ref}</span>
            )}
            <span>{new Date(lead.cree_le).toLocaleDateString("fr-MA")}</span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {!correction && (
            <button
              type="button"
              onClick={() => setCorrection(true)}
              className="text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer"
              style={{ background: "#0F4C3A", color: "#fff" }}
            >
              Corriger le numéro
            </button>
          )}
          <BoutonAction
            action={ignorerLeadAVerifier.bind(null, lead.id)}
            label="Ignorer"
            labelChargement="Suppression…"
            className="text-xs px-3 py-2 rounded-xl border"
            style={{ borderColor: "#E0DAC8", color: "#6B7A71" }}
            confirmation={`Supprimer définitivement ce lead (${lead.nom || "sans nom"}) ? Cette action est irréversible.`}
          />
        </div>
      </div>

      {correction && (
        <form onSubmit={soumettre} className="mt-3 flex flex-wrap items-center gap-2">
          <input
            value={valeur}
            onChange={(e) => setValeur(e.target.value)}
            placeholder="06 12 34 56 78"
            type="tel"
            autoFocus
            className="border rounded-xl px-3 py-2 text-sm"
            style={{ borderColor: "#E0DAC8", color: "#0F4C3A", minWidth: 200 }}
          />
          <button
            type="submit"
            disabled={pending}
            className="text-xs font-semibold px-3 py-2 rounded-xl cursor-pointer disabled:opacity-60"
            style={{ background: "#D4AF37", color: "#0F4C3A" }}
          >
            {pending ? "Enregistrement…" : "Valider et réintégrer"}
          </button>
          <button
            type="button"
            onClick={() => { setCorrection(false); setErreur(null); setValeur(lead.telephone); }}
            className="text-xs px-3 py-2 rounded-xl border cursor-pointer"
            style={{ borderColor: "#E0DAC8", color: "#6B7A71" }}
          >
            Annuler
          </button>
          {erreur && (
            <span className="text-xs w-full" style={{ color: "#B3412F" }}>
              {erreur}
            </span>
          )}
        </form>
      )}
    </div>
  );
}
