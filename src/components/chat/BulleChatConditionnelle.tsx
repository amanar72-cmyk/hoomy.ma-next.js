"use client";

import { usePathname } from "next/navigation";
import BulleChat from "./BulleChat";

// Routes où la bulle de chat ne doit PAS apparaître
// /telecharger : page de récupération de l'app agent, pas un parcours client —
// la bulle y recouvrait le pied de page sans rendre le moindre service.
const ROUTES_EXCLUES = ["/admin", "/pro", "/mon-compte", "/telecharger"];

export default function BulleChatConditionnelle() {
  const pathname = usePathname();
  const exclu = ROUTES_EXCLUES.some((r) => pathname.startsWith(r));
  if (exclu) return null;
  return <BulleChat />;
}
