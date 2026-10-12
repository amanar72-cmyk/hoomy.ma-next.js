// Coordonnées HOOMY — source unique de vérité.
// Pour modifier le numéro ou l'email, changer uniquement ici.

export const CONTACT = {
  telephone:          "+212661306194",
  telephoneAffichage: "+212 661 30 61 94",
  telephoneLien:      "tel:+212661306194",

  whatsappNumero:     "212661306194",
  email:              "contact@hoomy.ma",
  emailLien:          "mailto:contact@hoomy.ma",
} as const;

// Message pré-rempli pour le lien WhatsApp
const MSG_WA = "Bonjour%20HOOMY%2C%20je%20vous%20contacte%20depuis%20votre%20site.";

export const LIEN_WHATSAPP = `https://wa.me/${CONTACT.whatsappNumero}?text=${MSG_WA}`;
