"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { estAppNative } from "@/lib/mobile/natif";

/**
 * Applique le style de la barre d'état système — et rien d'autre.
 *
 * Destiné aux écrans qui ne montent PAS PontNatif, en pratique la page de
 * connexion : celle-ci est servie hors des gabarits /pro et /admin, et n'est de
 * toute façon pas authentifiée, donc y brancher les notifications n'aurait pas
 * de sens (le jeton ne peut être rattaché à personne, et demander
 * l'autorisation avant même la connexion est une mauvaise pratique).
 *
 * Sans ce composant, la barre d'état garde le style hérité — des icônes
 * blanches, réglées pour le chrome #111 du back-office — et devient illisible
 * sur le fond clair du formulaire de connexion.
 *
 * Ne rend rien, et reste inerte hors de l'application native.
 */
export default function BarreEtatNative({ fond }: { fond: "clair" | "sombre" }) {
  useEffect(() => {
    if (!estAppNative()) return;

    // Intitulés trompeurs côté plugin : ils décrivent le FOND, pas le texte.
    // Style.Light = icônes sombres, à utiliser sur un fond clair.
    const style = fond === "clair" ? Style.Light : Style.Dark;

    StatusBar.setStyle({ style }).catch(() => {});

    if (Capacitor.getPlatform() === "android") {
      // Android 15+ dessine déjà sous la barre système : on l'assume, sans quoi
      // les marges de zone sûre seraient calculées sur une hauteur erronée.
      StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
    }
  }, [fond]);

  return null;
}
