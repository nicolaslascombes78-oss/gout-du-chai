"use client";

import { useEffect, useState } from "react";

// Barre fixe en haut de la fiche domaine : apparaît quand la carte « Commande groupée » sort de l'écran,
// pour garder l'avancement sous les yeux pendant qu'on choisit ses cuvées.
export default function StickyProgress({ cible = "commande", name, reserved, threshold, echeance = null }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = document.getElementById(cible);
    if (!el || !("IntersectionObserver" in window)) return;
    const obs = new IntersectionObserver(([e]) => setVisible(!e.isIntersecting && e.boundingClientRect.top < 0), {
      threshold: 0,
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [cible]);

  if (!threshold) return null;
  const pct = Math.min(100, Math.round((reserved / threshold) * 100));
  const manque = Math.max(0, threshold - reserved);

  return (
    <div className={`sticky-progress${visible ? " on" : ""}`} aria-hidden={!visible}>
      <div className="sticky-progress-txt">
        <strong>{name}</strong>
        <span>
          {reserved} / {threshold}
          {manque > 0 ? ` · il manque ${manque}` : " · seuil atteint"}
          {echeance ? ` · ${echeance}` : ""}
        </span>
      </div>
      <div className="sticky-progress-bar">
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
