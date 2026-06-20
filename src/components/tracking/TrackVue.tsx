"use client";

import { useEffect } from "react";
import { trackEvenement } from "@/lib/tracking/track";

type Props = { bienId: string };

// Composant invisible — enregistre la vue d'un bien au montage
export default function TrackVue({ bienId }: Props) {
  useEffect(() => {
    void trackEvenement(bienId, "vue");
  }, [bienId]);

  return null;
}
