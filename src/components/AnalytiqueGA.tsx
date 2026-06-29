"use client";

import { usePathname } from "next/navigation";
import { GoogleAnalytics } from "@next/third-parties/google";

interface Props {
  gaId: string;
}

export default function AnalytiqueGA({ gaId }: Props) {
  const pathname = usePathname();

  // Pas de tracking sur l'espace pro ni admin — outils internes
  if (pathname.startsWith("/pro") || pathname.startsWith("/admin")) return null;

  return <GoogleAnalytics gaId={gaId} />;
}
