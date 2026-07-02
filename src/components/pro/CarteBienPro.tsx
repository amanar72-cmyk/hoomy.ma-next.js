// Carte d'un bien pour l'espace Pro
import BadgeStatut from "./BadgeStatut";
import { formaterPrix } from "@/lib/format";

type Props = {
  id: string;
  reference: string | null;
  titre: string;
  type: string;
  transaction: string;
  prix: number;
  ville: string;
  quartier?: string | null;
  chambres: number;
  surface: number;
  photos: string[] | null;
  verifie: boolean;
  cree_le: string;
  vues?: number; // mock pour l'instant
};


function formaterDate(date: string) {
  return new Date(date).toLocaleDateString("fr-MA", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export default function CarteBienPro({
  reference, titre, type, transaction, prix,
  ville, quartier, chambres, surface, photos, verifie, cree_le, vues = 0,
}: Props) {
  const photo = photos?.[0] ?? null;
  const statut = verifie ? "Publié" : "En traitement";

  return (
    <div className="rounded-2xl overflow-hidden border flex flex-col"
      style={{ background: "#fff", borderColor: "#F0EDE5", boxShadow: "0 2px 16px rgba(15,76,58,0.06)" }}>

      {/* Photo */}
      <div className="relative" style={{ height: 180, background: "#F4F6F5", flexShrink: 0 }}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={titre} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#C4D8CE" strokeWidth="1.2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <BadgeStatut statut={statut} small />
        </div>
        <div className="absolute top-3 right-3">
          <span className="text-xs font-mono px-2 py-0.5 rounded-full"
            style={{ background: "rgba(15,76,58,0.85)", color: "#fff" }}>
            {reference ?? "—"}
          </span>
        </div>
      </div>

      {/* Contenu */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        <div>
          <p className="text-xs mb-0.5" style={{ color: "#9DB8AD" }}>{type} · {transaction === "vente" ? "À vendre" : "À louer"}</p>
          <p className="text-sm font-medium leading-snug line-clamp-2" style={{ color: "#1f2a24" }}>{titre}</p>
        </div>

        <p className="text-base font-semibold" style={{ color: "#0F4C3A", fontFamily: "var(--font-marcellus),serif" }}>
          {formaterPrix(prix, transaction)}
        </p>

        {/* Infos */}
        <div className="flex items-center gap-3 text-xs" style={{ color: "#6B7A71" }}>
          {type !== "Terrain" && chambres > 0 && (
            <span className="flex items-center gap-1">
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
              {chambres} ch.
            </span>
          )}
          <span className="flex items-center gap-1">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
            {surface} m²
          </span>
        </div>

        {/* Localisation */}
        <p className="text-xs flex items-center gap-1" style={{ color: "#9DB8AD" }}>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {quartier ? `${quartier}, ` : ""}{ville}
        </p>

        <div className="mt-auto pt-2 border-t flex items-center justify-between"
          style={{ borderColor: "#F0EDE5" }}>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs" style={{ color: "#9DB8AD" }}>
              Soumis le {formaterDate(cree_le)}
            </span>
            <span className="text-xs" style={{ color: "#9DB8AD" }}>
              {vues} vue{vues !== 1 ? "s" : ""}
            </span>
          </div>
          <button type="button"
            className="text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer"
            style={{ background: "#D4AF37", color: "#0F4C3A" }}>
            Prendre RDV
          </button>
        </div>
      </div>
    </div>
  );
}
