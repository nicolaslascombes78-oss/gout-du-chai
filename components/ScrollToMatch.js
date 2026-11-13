"use client";

import { useEffect } from "react";

// Arrivée depuis une recherche : on fait défiler la page jusqu'à la première cuvée trouvée.
export default function ScrollToMatch() {
  useEffect(() => {
    const t = setTimeout(() => {
      const el = document.querySelector(".cuvee.is-match");
      if (!el) return;
      const reduit = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ block: "center", behavior: reduit ? "auto" : "smooth" });
    }, 450); // après le fondu d'entrée de la page
    return () => clearTimeout(t);
  }, []);
  return null;
}
