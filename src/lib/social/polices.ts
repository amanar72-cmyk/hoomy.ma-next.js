import "server-only";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Mise à disposition des polices HOOMY pour librsvg (moteur SVG de sharp).
//
// POURQUOI CE MODULE EXISTE
// La première version pointait fontconfig directement sur public/fonts/ avec
// des chemins relatifs. En production, le rendu est sorti SANS AUCUN TEXTE —
// pas un repli sur une police générique : aucun glyphe du tout, librsvg
// n'ayant trouvé aucune police utilisable. Deux fragilités en cause :
//
//   1. le répertoire de travail — `public/fonts` résolu depuis process.cwd()
//      ne pointe nulle part si l'application n'est pas lancée depuis la
//      racine du projet ;
//   2. le cache — fontconfig doit ÉCRIRE son cache. En local il atterrissait
//      à la racine du dépôt (et non dans public/fonts) ; sur un hébergement
//      où le dossier applicatif est en lecture seule, l'échec d'écriture peut
//      laisser fontconfig sans police du tout.
//
// La parade : on cherche les .ttf parmi plusieurs emplacements candidats, on
// les COPIE dans un dossier temporaire toujours inscriptible, et on génère un
// fonts.conf à chemins ABSOLUS dont le cache vit aussi dans ce dossier.

export type EtatPolices = {
  ok: boolean;
  sourceTrouvee: string | null;
  dossierUtilise: string | null;
  fichiers: string[];
  fichierConf: string | null;
  candidatsTestes: string[];
  erreur: string | null;
};

const POLICES_REQUISES = ["Marcellus-Regular.ttf", "Outfit-Regular.ttf"];

let etat: EtatPolices | null = null;

/** Emplacements possibles des .ttf, du plus probable au plus improbable. */
function candidats(): string[] {
  const liste = [
    path.resolve(process.cwd(), "public/fonts"),
    // Sortie `standalone` de Next.js : public/ est copié à côté du serveur.
    path.resolve(process.cwd(), "../public/fonts"),
    path.resolve(process.cwd(), ".next/standalone/public/fonts"),
  ];
  return [...new Set(liste)];
}

function contientLesPolices(dossier: string): boolean {
  try {
    return POLICES_REQUISES.every((f) => fs.existsSync(path.join(dossier, f)));
  } catch {
    return false;
  }
}

/**
 * Prépare les polices et configure fontconfig. Idempotent : le travail n'est
 * fait qu'une fois par processus, les appels suivants renvoient l'état mémorisé.
 */
export function preparerPolices(): EtatPolices {
  if (etat) return etat;

  const testes = candidats();
  const source = testes.find(contientLesPolices) ?? null;

  if (!source) {
    etat = {
      ok: false, sourceTrouvee: null, dossierUtilise: null, fichiers: [],
      fichierConf: null, candidatsTestes: testes,
      erreur: "Aucun dossier candidat ne contient les .ttf — les polices n'ont pas été déployées.",
    };
    return etat;
  }

  try {
    // Dossier temporaire : inscriptible sur tout hébergement, contrairement au
    // dossier applicatif qui peut être monté en lecture seule.
    const destination = path.join(os.tmpdir(), "hoomy-polices");
    const cache = path.join(destination, "cache");
    fs.mkdirSync(cache, { recursive: true });

    const copies: string[] = [];
    for (const fichier of POLICES_REQUISES) {
      const cible = path.join(destination, fichier);
      fs.copyFileSync(path.join(source, fichier), cible);
      copies.push(cible);
    }

    // Chemins ABSOLUS : plus aucune dépendance au répertoire de travail.
    const conf = path.join(destination, "fonts.conf");
    fs.writeFileSync(
      conf,
      `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">
<fontconfig>
  <dir>${destination}</dir>
  <cachedir>${cache}</cachedir>
</fontconfig>
`
    );

    process.env.FONTCONFIG_FILE = conf;
    process.env.FONTCONFIG_PATH = destination;

    etat = {
      ok: true, sourceTrouvee: source, dossierUtilise: destination,
      fichiers: copies, fichierConf: conf, candidatsTestes: testes, erreur: null,
    };
  } catch (e) {
    etat = {
      ok: false, sourceTrouvee: source, dossierUtilise: null, fichiers: [],
      fichierConf: null, candidatsTestes: testes,
      erreur: e instanceof Error ? e.message : String(e),
    };
  }

  return etat;
}

/**
 * Vérifie que librsvg dessine RÉELLEMENT du texte : rend deux fois le même
 * SVG, avec la police voulue puis avec un nom inexistant. Deux résultats
 * identiques = la police n'est pas prise en compte (repli), un résultat quasi
 * vide = aucun glyphe dessiné.
 */
export async function verifierRenduTexte(): Promise<{
  policeAppliquee: boolean;
  octetsAvecPolice: number;
  octetsSansPolice: number;
}> {
  preparerPolices();
  const sharp = (await import("sharp")).default;

  const svg = (famille: string) =>
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="140">
         <rect width="640" height="140" fill="#0F4C3A"/>
         <text x="24" y="95" font-family="${famille}" font-size="62" fill="#D4AF37">HOOMY 123</text>
       </svg>`
    );

  const avec = await sharp(svg("Marcellus")).png().toBuffer();
  const sans = await sharp(svg("PoliceInexistanteXyz")).png().toBuffer();

  return {
    policeAppliquee: !avec.equals(sans),
    octetsAvecPolice: avec.length,
    octetsSansPolice: sans.length,
  };
}
