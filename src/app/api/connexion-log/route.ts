import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifierRateLimit } from "@/lib/securite/rateLimiter";
import { lireIP } from "@/lib/securite/lireIP";

// Enregistre une tentative de connexion (succès ou échec) avec l'IP + user-agent
// de la personne. Écriture via service_role (RLS fermée à tout le reste).
// Toujours 204 : la journalisation ne doit jamais casser le login.

export const runtime = "nodejs";

const METHODES = ["mot_de_passe", "google", "pro"] as const;

function chaine(v: unknown, max: number): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}

export async function POST(req: NextRequest) {
  const ip = lireIP(req.headers);

  // Filet global : évite le flood du journal même si l'IP est « inconnue »
  // (proxy sans X-Real-IP) ou en cas de credential-stuffing distribué. Généreux.
  if (!verifierRateLimit("conn-log:global", 600, 60_000)) {
    return new Response(null, { status: 429 });
  }
  // Anti-abus : 30 journalisations / minute / IP
  if (!verifierRateLimit(`conn-log:${ip}`, 30, 60_000)) {
    return new Response(null, { status: 429 });
  }

  let corps: Record<string, unknown>;
  try {
    corps = await req.json();
  } catch {
    return new Response(null, { status: 204 });
  }

  const methodeBrute = corps.methode;
  const methode = METHODES.includes(methodeBrute as (typeof METHODES)[number])
    ? (methodeBrute as string)
    : "mot_de_passe";
  const resultat = corps.resultat === "succes" ? "succes" : "echec";
  const email = chaine(corps.email, 200)?.toLowerCase() ?? null;
  const motif = chaine(corps.motif, 300);
  const userAgent = (req.headers.get("user-agent") ?? "").slice(0, 400) || null;

  try {
    const admin = createAdminClient();
    await admin.from("tentatives_connexion").insert({
      email,
      methode,
      resultat,
      motif,
      adresse_ip: ip,
      user_agent: userAgent,
    });
  } catch {
    // jamais bloquant
  }

  return new Response(null, { status: 204 });
}
