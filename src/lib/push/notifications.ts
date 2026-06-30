import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

// Initialisation différée — setVapidDetails lance une exception si les clés sont
// absentes. En l'appelant au niveau module, tout import de ce fichier (même indirect
// via admin/actions.ts) ferait crasher les pages en 500 si les env vars ne sont pas
// définies sur le serveur. L'init lazy résout ça.
let vapidPret = false;
function initialiserVapid() {
  if (vapidPret) return;
  const subject    = process.env.VAPID_SUBJECT;
  const publicKey  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) {
    throw new Error("Variables VAPID manquantes (VAPID_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidPret = true;
}

export type PayloadPush = {
  titre: string;
  corps: string;
  url?: string;
};

export async function envoyerNotificationPush(
  userId: string,
  payload: PayloadPush,
): Promise<void> {
  try {
    initialiserVapid();
  } catch (err) {
    console.error("[push] Configuration VAPID invalide :", err instanceof Error ? err.message : err);
    return;
  }

  const admin = createAdminClient();
  const { data: subs, error: erreurLecture } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (erreurLecture) {
    console.error("[push] Erreur lecture push_subscriptions :", erreurLecture.message);
    return;
  }
  if (!subs || subs.length === 0) return;

  const message = JSON.stringify(payload);

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          message,
        );
      } catch (err: unknown) {
        const statusCode =
          typeof err === "object" && err !== null && "statusCode" in err
            ? (err as { statusCode: number }).statusCode
            : undefined;
        if (statusCode === 410) {
          // Abonnement expiré côté navigateur — on nettoie, pas une erreur à signaler.
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          console.error(
            `[push] Échec d'envoi vers ${sub.endpoint.slice(0, 60)}... :`,
            err instanceof Error ? err.message : err,
          );
        }
      }
    }),
  );
}

export async function envoyerNotificationAuxAdmins(payload: PayloadPush): Promise<void> {
  try {
    initialiserVapid();
  } catch (err) {
    console.error("[push] Configuration VAPID invalide :", err instanceof Error ? err.message : err);
    return;
  }

  const admin = createAdminClient();
  const { data: admins, error: erreurLecture } = await admin
    .from("profils")
    .select("id")
    .eq("role", "admin");

  if (erreurLecture) {
    console.error("[push] Erreur lecture profils admins :", erreurLecture.message);
    return;
  }
  if (!admins || admins.length === 0) return;

  await Promise.allSettled(admins.map((a) => envoyerNotificationPush(a.id, payload)));
}
