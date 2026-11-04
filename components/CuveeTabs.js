"use client";

import { useState } from "react";

// Onglets de couleur sur la fiche domaine : n'apparaissent que si le domaine a plusieurs couleurs.
// Les groupes de cuvées (enfants) portent data-c="<couleur>" ; la feuille de style masque les autres.
export default function CuveeTabs({ tabs = [], children }) {
  const [f, setF] = useState("tout");
  if (tabs.length < 2) return <div className="stack">{children}</div>;
  const total = tabs.reduce((s, t) => s + t.count, 0);
  const all = [{ color: "tout", label: "Tout", count: total }, ...tabs];
  return (
    <div className="cuvee-tabs stack" data-f={f}>
      <div className="chips cuvee-tabbar" role="group" aria-label="Filtrer les cuvées par couleur">
        {all.map((t) => (
          <button
            key={t.color}
            type="button"
            className={`chip ${f === t.color ? "on" : ""}`}
            aria-pressed={f === t.color}
            onClick={() => setF(t.color)}
          >
            {t.label}
            <span className="chip-n">{t.count}</span>
          </button>
        ))}
      </div>
      {children}
    </div>
  );
}
