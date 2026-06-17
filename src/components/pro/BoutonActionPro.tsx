"use client";

import { useTransition, useState } from "react";

export default function BoutonActionPro({
  action,
  label,
  labelChargement = "…",
  labelErreur,
  className,
  style,
  confirmation,
}: {
  action: () => Promise<void>;
  label: string;
  labelChargement?: string;
  labelErreur?: string;
  className?: string;
  style?: React.CSSProperties;
  confirmation?: string;
}) {
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
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={handleClick}
        className={className}
        style={{ ...style, opacity: pending ? 0.6 : 1, cursor: pending ? "default" : "pointer" }}
      >
        {pending ? labelChargement : label}
      </button>
      {erreur && (
        <p className="text-xs px-1" style={{ color: "#DC2626" }}>
          {labelErreur ?? erreur}
        </p>
      )}
    </div>
  );
}
