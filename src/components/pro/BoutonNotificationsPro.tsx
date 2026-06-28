"use client";

import { useState, useEffect } from "react";
import { enregistrerAbonnementPush, supprimerAbonnementPush } from "@/app/pro/push/actions";

type Etat = "chargement" | "actif" | "inactif" | "refuse" | "non_supporte";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const bytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) bytes[i] = rawData.charCodeAt(i);
  return bytes;
}

export default function BoutonNotificationsPro() {
  const [etat, setEtat] = useState<Etat>("chargement");
  const [endpoint, setEndpoint] = useState<string | null>(null);

  useEffect(() => {
    if (
      !("Notification" in window) ||
      !("PushManager" in window) ||
      !("serviceWorker" in navigator)
    ) {
      setEtat("non_supporte");
      return;
    }
    if (Notification.permission === "denied") {
      setEtat("refuse");
      return;
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (sub) {
          setEndpoint(sub.endpoint);
          setEtat("actif");
        } else {
          setEtat("inactif");
        }
      })
      .catch(() => setEtat("inactif"));
  }, []);

  async function activer() {
    setEtat("chargement");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setEtat("refuse");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error("Clé VAPID manquante.");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      const json = sub.toJSON() as {
        endpoint: string;
        keys?: { p256dh: string; auth: string };
      };
      if (!json.keys?.p256dh || !json.keys?.auth) throw new Error("Clés push manquantes.");
      await enregistrerAbonnementPush({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      });
      setEndpoint(json.endpoint);
      setEtat("actif");
    } catch {
      setEtat("inactif");
    }
  }

  async function desactiver() {
    if (!endpoint) return;
    setEtat("chargement");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      await supprimerAbonnementPush(endpoint);
      setEndpoint(null);
      setEtat("inactif");
    } catch {
      setEtat("inactif");
    }
  }

  if (etat === "non_supporte") return null;

  const actif = etat === "actif";
  const enCours = etat === "chargement";
  const refuse = etat === "refuse";

  const titre = actif
    ? "Notifications activées — cliquer pour désactiver"
    : refuse
      ? "Notifications bloquées par le navigateur"
      : "Activer les notifications push";

  return (
    <button
      type="button"
      title={titre}
      disabled={enCours || refuse}
      onClick={actif ? desactiver : activer}
      className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: actif ? "#FFF9E6" : "transparent",
        border: "none",
      }}
    >
      {enCours ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#999"
          strokeWidth="2"
          className="animate-spin"
        >
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={actif ? "#D4AF37" : "none"}
          stroke={actif ? "#D4AF37" : "#888"}
          strokeWidth="1.8"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      )}
    </button>
  );
}
