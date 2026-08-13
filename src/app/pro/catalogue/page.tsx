import Link from "next/link";
import type { Metadata } from "next";
import { supabase } from "@/lib/supabase";
import { COLONNES_BIEN_PUBLIC, type BienPublic } from "@/lib/types";
import { LISTE_VILLES_ACTIVES } from "@/lib/villes";
import { CONTACT } from "@/lib/contact";
import { formaterPrix } from "@/lib/format";
import { urlPubliqueBien } from "@/lib/biens/lienPublic";

export const metadata: Metadata = {
  title: "Catalogue des biens — Espace Pro HOOMY.MA",
};

const TYPES = ["Appartement", "Maison", "Villa", "Riad", "Bureau", "Local commercial", "Terrain"];

type Props = {
  searchParams: Promise<{ reference?: string; ville?: string; type?: string }>;
};

// Catalogue partagé des biens publiés, destiné aux AGENCES partenaires.
// Règle métier : ne JAMAIS exposer l'agent traitant ni le vendeur — on ne
// sélectionne que les colonnes publiques (COLONNES_BIEN_PUBLIC, sans agent_id).
// Contact centralisé HOOMY : le partenaire nous appelle, HOOMY garde le lead.
export default async function PageCatalogue({ searchParams }: Props) {
  const { reference, ville, type } = await searchParams;

  let query = supabase
    .from("biens")
    .select(COLONNES_BIEN_PUBLIC)
    .eq("statut", "finalise")
    .order("cree_le", { ascending: false })
    .limit(60);

  if (reference?.trim()) query = query.ilike("reference", `%${reference.trim()}%`);
  if (ville) query = query.eq("ville", ville);
  if (type) query = query.eq("type", type);

  const { data } = await query;
  const biens = (data ?? []) as unknown as BienPublic[];

  const inputCls = "border rounded-lg px-3 py-2 text-sm w-full focus:outline-none";
  const inputStyle = { borderColor: "#E0DAC8", color: "#0F4C3A", background: "#fff" } as const;

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      {/* En-tête */}
      <div className="mb-2">
        <h1 className="text-2xl mb-1" style={{ fontFamily: "var(--font-marcellus), serif", color: "#0F4C3A" }}>
          Catalogue des biens publiés
        </h1>
        <p className="text-sm" style={{ color: "#9DB8AD" }}>
          Recherchez un bien pour vos acheteurs. Pour toute demande, contactez directement HOOMY —
          nous gérons la mise en relation.
        </p>
      </div>

      {/* Barre de contact HOOMY */}
      <div
        className="flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 mb-6"
        style={{ background: "#F0FAF4", border: "1px solid #C6E8D4" }}
      >
        <span className="text-sm font-medium" style={{ color: "#0F4C3A" }}>
          Un bien vous intéresse ?
        </span>
        <a
          href={CONTACT.telephoneLien}
          className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
          style={{ background: "#0F4C3A", color: "#fff", textDecoration: "none" }}
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          Contacter HOOMY — {CONTACT.telephoneAffichage}
        </a>
      </div>

      {/* Filtres (GET, sans JS) */}
      <form method="GET" className="flex flex-wrap items-end gap-3 mb-6">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: "#555" }}>Référence</label>
          <input
            type="text"
            name="reference"
            defaultValue={reference ?? ""}
            placeholder="HM-1001"
            className={inputCls}
            style={{ ...inputStyle, minWidth: 150 }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: "#555" }}>Ville</label>
          <select name="ville" defaultValue={ville ?? ""} className={inputCls} style={{ ...inputStyle, minWidth: 150 }}>
            <option value="">Toutes les villes</option>
            {LISTE_VILLES_ACTIVES.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: "#555" }}>Type</label>
          <select name="type" defaultValue={type ?? ""} className={inputCls} style={{ ...inputStyle, minWidth: 150 }}>
            <option value="">Tous les types</option>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <button
          type="submit"
          className="px-5 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
          style={{ background: "#D4AF37", color: "#0F4C3A", border: "none" }}
        >
          Rechercher
        </button>
        {(reference || ville || type) && (
          <Link href="/pro/catalogue" className="px-4 py-2 rounded-lg text-sm border transition-colors hover:bg-gray-50"
            style={{ borderColor: "#0F4C3A", color: "#0F4C3A", textDecoration: "none" }}>
            Réinitialiser
          </Link>
        )}
      </form>

      {/* Résultats */}
      <p className="text-sm mb-4" style={{ color: "#9DB8AD" }}>
        <span className="font-semibold" style={{ color: "#0F4C3A" }}>{biens.length}</span> bien{biens.length !== 1 ? "s" : ""} publié{biens.length !== 1 ? "s" : ""}
      </p>

      {biens.length === 0 ? (
        <div className="rounded-2xl py-16 text-center text-sm" style={{ background: "#FAFAF8", border: "1px dashed #E8E2D2", color: "#9DB8AD" }}>
          Aucun bien ne correspond à votre recherche.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {biens.map((bien) => {
            const photo = Array.isArray(bien.photos) ? bien.photos[0] : null;
            // URL absolue : le catalogue est servi depuis pro.hoomy.ma.
            const lien = urlPubliqueBien(bien);
            return (
              <div key={bien.id} className="rounded-2xl overflow-hidden flex flex-col" style={{ background: "#fff", border: "1px solid #F0EDE5", boxShadow: "0 2px 12px rgba(15,76,58,0.05)" }}>
                {/* Photo */}
                <Link href={lien} className="relative block" style={{ height: 170, background: "#F4F6F5" }}>
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt={bien.titre} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm" style={{ color: "#C4D8CE" }}>
                      Pas de photo
                    </div>
                  )}
                  <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
                    {bien.reference && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded-md" style={{ background: "rgba(255,255,255,0.94)", color: "#0F4C3A" }}>
                        {bien.reference}
                      </span>
                    )}
                    {bien.est_agence_partenaire && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md w-fit" style={{ background: "#D4AF37", color: "#0F4C3A" }}>
                        Agence partenaire
                      </span>
                    )}
                  </div>
                </Link>

                {/* Corps */}
                <div className="p-4 flex flex-col gap-2 flex-1">
                  <p className="text-sm font-semibold leading-snug line-clamp-2" style={{ color: "#0F4C3A" }}>{bien.titre}</p>
                  <p className="text-xs" style={{ color: "#9DB8AD" }}>
                    {bien.type} · {bien.quartier ? `${bien.quartier}, ` : ""}{bien.ville}
                  </p>
                  <p className="text-xs" style={{ color: "#6B7A71" }}>
                    {bien.surface > 0 ? `${bien.surface} m²` : ""}
                    {bien.type !== "Terrain" && bien.chambres > 0 ? ` · ${bien.chambres} ch.` : ""}
                    {bien.type !== "Terrain" && bien.salles_bain > 0 ? ` · ${bien.salles_bain} sdb` : ""}
                  </p>
                  <p className="text-base font-semibold mt-auto" style={{ fontFamily: "var(--font-marcellus), serif", color: "#D4AF37" }}>
                    {formaterPrix(bien.prix, bien.transaction)}
                  </p>
                  <div className="flex gap-2 pt-1">
                    <a href={lien} target="_blank" rel="noopener noreferrer"
                      className="flex-1 text-center text-xs font-semibold px-3 py-2 rounded-lg transition-opacity hover:opacity-90"
                      style={{ background: "#F4F6F5", color: "#0F4C3A", border: "1px solid #E0DAC8", textDecoration: "none" }}>
                      Voir l&apos;annonce
                    </a>
                    <a href={CONTACT.telephoneLien} className="flex-1 text-center text-xs font-semibold px-3 py-2 rounded-lg transition-opacity hover:opacity-90"
                      style={{ background: "#0F4C3A", color: "#fff", textDecoration: "none" }}>
                      Contacter HOOMY
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
