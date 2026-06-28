"use client";

import { useActionState, useEffect, useRef } from "react";
import { mettreAJourProfil } from "./actions";

type Props = {
  nomComplet: string | null;
  email: string | null;
  telephone: string | null;
};

const etatInitial = { succes: false, erreur: null as string | null };

function Champ({
  label, name, type = "text", defaultValue, placeholder, disabled,
}: {
  label: string; name: string; type?: string;
  defaultValue?: string | null; placeholder?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: "#374151" }}>
        {label}
      </label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          borderColor: "#E8E2D2",
          color: "var(--texte-principal)",
          background: disabled ? "#F9F7F4" : "var(--fond-secondaire)",
        }}
      />
      {disabled && (
        <p className="text-xs mt-1" style={{ color: "#9DB8AD" }}>
          Non modifiable — contactez le support pour changer votre email.
        </p>
      )}
    </div>
  );
}

export default function FormulaireProfil({ nomComplet, email, telephone }: Props) {
  const [etat, action, pending] = useActionState(
    async (_prev: typeof etatInitial, formData: FormData) => {
      try {
        await mettreAJourProfil(formData);
        return { succes: true, erreur: null };
      } catch (e) {
        return { succes: false, erreur: (e as Error).message };
      }
    },
    etatInitial
  );

  // Efface le message de succès après 3 s
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (etat.succes) {
      timerRef.current = setTimeout(() => {
        // rerender déclenché par revalidatePath — pas besoin de reset manuel
      }, 3000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [etat.succes]);

  return (
    <form action={action} className="flex flex-col gap-5">
      <Champ
        label="Nom complet"
        name="nom_complet"
        defaultValue={nomComplet}
        placeholder="Prénom Nom"
      />
      <Champ
        label="Email"
        name="email"
        type="email"
        defaultValue={email}
        disabled
      />
      <Champ
        label="Téléphone"
        name="telephone"
        type="tel"
        defaultValue={telephone}
        placeholder="+212 6XX XXX XXX"
      />

      {etat.erreur && (
        <p
          className="text-sm px-4 py-3 rounded-xl"
          style={{ background: "#FEE2E2", color: "#991B1B" }}
        >
          {etat.erreur}
        </p>
      )}

      {etat.succes && (
        <p
          className="text-sm px-4 py-3 rounded-xl"
          style={{ background: "#D1FAE5", color: "#065F46" }}
        >
          Profil mis à jour avec succès.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start px-6 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        style={{ background: "#0F4C3A", color: "#fff" }}
      >
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
