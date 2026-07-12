// Brouillon de publication persisté dans IndexedDB — il survit à la redirection
// OAuth Google (l'onglet quitte le site, l'état React est perdu). IndexedDB
// accepte les File/Blob (structured clone), contrairement à localStorage :
// les photos non encore envoyées sont conservées telles quelles.
// Module client uniquement (indexedDB n'existe pas côté serveur).

const DB = "hoomy-publication";
const STORE = "brouillon";
const CLE = "courant";
const EXPIRATION_MS = 60 * 60 * 1000; // 1 h — au-delà, le brouillon est ignoré

export type BrouillonPublication = {
  donnees: unknown;
  etape: number;
  enregistreLe: number;
};

function ouvrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function sauvegarderBrouillon(donnees: unknown, etape: number): Promise<void> {
  const db = await ouvrir();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(
        { donnees, etape, enregistreLe: Date.now() } satisfies BrouillonPublication,
        CLE
      );
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function chargerBrouillon(): Promise<BrouillonPublication | null> {
  try {
    const db = await ouvrir();
    try {
      const brouillon = await new Promise<BrouillonPublication | null>((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).get(CLE);
        req.onsuccess = () => resolve((req.result as BrouillonPublication | undefined) ?? null);
        req.onerror = () => reject(req.error);
      });
      if (!brouillon) return null;
      if (Date.now() - brouillon.enregistreLe > EXPIRATION_MS) {
        void supprimerBrouillon();
        return null;
      }
      return brouillon;
    } finally {
      db.close();
    }
  } catch {
    return null; // IndexedDB indisponible (navigation privée stricte…) — sans gravité
  }
}

export async function supprimerBrouillon(): Promise<void> {
  try {
    const db = await ouvrir();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(CLE);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  } catch {
    // silencieux
  }
}
