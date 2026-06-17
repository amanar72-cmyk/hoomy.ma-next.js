"use client";

// Bouton générique pour les Server Actions admin — gère loading + erreur
import { useTransition, useState } from "react";

type Props = {
  action: () => Promise<void>;
  label: string;
  labelChargement?: string;
  style?: React.CSSProperties;
  className?: string;
  confirmation?: string;
};

export default function BoutonAction({
  action, label, labelChargement, style, className, confirmation,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  function handleClick() {
    if (confirmation && !window.confirm(confirmation)) return;
    setErreur(null);
    startTransition(async () => {
      try {
        await action();
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Erreur — réessayez.");
      }
    });
  }

  return (
    <span className="inline-flex flex-col gap-0.5">
      <button
        type="button"
        disabled={pending}
        onClick={handleClick}
        className={`${className ?? ""} disabled:opacity-60 cursor-pointer`}
        style={style}
      >
        {pending ? (labelChargement ?? "…") : label}
      </button>
      {erreur && (
        <span className="text-xs" style={{ color: "#DC2626" }} title={erreur}>
          Erreur
        </span>
      )}
    </span>
  );
}
