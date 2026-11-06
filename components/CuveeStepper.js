"use client";

import { useRef, useState } from "react";
import { setLine, useCart } from "@/lib/cart";

const MAX = 999;

// Choix du nombre de bouteilles pour une cuvée : boutons − / + ou saisie directe du nombre.
// « reserved » = quantité déjà enregistrée ; le panier garde la nouvelle valeur.
export default function CuveeStepper({ cuveeId, domainSlug, step = 1, reserved = 0, editable = true, label }) {
  const { cart, ready } = useCart();
  const line = cart[cuveeId];
  const qty = ready && line ? line.qty : reserved;
  const s = Math.max(1, step || 1);
  const [draft, setDraft] = useState(null); // texte en cours de saisie
  const [note, setNote] = useState("");
  const cancel = useRef(false);

  if (!editable) {
    return reserved > 0 ? <p className="muted">Réservé : {reserved}</p> : null;
  }

  function change(next) {
    const v = Math.min(MAX, Math.max(0, next));
    if (v === reserved) setLine(cuveeId, null);
    else setLine(cuveeId, v, { slug: domainSlug });
  }

  // Valide le nombre tapé : vide = on garde l'ancienne valeur ; vente par carton = arrondi au carton supérieur.
  function commit(text) {
    setDraft(null);
    if (cancel.current) {
      cancel.current = false;
      return;
    }
    const n = parseInt(String(text).replace(/\D/g, ""), 10);
    if (Number.isNaN(n)) return;
    let v = Math.min(MAX, Math.max(0, n));
    if (s > 1 && v % s !== 0) {
      const up = Math.min(MAX - (MAX % s), Math.ceil(v / s) * s);
      setNote(`Arrondi à ${up} : vente par ${s}`);
      v = up;
    } else {
      setNote("");
    }
    if (v !== qty) change(v);
  }

  return (
    <div className="stepper-wrap">
      <div className={`stepper${line ? " changed" : ""}`}>
        <button
          type="button"
          onClick={() => {
            setNote("");
            change(qty - s);
          }}
          disabled={qty === 0}
          aria-label={`Retirer ${s} bouteille${s > 1 ? "s" : ""} de ${label}`}
        >
          −
        </button>
        <input
          className="qty qty-input"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          enterKeyHint="done"
          autoComplete="off"
          maxLength={3}
          value={draft ?? String(qty)}
          onFocus={(e) => {
            setDraft(String(qty));
            e.target.select();
          }}
          onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 3))}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              cancel.current = true;
              e.currentTarget.blur();
            }
          }}
          aria-label={`Nombre de bouteilles de ${label}`}
        />
        <button
          type="button"
          onClick={() => {
            setNote("");
            change(qty + s);
          }}
          disabled={qty >= MAX}
          aria-label={`Ajouter ${s} bouteille${s > 1 ? "s" : ""} de ${label}`}
        >
          +
        </button>
      </div>
      {note ? (
        <p className="hint" role="status">
          {note}
        </p>
      ) : (
        s > 1 && <p className="hint">par {s}</p>
      )}
      {line && reserved > 0 && <p className="hint">déjà réservé : {reserved}</p>}
    </div>
  );
}
