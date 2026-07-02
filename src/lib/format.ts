// Formatage des prix — source unique de vérité pour tout le site.
//
// Espace insécable U+00A0 imposée entre les milliers et avant « DH » :
// Intl.NumberFormat("fr-FR") produit selon la version ICU une espace fine
// insécable U+202F que certaines polices (notamment celles de Satori pour
// la carte OG /api/og) ne rendent pas — les prix apparaissent alors collés.

/** « 1 500 000 » — montant seul, sans devise. */
export function formaterMontant(prix: number): string {
  return new Intl.NumberFormat("fr-FR")
    .format(prix)
    .replace(/[   ]/g, " ");
}

/** « 1 500 000 DH » (vente) ou « 5 000 DH/mois » (location). */
export function formaterPrix(prix: number, transaction: string): string {
  const suffixe = transaction === "location" ? " DH/mois" : " DH";
  return `${formaterMontant(prix)}${suffixe}`;
}
