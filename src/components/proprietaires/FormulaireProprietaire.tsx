"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  creerProprietaire,
  modifierProprietaire,
  type DonneesProprietaire,
} from "@/lib/proprietaires/actions";

// Formulaire propriétaire (vendeur) — création ET modification.
// `base` = "/admin" ou "/pro" : mêmes actions serveur, seules les URLs de
// navigation changent. En cas de téléphone déjà connu, on propose d'ouvrir
// la fiche existante au lieu de créer un doublon.

type Props = {
  base: "/admin" | "/pro";
  // Présent = mode modification (champs pré-remplis)
  initial?: (DonneesProprietaire & { id: string }) | null;
};

const CHAMP =
  "w-full border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2";

export default function FormulaireProprietaire({ base, initial }: Props) {
  const router = useRouter();
  const [nom, setNom] = useState(initial?.nom ?? "");
  const [prenom, setPrenom] = useState(initial?.prenom ?? "");
  const [telephone, setTelephone] = useState(initial?.telephone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [existantId, setExistantId] = useState<string | null>(null);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    if (envoi) return;
    setErreur(null);
    setExistantId(null);
    setEnvoi(true);
    try {
      const donnees: DonneesProprietaire = {
        nom,
        prenom: prenom || null,
        telephone,
        email: email || null,
        notes: notes || null,
      };
      const resultat = initial
        ? await modifierProprietaire(initial.id, donnees)
        : await creerProprietaire(donnees);

      if (resultat.ok) {
        router.push(`${base}/proprietaires/${resultat.id}`);
        router.refresh();
      } else {
        setErreur(resultat.erreur);
        setExistantId(resultat.existantId ?? null);
        setEnvoi(false);
      }
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Erreur inattendue.");
      setEnvoi(false);
    }
  }

  return (
    <form onSubmit={soumettre} className="space-y-4 max-w-xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#6B7A71" }}>
            Nom *
          </label>
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            required
            maxLength={100}
            placeholder="Ex : Benali"
            className={CHAMP}
            style={{ borderColor: "#E0DAC8", color: "#0F4C3A" }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#6B7A71" }}>
            Prénom
          </label>
          <input
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            maxLength={100}
            placeholder="Ex : Karim"
            className={CHAMP}
            style={{ borderColor: "#E0DAC8", color: "#0F4C3A" }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#6B7A71" }}>
            Téléphone *
          </label>
          <input
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            required
            type="tel"
            placeholder="06 12 34 56 78"
            className={CHAMP}
            style={{ borderColor: "#E0DAC8", color: "#0F4C3A" }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#6B7A71" }}>
            Email
          </label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="karim@exemple.ma"
            className={CHAMP}
            style={{ borderColor: "#E0DAC8", color: "#0F4C3A" }}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "#6B7A71" }}>
          Notes internes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Ex : joignable après 18h, préfère WhatsApp…"
          className={CHAMP}
          style={{ borderColor: "#E0DAC8", color: "#0F4C3A" }}
        />
      </div>

      {erreur && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "#FDF3F2", color: "#B3412F", border: "1px solid #F2D6D1" }}
        >
          {erreur}
          {existantId && (
            <>
              {" "}
              <Link
                href={`${base}/proprietaires/${existantId}`}
                className="underline font-medium"
              >
                Ouvrir sa fiche
              </Link>
            </>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={envoi}
          className="px-6 py-2.5 rounded-xl text-sm font-medium cursor-pointer disabled:opacity-60"
          style={{ background: "#0F4C3A", color: "#fff" }}
        >
          {envoi ? "Enregistrement…" : initial ? "Enregistrer les modifications" : "Créer le propriétaire"}
        </button>
        <Link
          href={initial ? `${base}/proprietaires/${initial.id}` : `${base}/proprietaires`}
          className="px-5 py-2.5 rounded-xl text-sm border"
          style={{ borderColor: "#E0DAC8", color: "#6B7A71" }}
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
