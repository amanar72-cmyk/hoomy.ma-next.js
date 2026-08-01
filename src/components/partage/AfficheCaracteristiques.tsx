// Affichage des caractéristiques spécifiques au type (lecture seule).
// Server Component — même source de vérité que la saisie
// (src/lib/biens/caracteristiques.ts). N'affiche QUE les champs renseignés.

import { champsRenseignes, type Caracteristiques, type ChampCarac } from "@/lib/biens/caracteristiques";

function formater(c: ChampCarac, v: string | number | boolean): string {
  if (c.type === "bool") return "Oui"; // les booléens faux sont filtrés en amont
  return c.suffixe ? `${v} ${c.suffixe}` : String(v);
}

type Props = {
  type: string;
  caracteristiques: Caracteristiques | null | undefined;
};

export default function AfficheCaracteristiques({ type, caracteristiques }: Props) {
  const carac = caracteristiques ?? {};
  const champs = champsRenseignes(type, caracteristiques);

  if (champs.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
      {champs.map((c) => (
        <div key={c.cle}>
          <div className="text-xs" style={{ color: "var(--texte-secondaire)" }}>{c.label}</div>
          <div className="text-sm font-medium" style={{ color: "var(--texte-principal)" }}>
            {formater(c, carac[c.cle] as string | number | boolean)}
          </div>
        </div>
      ))}
    </div>
  );
}
