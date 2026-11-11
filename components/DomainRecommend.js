"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { repondreDomaine } from "@/lib/avis-actions";
import { RECO_MAX_TEXTE, VERDICTS } from "@/lib/avis";

// Question « Recommanderiez-vous ce domaine ? » pour les membres qui ont reçu leur commande.
// Un seul geste suffit ; « Plus tard » ferme l'encart et la question ne revient plus.
export default function DomainRecommend({ domainId, slug, domainName, mienne, aNoter = 0 }) {
  const router = useRouter();
  const [etape, setEtape] = useState(null); // null | "question" | "merci"
  const [choix, setChoix] = useState(mienne && mienne.verdict !== "ignore" ? mienne.verdict : null);
  const [texte, setTexte] = useState(mienne?.comment || "");
  const [mot, setMot] = useState(null);
  const [enCours, demarrer] = useTransition();

  const envoyer = (verdict, comment, suite) =>
    demarrer(async () => {
      const r = await repondreDomaine({ domainId, slug, verdict, comment });
      if (r?.ok) {
        suite?.();
        router.refresh();
      } else {
        setMot("La réponse n'a pas été enregistrée. Réessayez.");
      }
    });

  const repondre = (v) => {
    setChoix(v);
    setMot(null);
    envoyer(v, null, () => setEtape("merci"));
  };

  const question = (
    <>
      <p>
        Recommanderiez-vous {domainName} pour une prochaine commande du club ?
      </p>
      <div className="reco-choix" role="group" aria-label="Votre recommandation">
        {Object.entries(VERDICTS).map(([v, l]) => (
          <button
            key={v}
            type="button"
            className={`chip${choix === v ? " on" : ""}`}
            aria-pressed={choix === v}
            onClick={() => repondre(v)}
            disabled={enCours}
          >
            {l}
          </button>
        ))}
      </div>
    </>
  );

  // Juste après la réponse : remerciement, un mot facultatif, et une porte vers les cuvées
  if (etape === "merci") {
    return (
      <section className="section card stack reco-encart" aria-live="polite">
        <p>Merci, c&apos;est noté.</p>
        <div>
          <label htmlFor={`reco-mot-${domainId}`}>Un mot sur le domaine ? (facultatif)</label>
          <textarea
            id={`reco-mot-${domainId}`}
            className="reco-texte"
            value={texte}
            maxLength={RECO_MAX_TEXTE}
            onChange={(e) => setTexte(e.target.value)}
            placeholder="L'accueil, le style des vins, l'emballage…"
          />
        </div>
        {mot && <p className="success">{mot}</p>}
        <div className="avis-actions">
          <button
            type="button"
            className="btn btn-ghost"
            disabled={enCours || !texte.trim()}
            onClick={() => envoyer(choix, texte, () => setMot("Merci pour ce mot."))}
          >
            Ajouter ce mot
          </button>
          <button type="button" className="avis-retirer" onClick={() => setEtape(null)}>
            Fermer
          </button>
        </div>
        {aNoter > 0 && (
          <a href="#cuvees" className="link-btn" onClick={() => setEtape(null)}>
            Envie de noter une cuvée ? Touchez son nom dans la liste.
          </a>
        )}
      </section>
    );
  }

  // Première visite après la livraison : l'encart avec la question
  if (!mienne || etape === "question") {
    return (
      <section className="section card stack reco-encart">
        {!mienne && <p className="eyebrow">Vos bouteilles sont arrivées</p>}
        {question}
        {mot && <p className="error">{mot}</p>}
        <button
          type="button"
          className="avis-retirer"
          disabled={enCours}
          onClick={() => (mienne ? setEtape(null) : envoyer("ignore", null))}
        >
          {mienne ? "Annuler" : "Plus tard"}
        </button>
      </section>
    );
  }

  // Déjà répondu (ou « Plus tard ») : une simple ligne, discrète
  return (
    <p className="muted reco-mienne">
      {mienne.verdict === "ignore" ? (
        <button type="button" className="avis-retirer" onClick={() => setEtape("question")}>
          Donner mon avis sur le domaine
        </button>
      ) : (
        <>
          Votre recommandation : {VERDICTS[mienne.verdict]}.{" "}
          <button type="button" className="avis-retirer" onClick={() => setEtape("question")}>
            Modifier
          </button>
        </>
      )}
    </p>
  );
}
