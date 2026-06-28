import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export type PayloadPush = {
  titre: string;
  corps: string;
  url?: string;
};

export async function envoyerNotificationPush(
  userId: string,
  payload: PayloadPush,
): Promise<void> {
  const admin = createAdminClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

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
        if (
          typeof err === "object" &&
          err !== null &&
          "statusCode" in err &&
          (err as { statusCode: number }).statusCode === 410
        ) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }),
  );
}

export async function envoyerNotificationAuxAdmins(payload: PayloadPush): Promise<void> {
  const admin = createAdminClient();
  const { data: admins } = await admin
    .from("profils")
    .select("id")
    .eq("role", "admin");

  if (!admins || admins.length === 0) return;

  await Promise.allSettled(admins.map((a) => envoyerNotificationPush(a.id, payload)));
}
