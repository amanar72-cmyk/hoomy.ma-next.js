import { NextRequest, NextResponse } from "next/server";
import { upsertLeadEtContact } from "@/lib/leads/upsert";
import { verifierRateLimit } from "@/lib/securite/rateLimiter";
import { lireIP } from "@/lib/securite/lireIP";

// Réception des leads du SITE (landing pages publicitaires → fetch POST).
// Le formulaire React existant passe, lui, par la server action soumettreLead —
// les DEUX chemins convergent vers upsertLeadEtContact (source de vérité unique).
// Protections : honeypot + rate limit IP (mêmes seuils que la server action).

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // 1. Rate limit : 5 soumissions / 10 min / IP (public)
  const ip = lireIP(req.headers);
  if (!verifierRateLimit(`${ip}-lead`, 5, 10 * 60 * 1000)) {
    return NextResponse.json(
      { erreur: "Trop de soumissions. Veuillez patienter quelques minutes." },
      { status: 429 }
    );
  }

  // 2. Corps JSON
  let corps: Record<string, unknown>;
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ erreur: "JSON invalide." }, { status: 400 });
  }

  // 3. Honeypot : champ « siteWeb » rempli → bot → fausse réussite silencieuse
  if (typeof corps.siteWeb === "string" && corps.siteWeb) {
    return NextResponse.json({ ok: true });
  }

  const s = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? v.trim() : null;

  const nom = s(corps.nom);
  const telephone = s(corps.telephone);
  if (!nom) return NextResponse.json({ erreur: "Veuillez indiquer votre nom." }, { status: 400 });
  if (!telephone) return NextResponse.json({ erreur: "Téléphone manquant." }, { status: 400 });

  try {
    const resultat = await upsertLeadEtContact({
      nom,
      telephone,
      email: s(corps.email),
      typeProjet: s(corps.typeProjet),
      budget: s(corps.budget),
      financement: s(corps.financement),
      delai: s(corps.delai),
      profilClient: s(corps.profilClient),
      zones: Array.isArray(corps.zones) ? (corps.zones as string[]) : null,
      message: s(corps.message),
      source: "site",
      campagne: s(corps.campagne),
      bienRef: s(corps.bienRef),
      bienId: s(corps.bienId),
    });

    // Réponse publique volontairement minimale (pas d'identifiants internes)
    return NextResponse.json({ ok: true, doublon: resultat.doublon });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur interne.";
    const statut = msg.includes("invalide") ? 400 : 500;
    if (statut === 500) console.error("[leads/site] échec :", e);
    return NextResponse.json({ erreur: msg }, { status: statut });
  }
}
