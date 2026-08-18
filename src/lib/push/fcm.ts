import "server-only";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// ─────────────────────────────────────────────────────────────────────────────
// Notifications push de l'application Android HOOMY PRO, via Firebase Cloud
// Messaging (API HTTP v1).
//
// Pendant du module apns.ts, avec les mêmes garanties : aucune exception ne
// remonte, une configuration absente ou une table non migrée passent en silence.
//
// Aucune dépendance externe. Contrairement à APNs, FCM parle HTTP/1.1 + JSON :
// `fetch` suffit. Seule la signature RS256 du jeton de service demande
// `node:crypto`.
// ─────────────────────────────────────────────────────────────────────────────

const PORTEE = "https://www.googleapis.com/auth/firebase.messaging";
const URL_JETON = "https://oauth2.googleapis.com/token";

type PayloadFcm = {
  titre: string;
  corps: string;
  url?: string;
};

type Appareil = {
  id: string;
  jeton: string;
};

// ─── Configuration ───────────────────────────────────────────────────────────

type ConfigFcm = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

function lireConfiguration(): ConfigFcm | null {
  const projectId = process.env.FCM_PROJECT_ID;
  const clientEmail = process.env.FCM_CLIENT_EMAIL;
  // Même précaution que pour la clé APNs : la clé PEM du compte de service est
  // multiligne et arrive presque toujours avec des « \n » littéraux.
  const privateKey = process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

/** Vrai si les identifiants du compte de service Firebase sont présents. */
export function fcmConfigure(): boolean {
  return lireConfiguration() !== null;
}

// ─── Jeton d'accès OAuth2 ────────────────────────────────────────────────────

let jetonCache: { valeur: string; expireLe: number } | null = null;

function base64url(donnees: Buffer | string): string {
  return Buffer.from(donnees)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Échange un JWT signé contre un jeton d'accès Google, valable 1 h.
 *
 * Renvoie null en cas d'échec : l'appelant renonce alors à l'envoi plutôt que
 * de propager une erreur.
 */
async function obtenirJetonAcces(config: ConfigFcm): Promise<string | null> {
  // 60 s de marge : un jeton qui expire pendant la requête serait refusé.
  if (jetonCache && Date.now() < jetonCache.expireLe - 60_000) {
    return jetonCache.valeur;
  }

  const maintenant = Math.floor(Date.now() / 1000);
  const entete = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const charge = base64url(
    JSON.stringify({
      iss: config.clientEmail,
      scope: PORTEE,
      aud: URL_JETON,
      iat: maintenant,
      exp: maintenant + 3600,
    }),
  );
  const aSigner = `${entete}.${charge}`;

  let assertion: string;
  try {
    // RS256 : signature PKCS#1 v1.5 classique — contrairement à APNs, pas de
    // subtilité d'encodage à prévoir ici.
    const signature = crypto
      .createSign("RSA-SHA256")
      .update(aSigner)
      .sign(config.privateKey);
    assertion = `${aSigner}.${base64url(signature)}`;
  } catch (err) {
    console.error(
      "[fcm] Clé de compte de service invalide :",
      err instanceof Error ? err.message : err,
    );
    return null;
  }

  try {
    const reponse = await fetch(URL_JETON, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!reponse.ok) {
      console.error("[fcm] Échec d'obtention du jeton :", await reponse.text());
      return null;
    }

    const donnees = (await reponse.json()) as { access_token?: string; expires_in?: number };
    if (!donnees.access_token) return null;

    jetonCache = {
      valeur: donnees.access_token,
      expireLe: Date.now() + (donnees.expires_in ?? 3600) * 1000,
    };
    return jetonCache.valeur;
  } catch (err) {
    console.error("[fcm] Jeton inaccessible :", err instanceof Error ? err.message : err);
    return null;
  }
}

// ─── Envoi ───────────────────────────────────────────────────────────────────

/** Codes FCM signifiant que le jeton ne sera plus jamais livrable. */
const CODES_JETON_MORT = new Set(["UNREGISTERED", "INVALID_ARGUMENT", "NOT_FOUND"]);

/**
 * Notifie tous les appareils Android enregistrés pour un utilisateur.
 */
export async function envoyerNotificationFcm(
  userId: string,
  payload: PayloadFcm,
): Promise<void> {
  const config = lireConfiguration();
  // Inutile d'interroger la base tant que Firebase n'est pas configuré.
  if (!config) return;

  const admin = createAdminClient();
  const { data: appareils, error } = await admin
    .from("push_appareils")
    .select("id, jeton")
    .eq("user_id", userId)
    .eq("plateforme", "android");

  if (error) {
    // 42P01 / PGRST205 = table absente, 42703 = colonne « plateforme » absente :
    // la migration push_appareils.sql n'a pas encore été passée. Le Web Push
    // continue de fonctionner, inutile d'alerter bruyamment.
    if (!["42P01", "PGRST205", "42703"].includes(error.code ?? "")) {
      console.error("[fcm] Erreur lecture push_appareils :", error.message);
    }
    return;
  }
  if (!appareils || appareils.length === 0) return;

  const jetonAcces = await obtenirJetonAcces(config);
  if (!jetonAcces) return;

  const url = `https://fcm.googleapis.com/v1/projects/${config.projectId}/messages:send`;
  const aPurger: string[] = [];

  // FCM v1 n'expose pas d'envoi groupé : un appel par appareil. Le volume reste
  // celui d'une équipe d'agents, la parallélisation suffit largement.
  await Promise.allSettled(
    (appareils as Appareil[]).map(async (appareil) => {
      const mort = await livrer(url, jetonAcces, appareil.jeton, payload);
      if (mort) aPurger.push(appareil.id);
    }),
  );

  if (aPurger.length > 0) {
    await admin.from("push_appareils").delete().in("id", aPurger);
  }
}

/** Renvoie true si le jeton doit être purgé. */
async function livrer(
  url: string,
  jetonAcces: string,
  jetonAppareil: string,
  payload: PayloadFcm,
): Promise<boolean> {
  const corps = {
    message: {
      token: jetonAppareil,
      notification: { title: payload.titre, body: payload.corps },
      // Champs libres, relus par le pont natif au moment du tap pour ouvrir
      // directement la bonne page du back-office. FCM impose des chaînes.
      data: { url: payload.url ?? "/pro" },
      android: {
        // « high » réveille l'appareil même en veille prolongée (Doze).
        priority: "HIGH",
        notification: {
          sound: "default",
          icon: "ic_notification",
          color: "#D4AF37",
          // Regroupe les notifications HOOMY plutôt que d'empiler des lignes.
          tag: "hoomy-pro",
        },
      },
    },
  };

  try {
    const reponse = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jetonAcces}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(corps),
      signal: AbortSignal.timeout(10_000),
    });

    if (reponse.ok) return false;

    const texte = await reponse.text();
    let code: string | undefined;
    try {
      code = (JSON.parse(texte) as { error?: { details?: { errorCode?: string }[]; status?: string } })
        .error?.details?.find((d) => d.errorCode)?.errorCode;
      if (!code) code = (JSON.parse(texte) as { error?: { status?: string } }).error?.status;
    } catch {
      /* réponse non-JSON : traitée comme une erreur transitoire */
    }

    // 404 : le jeton n'existe plus côté Google (app désinstallée).
    if (reponse.status === 404 || (code && CODES_JETON_MORT.has(code))) {
      return true;
    }

    console.error(
      `[fcm] Échec ${reponse.status} vers ${jetonAppareil.slice(0, 12)}… :`,
      code ?? texte.slice(0, 160),
    );
    return false;
  } catch (err) {
    // Incident réseau : surtout ne pas purger un jeton valide.
    console.error("[fcm] Envoi impossible :", err instanceof Error ? err.message : err);
    return false;
  }
}
