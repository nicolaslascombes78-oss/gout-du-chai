"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Seal from "@/components/Seal";
import "@/app/concept.css";

// Bouton « ? » à côté de la cloche, sur l'accueil du club : il rouvre à tout moment
// l'explication du concept dans une fiche qui monte du bas de l'écran.
export default function ConceptButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const fermer = useRef(null);

  useEffect(() => {
    if (!open) return;
    fermer.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = avant;
    };
  }, [open]);

  // Seulement sur la page d'accueil du club.
  if (pathname !== "/club") return null;

  return (
    <>
      <button
        type="button"
        className="bell help-btn"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label="Comment fonctionne le club"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M9.6 9.3a2.5 2.5 0 0 1 4.85.85c0 1.7-2.45 2.3-2.45 3.6" />
          <path d="M12 16.9h.01" />
        </svg>
      </button>

      {open && (
        <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="concept-titre" onClick={() => setOpen(false)}>
          <div className="sheet-card concept" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <p className="eyebrow">Le Goût du Chai</p>
              <button ref={fermer} type="button" className="sheet-close" onClick={() => setOpen(false)} aria-label="Fermer">
                ×
              </button>
            </div>
            <h2 id="concept-titre" className="sheet-title">
              Comment fonctionne le club
            </h2>
            <p className="concept-intro">
              Un club privé, sur invitation, pour acheter ensemble directement auprès des domaines, au prix adhérent.
              Chaque domaine a un seuil de bouteilles à atteindre à plusieurs : quand il est atteint, la commande part.
            </p>

            <ol className="howto concept-steps">
              <li>
                <Seal reserved={2} mine={2} threshold={6} size={52} bare />
                <span>
                  <strong>Vous réservez.</strong>
                  <span className="muted">Vos bouteilles au prix adhérent. Rien n&apos;est débité.</span>
                </span>
              </li>
              <li>
                <Seal reserved={6} threshold={6} size={52} />
                <span>
                  <strong>Le sceau se referme.</strong>
                  <span className="muted">
                    Quand le seuil est atteint, la commande part chez le vigneron et vous êtes débité.
                  </span>
                </span>
              </li>
              <li>
                <span className="howto-icon" aria-hidden="true">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7l9-4 9 4-9 4-9-4z" />
                    <path d="M3 7v10l9 4 9-4V7" />
                    <path d="M12 11v10" />
                  </svg>
                </span>
                <span>
                  <strong>Vous dégustez.</strong>
                  <span className="muted">Vos bouteilles vous sont livrées une fois la commande arrivée.</span>
                </span>
              </li>
            </ol>

            <h3 className="concept-h3">Bon à savoir</h3>
            <ul className="concept-points">
              <li>
                <strong>Le sceau</strong> montre au centre le nombre de bouteilles qui manquent pour lancer la commande.
              </li>
              <li>
                <strong>Votre carte est enregistrée</strong>, mais débitée seulement au lancement de la commande.
              </li>
              <li>
                <strong>Vous restez libre</strong> : modifiez ou annulez vos réservations jusqu&apos;au lancement.
              </li>
              <li>
                <strong>Chaque domaine a une date limite.</strong> Si le seuil n&apos;est pas atteint à temps, la commande
                ne part pas et rien n&apos;est débité.
              </li>
              <li>
                <strong>Invitez vos amis</strong> : plus le club compte de membres, plus vite les commandes partent.
              </li>
            </ul>

            <div className="concept-actions">
              <Link href="/club/selection" className="btn" onClick={() => setOpen(false)}>
                Voir la Sélection
              </Link>
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                J&apos;ai compris
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
