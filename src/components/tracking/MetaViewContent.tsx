"use client";

import { useEffect, useRef } from "react";
import { payloadBien, trackMeta, type ParamsBienMeta } from "@/lib/meta/pixel";

type Props = ParamsBienMeta;

/**
 * Composant invisible — tire le ViewContent Meta au montage d'une fiche bien
 * publique (retargeting « il a vu ce bien »). Consent-gated via la garde fbq
 * du helper. Ne rend rien.
 *
 * Le ref évite un double tir si React re-monte l'effet (Strict Mode en dev) ou
 * si la même fiche se re-rend sans changer de référence.
 */
export default function MetaViewContent({ reference, titre, prix }: Props) {
  const dejaEnvoye = useRef<string | null>(null);

  useEffect(() => {
    if (dejaEnvoye.current === reference) return;
    dejaEnvoye.current = reference;
    trackMeta("ViewContent", payloadBien({ reference, titre, prix }));
  }, [reference, titre, prix]);

  return null;
}
