"use client";

import { useEffect, useRef, useState } from "react";
import CuveeReviews from "@/components/CuveeReviews";
import Seals from "@/components/Seals";
import { COLOR_LABELS } from "@/lib/catalogue";
import { noteTexte } from "@/lib/avis";

const LABELS = { bio: "Bio", biodynamie: "Biodynamie", nature: "Nature" };

// Style de la carte cliquable, ajouté une seule fois à la page.
const STYLE_ID = "cuvee-cliquable-style";
const STYLE = `
.cuvee.cuvee-cliquable { cursor: pointer; -webkit-tap-highlight-color: transparent; transition: background-color 0.15s ease; }
.cuvee.cuvee-cliquable:active { background-color: rgba(255, 255, 255, 0.04); }
@media (hover: hover) { .cuvee.cuvee-cliquable:hover { background-color: rgba(255, 255, 255, 0.025); } }
.cuvee.cuvee-cliquable .stepper-wrap { cursor: auto; }
`;

// Nom d'une cuvée sur la fiche domaine, suivi de l'appellation, du cépage et des labels (Bio, Biodynamie…).
// Si la cuvée a une description, des détails (élevage, accords…) ou des avis, toute sa carte ouvre
// une fiche qui monte du bas de l'écran (sauf le choix du nombre de bouteilles) ;
// sinon le nom reste un simple texte et la carte ne s'ouvre pas.
export default function CuveeSheet({ c, domainName, slug, avis }) {
  const [open, setOpen] = useState(false);
  const fermer = useRef(null);
  const declencheur = useRef(null);

  const rows = [
    ["Cépages", c.cepages],
    ["Élevage", c.elevage],
    ["Accords", c.accords],
    ["Service", c.service],
    ["Garde", c.garde],
    ["Degré", c.degre ? `${String(c.degre).replace(".", ",")} %` : null],
  ].filter(([, v]) => v);
  const labels = (c.labels || []).filter(Boolean);
  // La fiche s'ouvre s'il y a une description, de vrais détails (élevage, accords, service, garde, degré)
  // ou des avis à lire ou à donner.
  const hasDetails = Boolean(c.description) || rows.some(([k]) => k !== "Cépages");
  const aDesAvis = (avis?.nb || 0) > 0 || Boolean(avis?.mien) || Boolean(avis?.peutDonner);
  const ouvrable = hasDetails || aDesAvis;
  // Toujours visible sous le nom : appellation, cépage et labels, sur une ligne
  const resume = [c.appellation, c.cepages, ...labels.map((l) => LABELS[l] || l)].filter(Boolean).join(" · ");

  // Toute la carte de la cuvée ouvre la fiche, sauf le choix du nombre de bouteilles,
  // les autres boutons et liens, et la fiche elle-même une fois ouverte.
  useEffect(() => {
    if (!ouvrable) return;
    const carte = declencheur.current?.closest(".cuvee");
    if (!carte) return;
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = STYLE;
      document.head.appendChild(style);
    }
    carte.classList.add("cuvee-cliquable");
    const onClick = (e) => {
      const cible = e.target;
      if (!(cible instanceof Element)) return;
      if (cible.closest(".sheet, .stepper-wrap, button, a, input, select, textarea, label")) return;
      // On laisse sélectionner du texte sans ouvrir la fiche
      if (window.getSelection()?.toString()) return;
      setOpen(true);
    };
    carte.addEventListener("click", onClick);
    return () => {
      carte.removeEventListener("click", onClick);
      carte.classList.remove("cuvee-cliquable");
    };
  }, [ouvrable]);

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

  const nom = (
    <>
      {c.name}
      {c.is_favorite && <span className="heart"> ♥</span>}
    </>
  );
  const mini =
    avis?.moyenne != null ? (
      <span className="avis-mini">
        <Seals value={avis.moyenne} label={`Note des membres ${noteTexte(avis.moyenne)} sur 5`} />
        {noteTexte(avis.moyenne)} ({avis.nb})
      </span>
    ) : null;

  if (!ouvrable) {
    return (
      <>
        {nom}
        {resume && <span className="cuvee-cep">{resume}</span>}
      </>
    );
  }

  return (
    <>
      <button
        ref={declencheur}
        type="button"
        className="cuvee-open"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        {nom}
        <span className="cuvee-open-hint">
          {hasDetails ? "Fiche" : avis?.peutDonner && !avis?.mien ? "Donner mon avis" : "Avis"}
        </span>
      </button>
      {mini}
      {resume && <span className="cuvee-cep">{resume}</span>}
      {open && (
        <div
          className="sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`fiche-${c.id}`}
          onClick={() => setOpen(false)}
        >
          <div className="sheet-card" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <p className="eyebrow">{domainName}</p>
              <button
                ref={fermer}
                type="button"
                className="sheet-close"
                onClick={() => setOpen(false)}
                aria-label="Fermer la fiche"
              >
                ×
              </button>
            </div>
            <h2 id={`fiche-${c.id}`} className="sheet-title">
              {c.name}
            </h2>
            <p className="muted">
              {COLOR_LABELS[c.color] || ""}
              {c.appellation ? ` · ${c.appellation}` : ""}
              {c.vintage ? ` · ${c.vintage}` : " · Sans millésime"}
            </p>
            {labels.length > 0 && (
              <div className="sheet-labels">
                {labels.map((l) => (
                  <span key={l} className="sheet-label">
                    {LABELS[l] || l}
                  </span>
                ))}
              </div>
            )}
            {c.description && <p className="sheet-accroche">{c.description}</p>}
            {rows.length > 0 && (
              <dl className="sheet-rows">
                {rows.map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            {c.source_fiche && (
              <p className="sheet-source">
                Source :{" "}
                <a href={c.source_fiche} target="_blank" rel="noopener noreferrer">
                  fiche technique
                </a>
              </p>
            )}
            {avis && <CuveeReviews cuveeId={c.id} slug={slug} avis={avis} />}
          </div>
        </div>
      )}
    </>
  );
}
