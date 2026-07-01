/**
 * Normalise un numéro marocain vers +212 et génère les liens tel:/wa.me.
 * Gère : 06…, 07…, +212…, 00212…, avec ou sans espaces/tirets.
 */
export function formatPhoneMaroc(telephone: string | null | undefined): {
  affichage: string | null;
  lienTel: string | null;
  numeroWA: string | null; // ex: 212612345678 (sans +, pour wa.me)
} {
  if (!telephone) return { affichage: null, lienTel: null, numeroWA: null };

  let chiffres = telephone.replace(/[\s\-.()]/g, "");

  if (chiffres.startsWith("+212")) {
    // déjà normalisé
  } else if (chiffres.startsWith("00212")) {
    chiffres = "+212" + chiffres.slice(5);
  } else if (chiffres.startsWith("212") && chiffres.length >= 12) {
    chiffres = "+" + chiffres;
  } else if (chiffres.startsWith("0")) {
    chiffres = "+212" + chiffres.slice(1);
  } else {
    chiffres = "+212" + chiffres;
  }

  const local = chiffres.slice(4); // ex: 612345678
  const affichage =
    local.length === 9
      ? `+212 ${local[0]}${local[1]}${local[2]} ${local[3]}${local[4]} ${local[5]}${local[6]} ${local[7]}${local[8]}`
      : chiffres;

  return {
    affichage,
    lienTel: chiffres,                    // +212612345678
    numeroWA: chiffres.replace("+", ""),  // 212612345678
  };
}
