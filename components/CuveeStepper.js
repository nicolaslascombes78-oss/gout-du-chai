"use client";

import { setLine, useCart } from "@/lib/cart";

// Choix du nombre de bouteilles pour une cuvée.
// « reserved » = quantité déjà enregistrée ; le panier garde la nouvelle valeur.
export default function CuveeStepper({ cuveeId, domainSlug, step = 1, reserved = 0, editable = true, label }) {
  const { cart, ready } = useCart();
  const line = cart[cuveeId];
  const qty = ready && line ? line.qty : reserved;
  const s = Math.max(1, step || 1);

  if (!editable) {
    return reserved > 0 ? <p className="muted">Réservé : {reserved}</p> : null;
  }

  function change(next) {
    const v = Math.max(0, next);
    if (v === reserved) setLine(cuveeId, null);
    else setLine(cuveeId, v, { slug: domainSlug });
  }

  return (
    <div className="stepper-wrap">
      <div className={`stepper${line ? " changed" : ""}`}>
        <button
          type="button"
          onClick={() => change(qty - s)}
          disabled={qty === 0}
          aria-label={`Retirer ${s} bouteille${s > 1 ? "s" : ""} de ${label}`}
        >
          −
        </button>
        <span className="qty" aria-live="polite">
          {qty}
        </span>
        <button type="button" onClick={() => change(qty + s)} aria-label={`Ajouter ${s} bouteille${s > 1 ? "s" : ""} de ${label}`}>
          +
        </button>
      </div>
      {s > 1 && <p className="hint">par {s}</p>}
      {line && reserved > 0 && <p className="hint">déjà réservé : {reserved}</p>}
    </div>
  );
}
