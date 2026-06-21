// Filigrane canvas — gravé dans le fichier image avant upload (pas un overlay CSS)
// Reproduit le logo HOOMY depuis Logo.tsx (viewBox "0 0 60 66")

function chargerImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Impossible de charger : ${file.name}`)); };
    img.src = url;
  });
}

// Dessine le logo HOOMY (deux piliers + arche + traverse + texte) centré sur (cx, cy).
// largeurCanvas sert à calibrer la taille proportionnellement à l'image.
function dessinerLogoHoomy(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  largeurCanvas: number,
  opacite: number
): void {
  // Logo SVG : viewBox "0 0 60 66"
  // Piliers : x=16 et x=44, de y=24 à y=56  (largeur icône = 28 unités)
  // Arche   : M16,24 Q30,8 44,24            (pic à y=8)
  // Traverse: M16,40 L44,40
  // L'icône dessine de y=8 (pic arche) à y=56 (bas colonnes) = 48 unités de haut

  const iconW = largeurCanvas * 0.14;        // icône = 14 % de la largeur image
  const e = iconW / 28;                      // pixels par unité viewBox
  const sw = Math.max(1.5, 3.2 * e);        // épaisseur de trait proportionnelle
  const fontSize = Math.round(iconW * 0.60); // taille texte liée à l'icône

  // Centrage vertical de l'ensemble (arche peak → bas colonnes → gap → texte)
  const gapPx = 4 * e;
  const totalH = 48 * e + gapPx + fontSize;
  const markTop = cy - totalH / 2;   // y de départ (sommet de l'arche)
  const offX = cx - 30 * e;          // décalage x : centre de l'icône (x=30) aligné sur cx
  const offY = markTop - 8 * e;      // décalage y : y=8 du viewBox correspond à markTop

  ctx.save();
  ctx.globalAlpha = opacite;
  ctx.shadowColor = "rgba(0,0,0,0.60)";
  ctx.shadowBlur = Math.max(3, Math.min(Math.round(sw * 1.5), 36));
  ctx.lineCap = "round";
  ctx.lineWidth = sw;

  // ── Piliers blancs ──
  ctx.strokeStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.moveTo(offX + 16 * e, offY + 24 * e);
  ctx.lineTo(offX + 16 * e, offY + 56 * e);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(offX + 44 * e, offY + 24 * e);
  ctx.lineTo(offX + 44 * e, offY + 56 * e);
  ctx.stroke();

  // ── Arche or ──
  ctx.strokeStyle = "#D4AF37";
  ctx.beginPath();
  ctx.moveTo(offX + 16 * e, offY + 24 * e);
  ctx.quadraticCurveTo(offX + 30 * e, offY + 8 * e, offX + 44 * e, offY + 24 * e);
  ctx.stroke();

  // ── Traverse or ──
  ctx.beginPath();
  ctx.moveTo(offX + 16 * e, offY + 40 * e);
  ctx.lineTo(offX + 44 * e, offY + 40 * e);
  ctx.stroke();

  // ── Texte HOOMY.MA ──
  const textY = offY + 56 * e + gapPx;
  ctx.font = `${fontSize}px serif`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  const wHOOMY = ctx.measureText("HOOMY").width;
  const wMA = ctx.measureText(".MA").width;
  const textX = cx - (wHOOMY + wMA) / 2;

  ctx.fillStyle = "#FFFFFF";
  ctx.fillText("HOOMY", textX, textY);

  ctx.fillStyle = "#D4AF37";
  ctx.fillText(".MA", textX + wHOOMY, textY);

  ctx.restore();
}

// Point d'entrée public — appelé avant chaque upload Supabase.
// Retourne un Blob watermarqué (JPEG 0.92 par défaut, PNG/WebP si original).
// Lance une exception si quelque chose échoue ; l'appelant doit fallback sur le fichier original.
export async function appliquerWatermark(file: File): Promise<Blob> {
  const img = await chargerImage(file);

  // Résolution max pour éviter des canvas trop lourds
  const MAX_LARGEUR = 2000;
  let w = img.width;
  let h = img.height;
  if (w > MAX_LARGEUR) {
    h = Math.round(h * MAX_LARGEUR / w);
    w = MAX_LARGEUR;
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D non disponible dans ce navigateur");

  ctx.drawImage(img, 0, 0, w, h);
  dessinerLogoHoomy(ctx, w / 2, h / 2, w, 0.30);

  // Conserver le format original (PNG lossless, WebP, ou JPEG par défaut)
  const type =
    file.type === "image/png"
      ? "image/png"
      : file.type === "image/webp"
      ? "image/webp"
      : "image/jpeg";
  const qualite = type === "image/png" ? undefined : 0.92;

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Export canvas échoué"))),
      type,
      qualite
    );
  });
}
