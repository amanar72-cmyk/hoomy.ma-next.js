import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifierRateLimit } from "@/lib/securite/rateLimiter";
import { lireIP } from "@/lib/securite/lireIP";
import { SOURCES_AUDIENCE, type SourceAudience } from "@/lib/mesure/source";

// Mesure d'audience interne, SANS cookie ni identifiant (voir mesure_audience.sql).
// Reçoit une page vue envoyée par <MesureAudience /> via navigator.sendBeacon.
//
// Ce qui est stocké : chemin, référence du bien, source, entrée oui/non,
// mobile/ordinateur, date. Ce qui n'est JAMAIS stocké : IP, user-agent,
// identifiant de visiteur ou de session. L'IP sert uniquement au rate-limit,
// en mémoire.
//
// Toujours 204 : la mesure ne doit jamais casser la navigation.

export const runtime = "nodejs";

// Robots, aperçus de liens et outils de monitoring : ignorés.
const RE_ROBOT =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|meta-externalagent|whatsapp|headless|lighthouse|pingdom|uptime|curl|wget|python|axios|node-fetch/i;

const RE_MOBILE = /mobi|android|iphone|ipad|ipod/i;

// Référence HOOMY présente en fin de slug : /acheter/villa-...-hm-95077
const RE_REFERENCE = /hm-(\d{3,6})(?:$|[/?#-])/i;

function reponseVide(status = 204) {
  return new Response(null, { status });
}

export async function POST(req: NextRequest) {
  const userAgent = req.headers.get("user-agent") ?? "";
  if (!userAgent || RE_ROBOT.test(userAgent)) return reponseVide();

  // Anti-abus : 120 pages / minute / IP, et un plafond global.
  const ip = lireIP(req.headers);
  if (!verifierRateLimit("mesure:global", 3000, 60_000)) return reponseVide(429);
  if (!verifierRateLimit(`mesure:${ip}`, 120, 60_000)) return reponseVide(429);

  let corps: Record<string, unknown>;
  try {
    // sendBeacon envoie du texte : on parse nous-mêmes.
    corps = JSON.parse(await req.text());
  } catch {
    return reponseVide();
  }

  // Chemin : obligatoirement un chemin interne, sans query string ni fragment.
  const cheminBrut = typeof corps.chemin === "string" ? corps.chemin : "";
  if (!cheminBrut.startsWith("/") || cheminBrut.startsWith("//")) return reponseVide();
  const chemin = cheminBrut.split(/[?#]/)[0].slice(0, 300);

  // Back-office jamais mesuré (le composant ne l'envoie pas, double garde ici).
  if (chemin.startsWith("/pro") || chemin.startsWith("/admin") || chemin.startsWith("/api")) {
    return reponseVide();
  }

  const source: SourceAudience = SOURCES_AUDIENCE.includes(corps.source as SourceAudience)
    ? (corps.source as SourceAudience)
    : "autre";

  const ref = chemin.match(RE_REFERENCE);
  const referenceBien = ref ? `HM-${ref[1]}` : null;

  try {
    const admin = createAdminClient();
    await admin.from("mesure_audience").insert({
      chemin,
      reference_bien: referenceBien,
      source,
      entree: corps.entree === true,
      appareil: RE_MOBILE.test(userAgent) ? "mobile" : "ordinateur",
    });
  } catch {
    // jamais bloquant
  }

  return reponseVide();
}
