// Documents rattachés à une fiche bien (table documents_fiche, bucket privé
// "documents-clients"). Trois pièces obligatoires avant l'envoi au back-office.
// Helpers côté serveur : le client Supabase (SSR, authentifié) est passé en
// paramètre — la RLS de la table s'applique (agent → ses fiches uniquement).

import type { SupabaseClient } from "@supabase/supabase-js";

export const TYPES_DOCUMENTS_FICHE = ["mandat", "cin", "certificat_propriete"] as const;
export type TypeDocumentFiche = (typeof TYPES_DOCUMENTS_FICHE)[number];

export type DocumentFiche = {
  id: string;
  type_document: string;
  statut: string;
  storage_path: string;
  cree_le: string;
  signe_le: string | null;
};

export const MESSAGE_DOCUMENTS_MANQUANTS =
  "Déposez les 3 documents (mandat, CIN, certificat de propriété) avant d'envoyer au back-office.";

/** Documents d'une fiche — le plus récent par type (re-dépôts possibles). */
export async function documentsParType(
  supabase: SupabaseClient,
  bienId: string
): Promise<DocumentFiche[]> {
  const { data } = await supabase
    .from("documents_fiche")
    .select("id, type_document, statut, storage_path, cree_le, signe_le")
    .eq("fiche_id", bienId)
    .order("cree_le", { ascending: false });

  const parType = new Map<string, DocumentFiche>();
  for (const d of (data ?? []) as DocumentFiche[]) {
    if (!parType.has(d.type_document)) parType.set(d.type_document, d);
  }
  return [...parType.values()];
}

/** true si les 3 types de documents sont présents pour cette fiche. */
export async function dossierComplet(supabase: SupabaseClient, bienId: string): Promise<boolean> {
  const docs = await documentsParType(supabase, bienId);
  const types = new Set(docs.map((d) => d.type_document));
  return TYPES_DOCUMENTS_FICHE.every((t) => types.has(t));
}

/** Nombre de types de documents requis présents par fiche (0 à 3) — 1 seule requête. */
export async function nbDocsParFiche(
  supabase: SupabaseClient,
  bienIds: string[]
): Promise<Map<string, number>> {
  const comptages = new Map<string, number>();
  if (bienIds.length === 0) return comptages;
  const { data } = await supabase
    .from("documents_fiche")
    .select("fiche_id, type_document")
    .in("fiche_id", bienIds);

  const typesParFiche = new Map<string, Set<string>>();
  for (const d of (data ?? []) as { fiche_id: string; type_document: string }[]) {
    if (!(TYPES_DOCUMENTS_FICHE as readonly string[]).includes(d.type_document)) continue;
    if (!typesParFiche.has(d.fiche_id)) typesParFiche.set(d.fiche_id, new Set());
    typesParFiche.get(d.fiche_id)!.add(d.type_document);
  }
  for (const [ficheId, types] of typesParFiche) comptages.set(ficheId, types.size);
  return comptages;
}

/** Ids des fiches (parmi bienIds) dont le dossier est complet — 1 seule requête. */
export async function fichesCompletes(
  supabase: SupabaseClient,
  bienIds: string[]
): Promise<Set<string>> {
  if (bienIds.length === 0) return new Set();
  const { data } = await supabase
    .from("documents_fiche")
    .select("fiche_id, type_document")
    .in("fiche_id", bienIds);

  const typesParFiche = new Map<string, Set<string>>();
  for (const d of (data ?? []) as { fiche_id: string; type_document: string }[]) {
    if (!typesParFiche.has(d.fiche_id)) typesParFiche.set(d.fiche_id, new Set());
    typesParFiche.get(d.fiche_id)!.add(d.type_document);
  }
  const completes = new Set<string>();
  for (const [ficheId, types] of typesParFiche) {
    if (TYPES_DOCUMENTS_FICHE.every((t) => types.has(t))) completes.add(ficheId);
  }
  return completes;
}
