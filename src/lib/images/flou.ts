// Flou irréversible côté client — appliqué avant l'upload d'un bien non encore validé.
// Contrairement à un flou CSS (qui laisse l'image nette circuler sur le réseau), la perte
// d'information a lieu ICI, dans les pixels eux-mêmes (réduction drastique puis ré-agrandissement),
// avant même que le fichier ne quitte le navigateur. Le fichier net n'est jamais transmis au public :
// il part vers le bucket privé, tandis que SEULE cette version floutée part vers le bucket public.

function chargerImageDepuisBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Impossible de charger l'image pour le floutage")); };
    img.src = url;
  });
}

// Point d'entrée public — prend la version déjà watermarquée (ou tout Blob image)
// et retourne une version floutée, de format identique.
export async function appliquerFlou(source: Blob): Promise<Blob> {
  const img = await chargerImageDepuisBlob(source);

  const w = img.width;
  const h = img.height;

  // Étape 1 — réduction drastique : détruit réellement les détails fins
  // (texture, visages, plaques, etc.) — irrécupérables ensuite.
  const FACTEUR_REDUCTION = 0.07;
  const wPetit = Math.max(8, Math.round(w * FACTEUR_REDUCTION));
  const hPetit = Math.max(8, Math.round(h * FACTEUR_REDUCTION));

  const canvasPetit = document.createElement("canvas");
  canvasPetit.width = wPetit;
  canvasPetit.height = hPetit;
  const ctxPetit = canvasPetit.getContext("2d");
  if (!ctxPetit) throw new Error("Canvas 2D non disponible dans ce navigateur");
  ctxPetit.drawImage(img, 0, 0, wPetit, hPetit);

  // Étape 2 — ré-agrandissement + flou gaussien pour lisser le pixelisé
  // résiduel en un rendu propre (et non pas pixelisé façon Minecraft).
  const canvasFinal = document.createElement("canvas");
  canvasFinal.width = w;
  canvasFinal.height = h;
  const ctxFinal = canvasFinal.getContext("2d");
  if (!ctxFinal) throw new Error("Canvas 2D non disponible dans ce navigateur");
  ctxFinal.filter = `blur(${Math.max(8, Math.round(w * 0.012))}px)`;
  ctxFinal.drawImage(canvasPetit, 0, 0, w, h);

  // Bandeau "EN COURS DE TRAITEMENT" — rappel visuel, en plus du badge UI
  ctxFinal.filter = "none";
  const bandeauH = Math.max(36, Math.round(h * 0.08));
  ctxFinal.fillStyle = "rgba(15,76,58,0.82)";
  ctxFinal.fillRect(0, h / 2 - bandeauH / 2, w, bandeauH);
  ctxFinal.fillStyle = "#D4AF37";
  ctxFinal.textAlign = "center";
  ctxFinal.textBaseline = "middle";
  ctxFinal.font = `${Math.round(bandeauH * 0.42)}px sans-serif`;
  ctxFinal.fillText("EN COURS DE TRAITEMENT", w / 2, h / 2);

  const type = source.type === "image/png" ? "image/png" : "image/jpeg";
  const qualite = type === "image/png" ? undefined : 0.85;

  return new Promise<Blob>((resolve, reject) => {
    canvasFinal.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Export canvas (flou) échoué"))),
      type,
      qualite
    );
  });
}
