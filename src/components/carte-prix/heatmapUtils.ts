// Stops du dégradé heatmap HOOMY
const STOPS_HEX = ["#2E6B5E", "#7FB28A", "#C9D17A", "#F2D06B", "#F0A85A", "#C25B4E"];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}

// Retourne une couleur CSS rgb() interpolée linéairement sur les 6 stops.
export function couleurHeatmap(valeur: number, min: number, max: number): string {
  if (max === min) return STOPS_HEX[2];
  const t = Math.max(0, Math.min(1, (valeur - min) / (max - min)));
  const segCount = STOPS_HEX.length - 1;
  const idx = Math.min(Math.floor(t * segCount), segCount - 1);
  const tSeg = t * segCount - idx;
  const [r1, g1, b1] = hexToRgb(STOPS_HEX[idx]);
  const [r2, g2, b2] = hexToRgb(STOPS_HEX[idx + 1]);
  return `rgb(${lerp(r1, r2, tSeg)}, ${lerp(g1, g2, tSeg)}, ${lerp(b1, b2, tSeg)})`;
}
