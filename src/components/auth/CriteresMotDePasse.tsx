"use client";

import { evaluerMotDePasse } from "@/lib/securite/motDePasse";

interface Props {
  motDePasse: string;
}

/** Liste des règles cochées en direct. Masquée tant que le champ est vide. */
export default function CriteresMotDePasse({ motDePasse }: Props) {
  if (!motDePasse) return null;

  const criteres = evaluerMotDePasse(motDePasse);

  return (
    <ul className="mt-2 space-y-1" style={{ listStyle: "none", padding: 0, margin: "0.5rem 0 0" }}>
      {criteres.map((c) => (
        <li
          key={c.libelle}
          className="text-xs flex items-center gap-1.5"
          style={{ color: c.valide ? "var(--succes-texte)" : "var(--texte-secondaire)" }}
        >
          <span aria-hidden="true">{c.valide ? "✓" : "○"}</span>
          <span>{c.libelle}</span>
        </li>
      ))}
    </ul>
  );
}
