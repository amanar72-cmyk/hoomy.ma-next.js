import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { upsertLeadEtContact } from "@/lib/leads/upsert";
import { verifierRateLimit } from "@/lib/securite/rateLimiter";
import { lireIP } from "@/lib/securite/lireIP";

// Réception des leads Meta (formulaire natif) relayés par Make.
// Sécurité : en-tête `x-hoomy-secret` == META_LEADS_SECRET (env), sinon 401.
// Mappe les champs Meta (full_name / phone_number / …) vers le payload partagé
// puis délègue TOUT à upsertLeadEtContact (contact, bien, idempotence, lead).

export const runtime = "nodejs";

function champ(corps: Record<string, unknown>, ...cles: string[]): string | null {
  for (const c of cles) {
    const v = corps[c];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

/**
 * Comparaison à temps constant : `a !== b` s'arrête au premier caractère
 * différent, ce qui laisse fuiter le secret octet par octet via le temps de
 * réponse. timingSafeEqual exige des Buffers de même longueur — on compare donc
 * les longueurs d'abord (l'écart de longueur, lui, n'est pas un secret utile).
 */
function secretValide(fourni: string | null, attendu: string): boolean {
  if (!fourni) return false;
  const a = Buffer.from(fourni);
  const b = Buffer.from(attendu);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  // 1. Secret partagé — refuse tout si non configuré ou différent
  const secret = process.env.META_LEADS_SECRET;
  if (!secret) {
    console.error("[leads/meta] META_LEADS_SECRET non configurée — route désactivée.");
    return NextResponse.json({ erreur: "Route non configurée." }, { status: 503 });
  }
  if (!secretValide(req.headers.get("x-hoomy-secret"), secret)) {
    return NextResponse.json({ erreur: "Non autorisé." }, { status: 401 });
  }

  // 2. Rate limit (généreux : Make est un serveur) — 60 requêtes / minute / IP
  const ip = lireIP(req.headers);
  if (!verifierRateLimit(`leads-meta:${ip}`, 60, 60_000)) {
    return NextResponse.json({ erreur: "Trop de requêtes." }, { status: 429 });
  }

  // 3. Corps JSON
  let corps: Record<string, unknown>;
  try {
    corps = await req.json();
  } catch {
    return NextResponse.json({ erreur: "JSON invalide." }, { status: 400 });
  }

  // 4. Mapping des champs Meta → payload partagé.
  //    nom = nom complet ; prénom rempli UNIQUEMENT si Meta sépare les deux.
  const prenomSepare = champ(corps, "first_name", "prenom");
  const nomSepare = champ(corps, "last_name");
  const nomComplet = champ(corps, "full_name", "name", "nom");

  const nom = nomSepare ?? nomComplet ?? "";
  const prenom = nomSepare ? prenomSepare : null;

  // Téléphone absent ou mal saisi : on ne rejette plus le lead (Make ne doit
  // pas réessayer en boucle) — il est gardé en statut 'a_verifier' par
  // upsertLeadEtContact (permettreSansTelephone), à corriger côté admin.
  const telephone = champ(corps, "phone_number", "phone", "telephone") ?? "";

  try {
    const resultat = await upsertLeadEtContact({
      nom,
      prenom,
      telephone,
      permettreSansTelephone: true,
      email: champ(corps, "email"),
      typeProjet: champ(corps, "type_projet", "typeProjet"),
      budget: champ(corps, "budget"),
      financement: champ(corps, "financement"),
      delai: champ(corps, "delai"),
      profilClient: champ(corps, "profil_client", "profilClient"),
      message: champ(corps, "message", "notes"),
      source: "meta_ads",
      // Date de soumission RÉELLE côté Facebook. Sans elle, un historique
      // remonté d'un coup arrive daté de l'import : tous les leads
      // apparaissent « créés à l'instant » et le tri chronologique du
      // back-office est faux.
      dateSoumission: champ(corps, "created_time", "date_creation", "cree_le"),
      campagne: champ(corps, "campaign_name", "campagne", "adset_name"),
      bienRef: champ(corps, "bien_ref", "reference", "ref"),
      metaLeadId: champ(corps, "leadgen_id", "lead_id", "meta_lead_id", "id"),
    });

    return NextResponse.json({
      ok: true,
      leadId: resultat.leadId,
      contactId: resultat.contactId,
      doublon: resultat.doublon,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur interne.";
    // Erreurs de validation (téléphone…) → 400 ; le reste → 500
    const statut = msg.includes("invalide") ? 400 : 500;
    if (statut === 500) console.error("[leads/meta] échec :", e);
    return NextResponse.json({ erreur: msg }, { status: statut });
  }
}
