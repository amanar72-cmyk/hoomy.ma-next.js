import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { lireIP } from "@/lib/securite/lireIP";

// Diagnostic ADMIN — révèle quels en-têtes d'IP le reverse proxy Hostinger
// transmet réellement en production, pour décider en toute connaissance de
// cause de la stratégie de lireIP (X-Real-IP vs X-Forwarded-For).
//
// À utiliser une fois connecté en admin : ouvrir /api/_diag/ip dans le
// navigateur. Ne renvoie que l'IP de l'appelant + les en-têtes de routage —
// aucune donnée sensible. Réservé aux admins pour ne pas exposer l'infra.

export const runtime = "nodejs";

const ENTETES = [
  "x-real-ip",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "forwarded",
  "cf-connecting-ip",
  "true-client-ip",
  "x-client-ip",
];

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ erreur: "Non authentifié" }, { status: 401 });
  const { data: profil } = await supabase.from("profils").select("role").eq("id", user.id).single();
  if (profil?.role !== "admin") return NextResponse.json({ erreur: "Réservé aux admins" }, { status: 403 });

  const entetes: Record<string, string | null> = {};
  for (const h of ENTETES) entetes[h] = req.headers.get(h);

  return NextResponse.json({
    ip_utilisee_par_lireIP: lireIP(req.headers),
    trust_proxy_x_forwarded_for: process.env.TRUST_PROXY_X_FORWARDED_FOR === "true",
    entetes,
    // Aide à l'interprétation.
    verdict:
      entetes["x-real-ip"]
        ? "OK : X-Real-IP présent → lireIP fonctionne en per-IP fiable."
        : entetes["x-forwarded-for"]
        ? "X-Real-IP absent mais X-Forwarded-For présent → poser TRUST_PROXY_X_FORWARDED_FOR=true (le dernier maillon = IP réelle ajoutée par le proxy)."
        : "Aucun en-tête d'IP → toutes les requêtes partagent la clé « inconnue ». À corriger côté proxy Hostinger.",
  });
}
