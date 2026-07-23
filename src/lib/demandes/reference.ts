// Génération de référence HD-XXXXX — même format que HM-XXXXX pour les biens
// (voir genererReference() dans src/app/admin/actions.ts), préfixe différent
// pour ne jamais confondre une demande de recherche avec un bien.

export function genererReferenceDemande(): string {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `HD-${num}`;
}
