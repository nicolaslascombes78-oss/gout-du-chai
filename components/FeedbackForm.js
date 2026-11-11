"use client";

import { useActionState, useState } from "react";
import { usePathname } from "next/navigation";
import { envoyerIdee } from "@/app/club/idees/actions";

const TYPES = [
  { v: "envie", ico: "🍷", t: "Une envie de vin", aide: "Un domaine, une région, un cépage, un budget…" },
  { v: "idee", ico: "💡", t: "Une idée pour l’application", aide: "Ce qui vous simplifierait la vie, ce qui manque…" },
  { v: "probleme", ico: "⚠️", t: "Quelque chose ne marche pas", aide: "Ce que vous faisiez, ce qui s’est passé…" },
];

function Formulaire({ type, sujet, messageInitial, onAutre }) {
  const pathname = usePathname();
  const [kind, setKind] = useState(TYPES.some((x) => x.v === type) ? type : "");
  const [etat, action, envoi] = useActionState(envoyerIdee, null);
  const choisi = TYPES.find((x) => x.v === kind);

  if (etat?.ok) {
    return (
      <div className="idee-merci" role="status">
        <p className="idee-merci-titre">Merci, c’est bien reçu.</p>
        <p className="muted">
          Philippe et Nicolas lisent chaque message. Quand votre idée aura abouti, vous en serez prévenu sous la cloche.
        </p>
        <button type="button" className="link-btn" onClick={onAutre}>
          Envoyer un autre message
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="idee-form stack">
      <input type="hidden" name="page" value={pathname || ""} />
      {sujet && <input type="hidden" name="sujet" value={sujet} />}
      <fieldset className="idee-types">
        <legend className="idee-legend">Votre message concerne :</legend>
        {TYPES.map((x) => (
          <label key={x.v} className={`idee-type${kind === x.v ? " on" : ""}`}>
            <input type="radio" name="kind" value={x.v} checked={kind === x.v} onChange={() => setKind(x.v)} />
            <span aria-hidden="true">{x.ico}</span> {x.t}
          </label>
        ))}
      </fieldset>
      {sujet && <p className="muted">À propos : {sujet}</p>}
      <label className="idee-label">
        Votre message
        <textarea
          name="message"
          rows={4}
          maxLength={2000}
          required
          defaultValue={messageInitial}
          placeholder={choisi ? choisi.aide : "Choisissez d’abord le type de message ci-dessus."}
        />
      </label>
      {etat?.erreur && (
        <p className="error" role="alert">
          {etat.erreur}
        </p>
      )}
      <button className="btn" type="submit" disabled={envoi || !kind}>
        {envoi ? "Envoi…" : "Envoyer"}
      </button>
    </form>
  );
}

// Boîte à idées des membres. Après un envoi, « Envoyer un autre message » repart d'un formulaire vide.
export default function FeedbackForm({ type = "", sujet = "", messageInitial = "" }) {
  const [n, setN] = useState(0);
  return (
    <Formulaire
      key={n}
      type={n === 0 ? type : ""}
      sujet={n === 0 ? sujet : ""}
      messageInitial={n === 0 ? messageInitial : ""}
      onAutre={() => setN((x) => x + 1)}
    />
  );
}
