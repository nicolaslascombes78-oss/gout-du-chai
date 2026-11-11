"use client";

import { useEffect, useRef, useState } from "react";
import CuveeReviews from "@/components/CuveeReviews";
import Seals from "@/components/Seals";
import { COLOR_LABELS } from "@/lib/catalogue";
import { noteTexte } from "@/lib/avis";

const LABELS = { bio: "Bio", biodynamie: "Biodynamie", nature: "Nature" };

// Nom d'une cuvée sur la fiche domaine. Si la cuvée a des détails (cépages, élevage…) ou des avis,
// le nom ouvre une fiche qui monte du bas de l'écran ; sinon il reste un simple texte.
export default function CuveeSheet({ c, domainName, slug, avis }) {
  const [open, setOpen] = useState(false);
  const fermer = useRef(null);

  const rows = [
    ["Cépages", c.cepages],
    ["Élevage", c.elevage],
    ["Accords", c.accords],
    ["Service", c.service],
    ["Garde", c.garde],
    ["Degré", c.degre ? `${String(c.degre).replace(".", ",")} %` : null],
  ].filter(([, v]) => v);
  const labels = (c.labels || []).filter(Boolean);
  // La fiche s'ouvre s'il y a de vrais détails (élevage, accords, service, garde, degré)
  // ou des avis à lire ou à donner ; sinon, le cépage et les labels s'affichent directement sous le nom.
  const hasDetails = rows.some(([k]) => k !== "Cépages");
  const aDesAvis = (avis?.nb || 0) > 0 || Boolean(avis?.mien) || Boolean(avis?.peutDonner);
  const resume = [c.cepages, ...labels.map((l) => LABELS[l] || l)].filter(Boolean).join(" · ");

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

  if (!hasDetails && !aDesAvis) {
    return (
      <>
        {nom}
        {resume && <span className="cuvee-cep">{resume}</span>}
      </>
    );
  }

  return (
    <>
      <button type="button" className="cuvee-open" onClick={() => setOpen(true)} aria-haspopup="dialog">
        {nom}
        <span className="cuvee-open-hint">{hasDetails ? "Fiche" : avis?.peutDonner && !avis?.mien ? "Donner mon avis" : "Avis"}</span>
      </button>
      {mini}
      {!hasDetails && resume && <span className="cuvee-cep">{resume}</span>}
      {open && (
        <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={`fiche-${c.id}`} onClick={() => setOpen(false)}>
          <div className="sheet-card" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-head">
              <p className="eyebrow">{domainName}</p>
              <button ref={fermer} type="button" className="sheet-close" onClick={() => setOpen(false)} aria-label="Fermer la fiche">
                ×
              </button>
            </div>
            <h2 id={`fiche-${c.id}`} className="sheet-title">
              {c.name}
            </h2>
            <p className="muted">
              {COLOR_LABELS[c.color] || ""}
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
