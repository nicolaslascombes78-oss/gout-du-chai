"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Seals from "@/components/Seals";
import { enregistrerAvis, retirerAvis } from "@/lib/avis-actions";
import { AVIS_MAX_TAGS, AVIS_MAX_TEXTE, AVIS_TAGS, noteTexte } from "@/lib/avis";

const LIBELLES = { 1: "Décevant", 2: "Moyen", 3: "Bon", 4: "Très bon", 5: "Exceptionnel" };

const leJour = (iso) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

// Avis des membres dans la fiche cuvée : moyenne, liste, et formulaire pour ceux qui ont reçu la cuvée.
export default function CuveeReviews({ cuveeId, slug, avis }) {
  const router = useRouter();
  const { liste = [], moyenne, nb = 0, mien = null, peutDonner = false } = avis || {};
  const [edition, setEdition] = useState(false);
  const [note, setNote] = useState(mien?.rating || 0);
  const [tags, setTags] = useState(mien?.tags || []);
  const [texte, setTexte] = useState(mien?.comment || "");
  const [message, setMessage] = useState(null);
  const [enCours, demarrer] = useTransition();

  const autres = liste.filter((a) => a.id !== mien?.id);
  const formulaireOuvert = peutDonner && (edition || !mien);

  const basculerTag = (t) =>
    setTags((avant) =>
      avant.includes(t) ? avant.filter((x) => x !== t) : avant.length >= AVIS_MAX_TAGS ? avant : [...avant, t]
    );

  const publier = () => {
    if (!note) {
      setMessage({ type: "error", texte: "Choisissez une note de 1 à 5 sceaux." });
      return;
    }
    setMessage(null);
    demarrer(async () => {
      const r = await enregistrerAvis({ cuveeId, slug, rating: note, tags, comment: texte });
      if (r?.ok) {
        setEdition(false);
        setMessage({ type: "success", texte: mien ? "Avis modifié." : "Avis publié. Merci !" });
        router.refresh();
      } else {
        setMessage({
          type: "error",
          texte:
            r?.erreur === "droit"
              ? "Seuls les membres qui ont reçu cette cuvée peuvent donner un avis."
              : "L'avis n'a pas été enregistré. Réessayez.",
        });
      }
    });
  };

  const retirer = () => {
    if (!window.confirm("Retirer votre avis sur cette cuvée ?")) return;
    demarrer(async () => {
      const r = await retirerAvis({ cuveeId, slug });
      if (r?.ok) {
        setNote(0);
        setTags([]);
        setTexte("");
        setEdition(false);
        setMessage({ type: "success", texte: "Avis retiré." });
        router.refresh();
      } else {
        setMessage({ type: "error", texte: "L'avis n'a pas été retiré. Réessayez." });
      }
    });
  };

  const ligneAvis = (a, moi = false) => (
    <li className="avis-item" key={a.id}>
      <div className="avis-qui">
        <p>{moi ? "Votre avis" : a.author_name || "Un membre"}</p>
        <Seals value={a.rating} />
      </div>
      <p className="avis-quand">{leJour(a.updated_at || a.created_at)}</p>
      {a.tags?.length > 0 && (
        <div className="avis-tags">
          {a.tags.map((t) => (
            <span key={t} className="avis-tag">
              {t}
            </span>
          ))}
        </div>
      )}
      {a.comment && <p className="avis-texte">{a.comment}</p>}
      {moi && a.hidden && <p className="avis-note-masque">Cet avis a été masqué par le club et n&apos;est visible que par vous.</p>}
      {moi && peutDonner && !edition && (
        <div className="avis-actions" style={{ marginTop: 10 }}>
          <button type="button" className="avis-retirer" onClick={() => setEdition(true)}>
            Modifier
          </button>
          <button type="button" className="avis-retirer" onClick={retirer} disabled={enCours}>
            Retirer
          </button>
        </div>
      )}
    </li>
  );

  return (
    <section className="avis" aria-labelledby={`avis-${cuveeId}`}>
      <div className="avis-head">
        <h3 id={`avis-${cuveeId}`}>Avis des membres</h3>
        {nb > 0 && (
          <span className="muted">
            {nb} avis
          </span>
        )}
      </div>

      {moyenne != null ? (
        <div className="avis-moy">
          <strong>{noteTexte(moyenne)}</strong>
          <Seals value={moyenne} label={`Moyenne ${noteTexte(moyenne)} sur 5`} />
        </div>
      ) : (
        !peutDonner && <p className="muted" style={{ marginTop: 8 }}>Pas encore d&apos;avis sur cette cuvée.</p>
      )}

      {message && (
        <p className={message.type} style={{ marginTop: 12 }} role="status">
          {message.texte}
        </p>
      )}

      {formulaireOuvert && (
        <div className="avis-form">
          <div>
            <label id={`note-${cuveeId}`}>{mien ? "Modifier votre note" : "Vous avez goûté cette cuvée ? Votre note"}</label>
            <div className="avis-pick" role="radiogroup" aria-labelledby={`note-${cuveeId}`}>
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={note === i}
                  aria-label={`${i} sur 5, ${LIBELLES[i]}`}
                  className={note >= i ? "on" : ""}
                  onClick={() => setNote(i)}
                >
                  {i}
                </button>
              ))}
            </div>
            <p className="avis-pick-label">{note ? LIBELLES[note] : ""}</p>
          </div>

          <div>
            <label>En quelques mots (jusqu&apos;à {AVIS_MAX_TAGS})</label>
            <div className="chips">
              {AVIS_TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`chip${tags.includes(t) ? " on" : ""}`}
                  aria-pressed={tags.includes(t)}
                  onClick={() => basculerTag(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor={`texte-${cuveeId}`}>Votre impression (facultatif)</label>
            <textarea
              id={`texte-${cuveeId}`}
              value={texte}
              maxLength={AVIS_MAX_TEXTE}
              onChange={(e) => setTexte(e.target.value)}
              placeholder="Au nez, en bouche, avec quel plat…"
            />
            <p className="avis-compte">
              {texte.length} / {AVIS_MAX_TEXTE}
            </p>
          </div>

          <div className="avis-actions">
            <button type="button" className="btn" onClick={publier} disabled={enCours}>
              {enCours ? "Enregistrement…" : mien ? "Enregistrer mon avis" : "Publier mon avis"}
            </button>
            {mien && (
              <button
                type="button"
                className="avis-retirer"
                onClick={() => {
                  setEdition(false);
                  setNote(mien.rating);
                  setTags(mien.tags || []);
                  setTexte(mien.comment || "");
                }}
              >
                Annuler
              </button>
            )}
          </div>
          <p className="muted" style={{ fontSize: 12 }}>
            Votre avis sera signé de votre prénom et de l&apos;initiale de votre nom.
          </p>
        </div>
      )}

      {(mien || autres.length > 0) && (
        <ul className="avis-list">
          {mien && !formulaireOuvert && ligneAvis(mien, true)}
          {autres.map((a) => ligneAvis(a))}
        </ul>
      )}

      {(nb > 0 || peutDonner) && (
        <p className="avis-mention">
          Avis de membres ayant reçu la cuvée. Le club peut masquer un avis hors sujet ou irrespectueux.
        </p>
      )}
    </section>
  );
}
