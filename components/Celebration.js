"use client";

import { useEffect, useRef, useState } from "react";

const C = 2 * Math.PI * 40;

// Le moment fort : le sceau se referme sous les yeux du membre, puis le remerciement.
// Affiché une seule fois par appareil et par domaine ; « force » l'affiche quand le membre vient de compléter la commande.
export default function Celebration({ slug, name, participants = 0, threshold, mine = 0, force = false }) {
  const [open, setOpen] = useState(false);
  const bouton = useRef(null);
  const cle = `gdc-celebre-${slug}`;

  useEffect(() => {
    let vu = false;
    try {
      vu = Boolean(localStorage.getItem(cle));
    } catch {
      // stockage indisponible : on affiche quand même si demandé
    }
    if (force || !vu) setOpen(true);
  }, [force, cle]);

  useEffect(() => {
    if (!open) return;
    bouton.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") fermer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function fermer() {
    try {
      localStorage.setItem(cle, "1");
    } catch {
      // rien
    }
    setOpen(false);
  }

  if (!open || !threshold) return null;

  // L'anneau part de là où en était la commande avant les dernières bouteilles, puis se referme.
  const part = Math.min(0.9, Math.max(0.06, (mine || Math.ceil(threshold * 0.1)) / threshold));
  const autres = Math.max(0, participants - (mine > 0 ? 1 : 0));
  const merci =
    mine > 0
      ? autres > 0
        ? `Merci à vous et aux ${autres} autre${autres > 1 ? "s" : ""} membre${autres > 1 ? "s" : ""} qui l'ont rendue possible.`
        : "Merci à vous : c'est votre réservation qui la rend possible."
      : participants > 0
        ? `Merci aux ${participants} membre${participants > 1 ? "s" : ""} qui l'ont rendue possible.`
        : null;

  return (
    <div className="celebre" role="dialog" aria-modal="true" aria-labelledby="celebre-titre" onClick={fermer}>
      <div className="celebre-card" onClick={(e) => e.stopPropagation()}>
        <svg className="celebre-seal" width="140" height="140" viewBox="0 0 96 96" aria-hidden="true">
          <circle cx="48" cy="48" r="40" fill="none" stroke="var(--line)" strokeWidth="5" />
          <circle
            className="celebre-ring"
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke="var(--gold)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={C}
            style={{ "--from": `${C * part}px` }}
            transform="rotate(-90 48 48)"
          />
          <path
            className="celebre-check"
            d="M34 49l10 10 19-22"
            fill="none"
            stroke="var(--gold-soft)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <h2 id="celebre-titre" className="celebre-t">
          Le sceau se referme
        </h2>
        <p className="celebre-txt">
          Les {threshold} bouteilles sont réunies : la commande {name} peut partir chez le vigneron.
        </p>
        {merci && <p className="celebre-merci">{merci}</p>}
        <button ref={bouton} type="button" className="btn" onClick={fermer}>
          Merveilleux
        </button>
      </div>
    </div>
  );
}
