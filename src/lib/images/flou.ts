// Floutage des photos DÉSACTIVÉ (décision produit, juillet 2026) : les photos
// partent désormais nettes vers le bucket public dès l'upload, sans flou ni
// bandeau « EN COURS DE TRAITEMENT », sans attendre la validation.
//
// On conserve la signature appelée par les 4 formulaires d'upload
// (WizardPublication, FormulaireEditionBienAgent, FormulaireEditionBien,
// création agent) ainsi que le double envoi bucket public/privé et la
// promotion à la vérification — devenus sans effet visuel mais inoffensifs.
// L'implémentation du flou irréversible reste dans l'historique git de ce
// fichier si le besoin revient.

export async function appliquerFlou(source: Blob): Promise<Blob> {
  return source;
}
