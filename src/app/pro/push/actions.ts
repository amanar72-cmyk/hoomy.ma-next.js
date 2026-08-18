"use server";

import { createClient } from "@/lib/supabase/server";

export async function enregistrerAbonnementPush(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "user_id,endpoint" },
  );
  if (error) throw new Error(error.message);
}

export async function supprimerAbonnementPush(endpoint: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");

  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);
}

// ─── Applications mobiles (APNs / FCM) ───────────────────────────────────────
// Canal distinct du Web Push ci-dessus : les apps natives ne reçoivent pas
// d'endpoint VAPID mais un « device token » délivré par Apple ou par Google.
// Voir push_appareils.sql.

export async function enregistrerAppareilPush(appareil: {
  jeton: string;
  plateforme: "ios" | "android";
  modele?: string | null;
  versionApp?: string | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");

  // Apple fait tourner le jeton (réinstallation, restauration de sauvegarde,
  // mise à jour majeure d'iOS). L'app le réenregistre donc à chaque démarrage :
  // l'upsert évite d'accumuler des doublons, et rafraîchit vu_le au passage.
  const { error } = await supabase.from("push_appareils").upsert(
    {
      user_id: user.id,
      jeton: appareil.jeton,
      // Aiguille l'envoi : Apple (APNs) ou Google (FCM). Sans cette colonne,
      // chaque service recevrait les jetons de l'autre et les rejetterait.
      plateforme: appareil.plateforme,
      modele: appareil.modele ?? null,
      version_app: appareil.versionApp ?? null,
      vu_le: new Date().toISOString(),
    },
    { onConflict: "user_id,jeton" },
  );
  if (error) throw new Error(error.message);
}

export async function supprimerAppareilPush(jeton: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié.");

  await supabase
    .from("push_appareils")
    .delete()
    .eq("user_id", user.id)
    .eq("jeton", jeton);
}
