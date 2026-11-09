"use client";

import { useEffect } from "react";

// Retient que le membre a vu le fil « Au club » jusqu'à cet événement.
export default function MarkSeen({ at }) {
  useEffect(() => {
    if (!at) return;
    try {
      localStorage.setItem("gdc-activite-vue", at);
    } catch {
      // stockage indisponible
    }
  }, [at]);
  return null;
}
