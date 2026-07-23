"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { changerStatutProposition } from "@/app/admin/demandes-recherche/actions";
import { afficherToast } from "@/components/ui/Toaster";
import { LIBELLES_STATUT_PROPOSITION, type PropositionBien, type StatutProposition } from "@/lib/demandes/types";

const STATUTS: StatutProposition[] = ["nouvelle", "en_etude", "retenue", "refusee"];
const COULEURS: Record<StatutProposition, { bg: string; color: string }> = {
  nouvelle: { bg: "#DBEAFE", color: "#1E40AF" },
  en_etude: { bg: "#FEF3C7", color: "#92400E" },
  retenue:  { bg: "#D1FAE5", color: "#065F46" },
  refusee:  { bg: "#FEE2E2", color: "#991B1B" },
};

const BUCKET = "propositions-photos";

export default function CartePropositionAdmin({ proposition }: { proposition: PropositionBien }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [urlsPhotos, setUrlsPhotos] = useState<string[] | null>(null);
  const [chargementPhotos, setChargementPhotos] = useState(false);

  function changerStatut(statut: StatutProposition) {
    startTransition(async () => {
      try {
        await changerStatutProposition(proposition.id, statut);
        afficherToast(`Proposition : ${LIBELLES_STATUT_PROPOSITION[statut]}`);
        router.refresh();
      } catch (e) {
        afficherToast(e instanceof Error ? e.message : "Erreur.");
      }
    });
  }

  async function chargerPhotos() {
    if (urlsPhotos || !proposition.photos?.length) return;
    setChargementPhotos(true);
    const supabase = createClient();
    const urls: string[] = [];
    for (const chemin of proposition.photos) {
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(chemin, 300);
      if (data?.signedUrl) urls.push(data.signedUrl);
    }
    setUrlsPhotos(urls);
    setChargementPhotos(false);
  }

  const nomComplet = [proposition.prenom, proposition.nom].filter(Boolean).join(" ");
  const couleur = COULEURS[proposition.statut];

  return (
    <div className="rounded-2xl p-5" style={{ background: "#fff", border: "1px solid #F0EDE5" }}>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: "#1f2a24" }}>{nomComplet}</p>
          <p className="text-xs" style={{ color: "#9DB8AD" }}>
            {proposition.profil_proposeur === "agence" ? `Agence${proposition.nom_agence ? ` — ${proposition.nom_agence}` : ""}` : "Particulier"}
            {" · "}{proposition.telephone}{proposition.email ? ` · ${proposition.email}` : ""}
          </p>
        </div>
        <select
          value={proposition.statut}
          onChange={(e) => changerStatut(e.target.value as StatutProposition)}
          disabled={pending}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-full border-0 cursor-pointer disabled:opacity-60"
          style={{ background: couleur.bg, color: couleur.color }}
        >
          {STATUTS.map((s) => <option key={s} value={s}>{LIBELLES_STATUT_PROPOSITION[s]}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-xs mb-3" style={{ color: "#3D4A42" }}>
        {proposition.type && <span>{proposition.type}</span>}
        {(proposition.ville || proposition.quartier) && <span>{[proposition.ville, proposition.quartier].filter(Boolean).join(", ")}</span>}
        {proposition.prix && <span>{new Intl.NumberFormat("fr-FR").format(proposition.prix)} DH</span>}
        {proposition.surface && <span>{proposition.surface} m²</span>}
        {proposition.chambres != null && <span>{proposition.chambres} ch.</span>}
        {proposition.etage && <span>Étage {proposition.etage}</span>}
      </div>

      {proposition.description && <p className="text-xs mb-1.5" style={{ color: "#6B7280" }}>{proposition.description}</p>}
      {proposition.atouts && <p className="text-xs mb-1.5 italic" style={{ color: "#6B7280" }}>Atouts : {proposition.atouts}</p>}
      {proposition.lien_annonce && (
        <a href={proposition.lien_annonce} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline block mb-1.5" style={{ color: "#0F4C3A" }}>
          Voir l&apos;annonce liée →
        </a>
      )}

      {proposition.photos && proposition.photos.length > 0 && (
        <div className="mt-2">
          {!urlsPhotos ? (
            <button type="button" onClick={chargerPhotos} disabled={chargementPhotos} className="text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer" style={{ background: "#F0EDE5", color: "#0F4C3A" }}>
              {chargementPhotos ? "Chargement…" : `Voir ${proposition.photos.length} photo${proposition.photos.length > 1 ? "s" : ""}`}
            </button>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {urlsPhotos.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-20 h-16 object-cover rounded-lg" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-xs mt-3" style={{ color: "#C4BFAE" }}>Reçue le {new Date(proposition.cree_le).toLocaleDateString("fr-MA")}</p>
    </div>
  );
}
