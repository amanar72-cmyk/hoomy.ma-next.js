import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifierRateLimit } from "@/lib/securite/rateLimiter";
import { lireIP } from "@/lib/securite/lireIP";
import { envoyerEmail } from "@/lib/email/envoyerEmail";
import { construireEmailProposition } from "@/lib/email/emailDemandeRecherche";
import type { DemandeRecherche, PropositionBien } from "@/lib/demandes/types";

// Réception publique d'une proposition de bien sur une demande de recherche
// (place de marché inversée) — SANS COMPTE, formulaire ouvert à tous.
//
// Aucune écriture directe côté client (pas de policy INSERT anon sur
// propositions_bien, voir demandes_recherche.sql) : cette route écrit en
// service_role, même schéma que le webhook WhatsApp.
//
// Anti-spam en profondeur : honeypot, délai minimal, rate limit IP, et la
// demande visée doit être publiquement 'publiee' (sinon 404 — jamais de fuite
// sur l'existence d'une demande non publiée).

export const runtime = "nodejs";

const BUCKET_PHOTOS = "propositions-photos";
const TAILLE_MAX_PHOTO = 5 * 1024 * 1024; // 5 Mo — même limite que le bucket
const NB_PHOTOS_MAX = 6;
const TYPES_AUTORISES = ["image/jpeg", "image/png", "image/webp"];

function champ(fd: FormData, cle: string): string | null {
  const v = fd.get(cle);
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export async function POST(req: NextRequest) {
  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, erreur: "Formulaire invalide." }, { status: 400 });
  }

  // Couche 1 — Honeypot : rempli → bot → fausse réussite silencieuse
  if (champ(fd, "site_web")) {
    return NextResponse.json({ ok: true });
  }

  // Couche 2 — Délai minimal (< 3 s depuis l'affichage = bot probable)
  const afficheA = Number(fd.get("affiche_a"));
  if (!Number.isFinite(afficheA) || Date.now() - afficheA < 3000) {
    return NextResponse.json({ ok: true }); // fausse réussite silencieuse, même logique
  }

  // Couche 3 — Rate limiting par IP (5 propositions / 10 min)
  const ip = lireIP(req.headers);
  if (!verifierRateLimit(`${ip}-proposition`, 5, 10 * 60 * 1000)) {
    return NextResponse.json({ ok: false, erreur: "Trop de soumissions. Réessayez dans quelques minutes." }, { status: 429 });
  }

  // Couche 4 — Consentement obligatoire
  if (fd.get("consentement") !== "on" && fd.get("consentement") !== "true") {
    return NextResponse.json({ ok: false, erreur: "Le consentement au traitement des données est requis." }, { status: 400 });
  }

  // ── Validation des champs ────────────────────────────────────────────────
  const demandeId = champ(fd, "demande_id");
  const nom = champ(fd, "nom");
  const telephone = champ(fd, "telephone");
  const profilProposeur = champ(fd, "profil_proposeur");
  const nomAgence = champ(fd, "nom_agence");
  const type = champ(fd, "type");
  const ville = champ(fd, "ville");

  if (!demandeId || !nom || !telephone || !profilProposeur) {
    return NextResponse.json({ ok: false, erreur: "Champs obligatoires manquants." }, { status: 400 });
  }
  if (!["particulier", "agence"].includes(profilProposeur)) {
    return NextResponse.json({ ok: false, erreur: "Profil invalide." }, { status: 400 });
  }
  if (profilProposeur === "agence" && !nomAgence) {
    return NextResponse.json({ ok: false, erreur: "Nom de l'agence requis." }, { status: 400 });
  }
  if (!type || !ville) {
    return NextResponse.json({ ok: false, erreur: "Type de bien et ville requis." }, { status: 400 });
  }

  const admin = createAdminClient();

  // ── La demande doit exister ET être publiquement 'publiee' ───────────────
  // 404 générique (pas de distinction "n'existe pas" vs "pas publiée") pour
  // ne jamais laisser deviner l'existence d'une demande en_validation/refusee.
  const { data: demande } = await admin
    .from("demandes_recherche")
    .select("*")
    .eq("id", demandeId)
    .eq("statut", "publiee")
    .maybeSingle();

  if (!demande) {
    return NextResponse.json({ ok: false, erreur: "Demande introuvable ou non publiée." }, { status: 404 });
  }

  // ── Photos (optionnelles) — validées AVANT tout upload ────────────────────
  const fichiers = fd.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (fichiers.length > NB_PHOTOS_MAX) {
    return NextResponse.json({ ok: false, erreur: `Maximum ${NB_PHOTOS_MAX} photos.` }, { status: 400 });
  }
  for (const f of fichiers) {
    if (f.size > TAILLE_MAX_PHOTO) {
      return NextResponse.json({ ok: false, erreur: `Chaque photo doit faire moins de 5 Mo (${f.name}).` }, { status: 400 });
    }
    if (!TYPES_AUTORISES.includes(f.type)) {
      return NextResponse.json({ ok: false, erreur: `Format non supporté pour ${f.name} (JPEG, PNG ou WebP uniquement).` }, { status: 400 });
    }
  }

  // ── Insertion de la proposition ────────────────────────────────────────────
  const { data: proposition, error: eInsert } = await admin
    .from("propositions_bien")
    .insert({
      demande_id: demandeId,
      nom,
      prenom: champ(fd, "prenom"),
      telephone,
      email: champ(fd, "email"),
      profil_proposeur: profilProposeur,
      nom_agence: profilProposeur === "agence" ? nomAgence : null,
      type,
      ville,
      quartier: champ(fd, "quartier"),
      adresse_approx: champ(fd, "adresse_approx"),
      prix: fd.get("prix") ? Number(fd.get("prix")) : null,
      surface: fd.get("surface") ? Number(fd.get("surface")) : null,
      chambres: fd.get("chambres") ? Number(fd.get("chambres")) : null,
      salles_bain: fd.get("salles_bain") ? Number(fd.get("salles_bain")) : null,
      etage: champ(fd, "etage"),
      description: champ(fd, "description"),
      atouts: champ(fd, "atouts"),
      lien_annonce: champ(fd, "lien_annonce"),
      photos: null, // rempli après upload
    })
    .select("*")
    .single();

  if (eInsert || !proposition) {
    console.error("[demandes/proposer] insertion échouée :", eInsert);
    return NextResponse.json({ ok: false, erreur: "Impossible d'enregistrer la proposition." }, { status: 500 });
  }

  // ── Upload des photos (best-effort : une photo en échec n'annule pas
  //    la proposition déjà enregistrée) ──────────────────────────────────────
  const cheminsPhotos: string[] = [];
  for (let i = 0; i < fichiers.length; i++) {
    const f = fichiers[i];
    const extension = f.type === "image/png" ? "png" : f.type === "image/webp" ? "webp" : "jpg";
    const chemin = `${demandeId}/${proposition.id}/${i}.${extension}`;
    const { error: eUpload } = await admin.storage
      .from(BUCKET_PHOTOS)
      .upload(chemin, f, { contentType: f.type, upsert: true });
    if (eUpload) {
      console.error("[demandes/proposer] upload photo échoué :", eUpload);
      continue;
    }
    cheminsPhotos.push(chemin);
  }

  if (cheminsPhotos.length > 0) {
    await admin.from("propositions_bien").update({ photos: cheminsPhotos }).eq("id", proposition.id);
  }

  // ── Notification email détaillée à l'admin (best-effort) ──────────────────
  try {
    // URL pro hardcodée (même convention que detail/actions.ts pour les
    // liens back-office dans les emails de notification).
    const { sujet, texte, html } = construireEmailProposition({
      demande: demande as DemandeRecherche,
      proposition: { ...proposition, photos: cheminsPhotos } as PropositionBien,
      urlBackOffice: `https://pro.hoomy.ma/admin/demandes-recherche/${demandeId}`,
    });
    await envoyerEmail({ sujet, texte, html });
  } catch (e) {
    console.error("[demandes/proposer] notification email échouée :", e);
  }

  // ── Notification au créateur interne de la demande (agent ou admin) ───────
  // Même si un admin a déjà été notifié ci-dessus : si un AGENT a créé cette
  // demande pour son client (cree_par), il doit être prévenu lui aussi — lien
  // vers SA page (/pro, pas /admin, auquel il n'a pas accès).
  const creePar = (demande as DemandeRecherche).cree_par;
  if (creePar) {
    try {
      const { data: createur } = await admin
        .from("profils")
        .select("email_contact")
        .eq("id", creePar)
        .maybeSingle();
      if (createur?.email_contact) {
        const { sujet, texte, html } = construireEmailProposition({
          demande: demande as DemandeRecherche,
          proposition: { ...proposition, photos: cheminsPhotos } as PropositionBien,
          urlBackOffice: `https://pro.hoomy.ma/pro/demandes-recherche/${demandeId}`,
        });
        await envoyerEmail({ sujet, texte, html, destinataire: createur.email_contact });
      }
    } catch (e) {
      console.error("[demandes/proposer] notification email créateur échouée :", e);
    }
  }

  return NextResponse.json({ ok: true });
}
