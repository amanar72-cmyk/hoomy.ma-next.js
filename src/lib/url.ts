// Construit le chemin d'un bien : /acheter/... ou /louer/...
export function cheminBien(bien: { transaction: string; slug: string | null; id: string }) {
  const action = bien.transaction === 'location' ? 'louer' : 'acheter';
  const fin = bien.slug ?? bien.id;
  return `/${action}/${fin}`;
}

// Récupère la référence (HM-1234) à partir du slug, pour retrouver le bien
export function refDepuisSlug(slug: string) {
  const parts = slug.split('-');
  // la référence est les deux derniers morceaux : "hm" + "1001" -> "HM-1001"
  const ref = parts.slice(-2).join('-');
  return ref.toUpperCase();
}