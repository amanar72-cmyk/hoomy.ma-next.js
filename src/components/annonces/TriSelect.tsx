"use client";

import { useRouter, usePathname } from "next/navigation";

const OPTIONS = [
  { valeur: "cree_le_desc",  label: "Plus récent" },
  { valeur: "cree_le_asc",   label: "Plus ancien" },
  { valeur: "prix_asc",      label: "Prix croissant" },
  { valeur: "prix_desc",     label: "Prix décroissant" },
  { valeur: "surface_asc",   label: "Surface croissante" },
  { valeur: "surface_desc",  label: "Surface décroissante" },
];

type Props = {
  tri: string;
  // Les autres params actifs à préserver lors du changement de tri
  paramsActifs: Record<string, string>;
};

export default function TriSelect({ tri, paramsActifs }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function changerTri(valeur: string) {
    const params = new URLSearchParams(paramsActifs);
    params.set("tri", valeur);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm whitespace-nowrap" style={{ color: "var(--texte-chaud)" }}>
        Trier par :
      </label>
      <select
        value={tri}
        onChange={(e) => changerTri(e.target.value)}
        className="border rounded-lg px-3 py-2 text-sm focus:outline-none appearance-none cursor-pointer"
        style={{ borderColor: "var(--bordure-chaude)", color: "var(--primaire)", background: "var(--fond-secondaire)" }}
      >
        {OPTIONS.map((opt) => (
          <option key={opt.valeur} value={opt.valeur}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
