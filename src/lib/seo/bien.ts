import type { BienPublic } from "@/lib/types";
import { formaterPrix } from "@/lib/format";
import { urlPubliqueBien } from "@/lib/biens/lienPublic";

// Éléments SEO partagés par les deux fiches (/acheter/[slug] et /louer/[slug]).
//
// Un seul endroit volontairement : la règle d'URL publique vivait en double
// entre le back-office et le module social, et cette duplication avait fini
// par produire des liens cassés. Même précaution ici.

const LONGUEUR_META = 155;

/**
 * Meta description de la fiche.
 *
 * Priorité au texte RÉEL saisi pour le bien : c'est le seul contenu qui
 * distingue une annonce d'une autre dans les résultats de recherche. La
 * formule « {titre} à {vendre|louer} à {ville}. Prix : … » ne sert que de
 * repli — elle est identique en structure sur toutes les fiches.
 *
 * La coupe se fait sur une frontière de mot : « Bel appartement de 68 m² et
 * box de 9 m² situé dans le quartier ca… » se lit, « …quartier calme de Til »
 * non.
 */
export function descriptionMeta(bien: BienPublic): string {
  const brute = (bien.description ?? "").replace(/\s+/g, " ").trim();

  if (brute) {
    if (brute.length <= LONGUEUR_META) return brute;
    const coupe = brute.slice(0, LONGUEUR_META);
    const dernierEspace = coupe.lastIndexOf(" ");
    // Un texte sans espace sur 155 caractères n'existe pas en pratique, mais
    // le repli évite une chaîne vide si cela arrivait.
    const mots = dernierEspace > 60 ? coupe.slice(0, dernierEspace) : coupe;
    return `${mots.replace(/[\s,;:.!?—-]+$/, "")}…`;
  }

  const location = bien.transaction === "location";
  return `${bien.titre} à ${location ? "louer" : "vendre"} à ${bien.ville}. ${
    location ? "Loyer" : "Prix"
  } : ${formaterPrix(Number(bien.prix), location ? "location" : "vente")}.`;
}

/** Sous-type schema.org le plus précis disponible pour le type de bien. */
function typeLieu(type: string): string {
  const t = (type ?? "").toLowerCase();
  if (t === "appartement") return "Apartment";
  if (t === "villa" || t === "maison" || t === "riad") return "House";
  if (t === "terrain") return "Place";
  return "Accommodation"; // bureau, local commercial, défaut
}

/**
 * JSON-LD RealEstateListing de la fiche.
 *
 * RÈGLE : aucune propriété inventée. Un champ absent en base est OMIS, jamais
 * rempli d'une valeur par défaut — une surface ou un nombre de pièces
 * fantaisiste dans des données structurées est une déclaration au moteur de
 * recherche, pas un détail d'affichage.
 *
 * MODÉLISATION : les caractéristiques physiques (pièces, surface, adresse)
 * appartiennent à un lieu, pas à une annonce. Elles sont donc portées par le
 * nœud `about`, typé selon le bien, tandis que RealEstateListing garde ce qui
 * relève de l'annonce elle-même (url, date de publication, offre).
 *
 * CONFIDENTIALITÉ : addressLocality (la ville) et le pays uniquement. Jamais
 * de rue ni de coordonnées — le site ne publie déjà qu'une position floutée.
 */
export function jsonLdBien(bien: BienPublic): Record<string, unknown> {
  const url = urlPubliqueBien(bien);
  const location = bien.transaction === "location";

  const lieu: Record<string, unknown> = {
    "@type": typeLieu(bien.type),
    name: bien.titre,
    address: {
      "@type": "PostalAddress",
      addressLocality: bien.ville,
      addressCountry: "MA",
    },
  };

  if (Number(bien.chambres) > 0) lieu.numberOfRooms = Number(bien.chambres);
  if (Number(bien.surface) > 0) {
    lieu.floorSize = {
      "@type": "QuantitativeValue",
      value: Number(bien.surface),
      unitCode: "MTK", // mètre carré (code UN/CEFACT)
    };
  }

  const photos = (bien.photos ?? []).filter(
    (p): p is string => typeof p === "string" && /^https?:\/\//.test(p)
  );

  const listing: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    url,
    name: bien.titre,
    about: lieu,
  };

  const texte = (bien.description ?? "").trim();
  if (texte) listing.description = texte;
  if (photos.length > 0) listing.image = photos;
  if (bien.cree_le) listing.datePosted = new Date(bien.cree_le).toISOString();

  if (Number(bien.prix) > 0) {
    listing.offers = {
      "@type": "Offer",
      price: Number(bien.prix),
      priceCurrency: "MAD",
      // Les fiches ne sont servies publiquement qu'en statut « finalise » —
      // un bien encore en ligne est donc disponible.
      availability: "https://schema.org/InStock",
      businessFunction: location
        ? "http://purl.org/goodrelations/v1#LeaseOut"
        : "http://purl.org/goodrelations/v1#Sell",
      url,
    };
  }

  return listing;
}

/** BreadcrumbList d'une fiche : Accueil › Acheter|Louer › Ville › Titre. */
export function jsonLdFilAriane(bien: BienPublic): Record<string, unknown> {
  const location = bien.transaction === "location";
  const segment = location ? "louer" : "acheter";
  const libelle = location ? "Louer" : "Acheter";

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://hoomy.ma/" },
      { "@type": "ListItem", position: 2, name: libelle, item: `https://hoomy.ma/${segment}` },
      {
        "@type": "ListItem",
        position: 3,
        name: bien.ville,
        item: `https://hoomy.ma/${segment}?ville=${encodeURIComponent(bien.ville)}`,
      },
      { "@type": "ListItem", position: 4, name: bien.titre },
    ],
  };
}

/** BreadcrumbList d'une page de liste : Accueil › Acheter|Louer. */
export function jsonLdFilArianeListe(transaction: "vente" | "location"): Record<string, unknown> {
  const location = transaction === "location";
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://hoomy.ma/" },
      {
        "@type": "ListItem",
        position: 2,
        name: location ? "Louer" : "Acheter",
        item: `https://hoomy.ma/${location ? "louer" : "acheter"}`,
      },
    ],
  };
}
