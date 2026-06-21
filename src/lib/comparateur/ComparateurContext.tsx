"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export type BienMiniature = {
  id: string;
  titre: string;
  photo: string | null;
  prix: number;
  transaction: string;
  slug: string;
};

type ComparateurCtx = {
  biens: BienMiniature[];
  ajouter: (bien: BienMiniature) => void;
  supprimer: (id: string) => void;
  vider: () => void;
  estSelectionne: (id: string) => boolean;
};

const Ctx = createContext<ComparateurCtx | null>(null);

export function ComparateurProvider({ children }: { children: ReactNode }) {
  const [biens, setBiens] = useState<BienMiniature[]>([]);

  const ajouter = useCallback((bien: BienMiniature) => {
    setBiens((prev) => {
      if (prev.length >= 4 || prev.some((b) => b.id === bien.id)) return prev;
      return [...prev, bien];
    });
  }, []);

  const supprimer = useCallback((id: string) => {
    setBiens((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const vider = useCallback(() => setBiens([]), []);

  const estSelectionne = useCallback(
    (id: string) => biens.some((b) => b.id === id),
    [biens]
  );

  return (
    <Ctx.Provider value={{ biens, ajouter, supprimer, vider, estSelectionne }}>
      {children}
    </Ctx.Provider>
  );
}

export function useComparateur() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useComparateur doit être utilisé dans ComparateurProvider");
  return ctx;
}
