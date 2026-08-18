import "server-only";
import http2 from "node:http2";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// ─────────────────────────────────────────────────────────────────────────────
// Notifications push de l'application iOS HOOMY PRO, via APNs.
//
// Aucune dépendance externe : Apple impose HTTP/2 — que `fetch`/undici ne parle
// pas — et un JWT signé en ES256. `node:http2` et `node:crypto` suffisent.
//
// Rien ici ne lève d'exception : une notification est une commodité. Ni des
// clés absentes, ni une table non migrée, ni une panne réseau ne doivent faire
// échouer l'action métier qui a déclenché l'envoi (création de lead, visite…).
// ─────────────────────────────────────────────────────────────────────────────

export type EnvironnementApns = "production" | "sandbox";

const HOTES: Record<EnvironnementApns, string> = {
  // TestFlight et App Store
  production: "https://api.push.apple.com",
  // Builds installés directement depuis Xcode
  sandbox: "https://api.sandbox.push.apple.com",
};

export type PayloadApns = {
  titre: string;
  corps: string;
  url?: string;
};

export type ResultatApns = {
  ok: boolean;
  /** Vrai si Apple déclare le jeton définitivement mort : à purger en base. */
  jetonInvalide?: boolean;
  raison?: string;
};

type Appareil = {
  id: string;
  jeton: string;
  environnement: string | null;
};

// ─── Configuration ───────────────────────────────────────────────────────────

type ConfigApns = {
  keyId: string;
  teamId: string;
  bundleId: string;
  privateKey: string;
};

function lireConfiguration(): ConfigApns | null {
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const bundleId = process.env.APNS_BUNDLE_ID ?? "ma.hoomy.pro";
  // La clé .p8 est multiligne. Passée par variable d'environnement, ses retours
  // à la ligne arrivent presque toujours échappés en « \n » littéraux : on les
  // restaure, faute de quoi crypto refuse la clé.
  const privateKey = process.env.APNS_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!keyId || !teamId || !privateKey) return null;
  return { keyId, teamId, bundleId, privateKey };
}

/**
 * Vrai si les clés APNs sont présentes.
 *
 * Tant que l'app iOS n'est pas publiée, ces variables sont absentes : c'est une
 * situation normale, pas une anomalie à signaler.
 */
export function apnsConfigure(): boolean {
  return lireConfiguration() !== null;
}

// ─── Jeton d'autorisation ────────────────────────────────────────────────────

let jetonCache: { valeur: string; genereLe: number } | null = null;

// Apple accepte un jeton pendant 1 h et refuse d'en régénérer plus d'un toutes
// les 20 min. 50 min : jamais expiré, jamais rejeté pour régénération abusive.
const DUREE_JETON_MS = 50 * 60 * 1000;

function base64url(donnees: Buffer | string): string {
  return Buffer.from(donnees)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function construireJetonAutorisation(config: ConfigApns): string {
  if (jetonCache && Date.now() - jetonCache.genereLe < DUREE_JETON_MS) {
    return jetonCache.valeur;
  }

  const entete = base64url(JSON.stringify({ alg: "ES256", kid: config.keyId }));
  const charge = base64url(
    JSON.stringify({ iss: config.teamId, iat: Math.floor(Date.now() / 1000) }),
  );
  const aSigner = `${entete}.${charge}`;

  // dsaEncoding « ieee-p1363 » est indispensable : un JWT ES256 attend la
  // signature brute R||S. Par défaut Node produit du DER, qu'Apple rejette avec
  // InvalidProviderToken — panne silencieuse et pénible à diagnostiquer.
  const signature = crypto
    .createSign("SHA256")
    .update(aSigner)
    .sign({ key: config.privateKey, dsaEncoding: "ieee-p1363" });

  const valeur = `${aSigner}.${base64url(signature)}`;
  jetonCache = { valeur, genereLe: Date.now() };
  return valeur;
}

// ─── API publique ────────────────────────────────────────────────────────────

/** Motifs APNs signifiant que le jeton ne sera plus jamais livrable. */
const RAISONS_JETON_MORT = new Set(["Unregistered", "DeviceTokenNotForTopic"]);

const DELAI_MAX_MS = 10_000;

/**
 * Notifie tous les appareils iOS enregistrés pour un utilisateur.
 */
export async function envoyerNotificationApns(
  userId: string,
  payload: PayloadApns,
): Promise<void> {
  const config = lireConfiguration();
  // Inutile d'interroger la base tant que l'app iOS n'est pas configurée.
  if (!config) return;

  const admin = createAdminClient();
  const { data: appareils, error } = await admin
    .from("push_appareils")
    .select("id, jeton, environnement")
    .eq("user_id", userId)
    .eq("plateforme", "ios");

  if (error) {
    // 42P01 (Postgres) / PGRST205 (PostgREST) = table absente : la migration
    // push_appareils.sql n'a pas encore été passée sur cette base. Le Web
    // Push continue de fonctionner, inutile d'alerter bruyamment.
    // 42703 = colonne « plateforme » absente : migration passée dans une
    // version antérieure, avant l'ajout d'Android.
    if (!["42P01", "PGRST205", "42703"].includes(error.code ?? "")) {
      console.error("[apns] Erreur lecture push_appareils :", error.message);
    }
    return;
  }
  if (!appareils || appareils.length === 0) return;

  const corps = construireCorps(payload);

  // APNs expose deux serveurs aux jetons non interchangeables : on groupe les
  // appareils par environnement pour n'ouvrir qu'une session par serveur.
  const parEnvironnement = new Map<EnvironnementApns, Appareil[]>();
  for (const appareil of appareils as Appareil[]) {
    const env: EnvironnementApns =
      appareil.environnement === "sandbox" ? "sandbox" : "production";
    const lot = parEnvironnement.get(env) ?? [];
    lot.push(appareil);
    parEnvironnement.set(env, lot);
  }

  await Promise.allSettled(
    [...parEnvironnement.entries()].map(([environnement, lot]) =>
      traiterLot(lot, environnement, corps, config, admin),
    ),
  );
}

function construireCorps(payload: PayloadApns): string {
  return JSON.stringify({
    aps: {
      alert: { title: payload.titre, body: payload.corps },
      sound: "default",
      // Pastille à 1 ; l'AppDelegate la remet à zéro dès l'ouverture de l'app.
      badge: 1,
    },
    // Hors « aps » : relu par le pont natif au moment du tap, pour ouvrir
    // directement la bonne page du back-office.
    url: payload.url ?? "/pro",
  });
}

async function traiterLot(
  lot: Appareil[],
  environnement: EnvironnementApns,
  corps: string,
  config: ConfigApns,
  admin: ReturnType<typeof createAdminClient>,
): Promise<void> {
  const resultats = await envoyerLot(
    lot.map((a) => a.jeton),
    environnement,
    corps,
    config,
  );

  // BadDeviceToken ne signifie pas « jeton mort » : le plus souvent le jeton est
  // valide mais rattaché à l'AUTRE serveur (build Xcode contre production, ou
  // l'inverse). On retente en face avant de conclure — sans quoi on purgerait
  // des appareils parfaitement fonctionnels.
  const aRetenter = lot.filter((_, i) => resultats[i].raison === "BadDeviceToken");
  const aPurger = lot
    .filter((_, i) => resultats[i].jetonInvalide)
    .map((a) => a.id);

  lot.forEach((appareil, i) => {
    const r = resultats[i];
    if (r.ok || r.jetonInvalide || r.raison === "BadDeviceToken") return;
    console.error(
      `[apns] Échec (${environnement}) vers ${appareil.jeton.slice(0, 12)}… :`,
      r.raison ?? "raison inconnue",
    );
  });

  if (aRetenter.length > 0) {
    const enFace: EnvironnementApns =
      environnement === "production" ? "sandbox" : "production";
    const secondEssai = await envoyerLot(
      aRetenter.map((a) => a.jeton),
      enFace,
      corps,
      config,
    );

    const aCorriger: string[] = [];
    aRetenter.forEach((appareil, i) => {
      if (secondEssai[i].ok) {
        aCorriger.push(appareil.id);
      } else {
        // Rejeté des deux côtés : le jeton est réellement hors service.
        aPurger.push(appareil.id);
      }
    });

    // On mémorise le bon serveur : les envois suivants partiront du premier coup.
    if (aCorriger.length > 0) {
      await admin
        .from("push_appareils")
        .update({ environnement: enFace })
        .in("id", aCorriger);
    }
  }

  if (aPurger.length > 0) {
    await admin.from("push_appareils").delete().in("id", aPurger);
  }
}

// ─── Couche transport exposée ────────────────────────────────────────────────

/**
 * Envoie une notification à un lot de jetons partageant le même environnement.
 *
 * Variante « bas niveau » de envoyerNotificationApns : ne touche pas à la base.
 * Utile quand l'appelant gère lui-même la lecture des appareils et la purge des
 * jetons morts (il dispose alors du détail par jeton, dans l'ordre d'entrée).
 */
export async function envoyerApns(
  jetons: string[],
  environnement: EnvironnementApns,
  payload: PayloadApns,
): Promise<ResultatApns[]> {
  const config = lireConfiguration();
  if (!config) {
    return jetons.map(() => ({ ok: false, raison: "APNs non configuré" }));
  }
  if (jetons.length === 0) return [];

  return envoyerLot(jetons, environnement, construireCorps(payload), config);
}

// ─── Transport ───────────────────────────────────────────────────────────────

/**
 * Envoie à un lot de jetons partageant le même environnement, multiplexés sur
 * UNE session HTTP/2 — le mode d'emploi recommandé par Apple ; ouvrir une
 * connexion TLS par notification serait bien plus coûteux.
 *
 * Le tableau renvoyé suit exactement l'ordre de `jetons`.
 */
function envoyerLot(
  jetons: string[],
  environnement: EnvironnementApns,
  corps: string,
  config: ConfigApns,
): Promise<ResultatApns[]> {
  return new Promise((resoudre) => {
    const session = http2.connect(HOTES[environnement]);
    const resultats: (ResultatApns | null)[] = new Array(jetons.length).fill(null);
    let restants = jetons.length;
    let termine = false;

    const autorisation = `bearer ${construireJetonAutorisation(config)}`;

    const finir = () => {
      if (termine) return;
      termine = true;
      clearTimeout(minuteur);
      session.close();
      // Une requête restée sans réponse est signalée telle quelle, jamais comme
      // un jeton invalide : on ne purge pas un appareil sur un incident réseau.
      resoudre(
        resultats.map((r) => r ?? { ok: false, raison: "Réponse APNs manquante" }),
      );
    };

    const minuteur = setTimeout(() => {
      session.destroy();
      finir();
    }, DELAI_MAX_MS);

    session.on("error", (err) => {
      for (let i = 0; i < resultats.length; i++) {
        if (!resultats[i]) resultats[i] = { ok: false, raison: err.message };
      }
      finir();
    });

    jetons.forEach((jeton, indice) => {
      const requete = session.request({
        ":method": "POST",
        ":path": `/3/device/${jeton}`,
        authorization: autorisation,
        "apns-topic": config.bundleId,
        // « alert » : notification visible. Obligatoire depuis iOS 13.
        "apns-push-type": "alert",
        // 10 = livraison immédiate, réservée aux notifications visibles.
        "apns-priority": "10",
        "content-type": "application/json",
      });

      let statut = 0;
      let charge = "";

      const conclure = (resultat: ResultatApns) => {
        if (resultats[indice]) return;
        resultats[indice] = resultat;
        if (--restants === 0) finir();
      };

      requete.on("response", (entetes) => {
        statut = Number(entetes[":status"]) || 0;
      });
      requete.on("data", (morceau) => {
        charge += morceau;
      });
      requete.on("error", (err) => conclure({ ok: false, raison: err.message }));
      requete.on("end", () => {
        if (statut === 200) {
          conclure({ ok: true });
          return;
        }

        let raison: string | undefined;
        if (charge) {
          try {
            raison = (JSON.parse(charge) as { reason?: string }).reason;
          } catch {
            raison = charge.slice(0, 120);
          }
        }

        // 410 Gone : Apple a définitivement révoqué le jeton (app désinstallée).
        const mort = statut === 410 || (!!raison && RAISONS_JETON_MORT.has(raison));
        conclure({
          ok: false,
          jetonInvalide: mort || undefined,
          raison: raison ?? `HTTP ${statut}`,
        });
      });

      requete.end(corps);
    });
  });
}
