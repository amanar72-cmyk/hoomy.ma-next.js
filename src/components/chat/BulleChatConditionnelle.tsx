"use client";

import { usePathname } from "next/navigation";
import BulleChat from "./BulleChat";

// Routes où la bulle de chat ne doit PAS apparaître
const ROUTES_EXCLUES = ["/admin", "/pro", "/mon-compte"];

export default function BulleChatConditionnelle() {
  const pathname = usePathname();
  const exclu = ROUTES_EXCLUES.some((r) => pathname.startsWith(r));
  if (exclu) return null;
  return <BulleChat />;
}
