"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export type Profil = {
  id: string;
  nom_complet: string | null;
  telephone: string | null;
  role: string | null;
  avatar_url: string | null;
  cree_le: string | null;
};

// Retourne l'utilisateur connecté, son profil HOOMY et un état de chargement
export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [profil, setProfil] = useState<Profil | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function chargerProfil(userId: string) {
      const { data } = await supabase
        .from('profils')
        .select('*')
        .eq('id', userId)
        .single();
      setProfil(data ?? null);
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        chargerProfil(user.id).finally(() => setChargement(false));
      } else {
        setChargement(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        chargerProfil(u.id);
      } else {
        setProfil(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, profil, chargement };
}
