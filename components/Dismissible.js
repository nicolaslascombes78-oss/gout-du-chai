"use client";

import { useEffect, useState } from "react";

// Encadré que le membre peut fermer d'un toucher ; le choix est retenu sur l'appareil.
export default function Dismissible({ id, className = "", label = "Fermer", children }) {
  const cle = `gdc-ferme-${id}`;
  const [ferme, setFerme] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(cle) === "1") setFerme(true);
    } catch {
      // stockage indisponible
    }
  }, [cle]);

  if (ferme) return null;

  return (
    <section className={`${className} dismissible`}>
      <button
        type="button"
        className="dismiss-x"
        aria-label={label}
        onClick={() => {
          setFerme(true);
          try {
            localStorage.setItem(cle, "1");
          } catch {
            // stockage indisponible
          }
        }}
      >
        ×
      </button>
      {children}
    </section>
  );
}
