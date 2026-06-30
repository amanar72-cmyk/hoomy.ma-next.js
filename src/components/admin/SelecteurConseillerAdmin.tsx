"use client";

import { useRouter } from "next/navigation";

type ConseillerOption = {
  id: string;
  nom_complet: string | null;
  role: string;
};

export default function SelecteurConseillerAdmin({
  conseillers,
  conseillerActuelId,
}: {
  conseillers: ConseillerOption[];
  conseillerActuelId?: string;
}) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="selecteur-conseiller" className="text-xs font-medium" style={{ color: "#999" }}>
        Voir l&apos;activité de :
      </label>
      <select
        id="selecteur-conseiller"
        value={conseillerActuelId ?? ""}
        onChange={(e) => {
          if (e.target.value) router.push(`/admin/agents/${e.target.value}`);
        }}
        className="text-sm px-3 py-2 rounded-xl border cursor-pointer focus:outline-none"
        style={{ borderColor: "#E8E8E8", color: "#111", background: "#fff" }}
      >
        <option value="" disabled>
          Sélectionner un conseiller
        </option>
        {conseillers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nom_complet ?? "Sans nom"} {c.role === "agence" ? "(Agence)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
