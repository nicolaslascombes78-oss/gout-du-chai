"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { euros } from "@/lib/catalogue";

// Bas de la fiche domaine + barre fixe dès qu'une bouteille de ce domaine est choisie.
// cuvees = [{ id, price, reserved }] pour calculer bouteilles et montant de ce domaine.
export default function DomainCartLink({ editable, closedLabel, cuvees = [] }) {
  const { cart, count } = useCart();
  if (!editable) {
    return (
      <button className="btn" disabled>
        {closedLabel}
      </button>
    );
  }
  if (count === 0) {
    return (
      <p className="muted" style={{ textAlign: "center" }}>
        Choisissez vos bouteilles ci-dessus, puis réservez depuis votre panier.
      </p>
    );
  }
  const changed = cuvees.some((c) => cart[c.id]);
  const qtyOf = (c) => (cart[c.id] ? cart[c.id].qty : c.reserved);
  const bottles = cuvees.reduce((s, c) => s + qtyOf(c), 0);
  const amount = cuvees.reduce((s, c) => s + qtyOf(c) * c.price, 0);
  return (
    <>
      {/* Un seul bouton doré à l'écran : quand la barre fixe est là, celui-ci devient discret. */}
      <Link href="/club/panier" className={changed ? "btn btn-ghost" : "btn"}>
        Voir le panier
      </Link>
      {changed && (
        <div className="cart-bar" role="status">
          <div>
            <p className="cart-bar-t">
              {bottles} bouteille{bottles > 1 ? "s" : ""} · {euros(amount)}
            </p>
            <p className="cart-bar-s">Rien n&apos;est débité aujourd&apos;hui</p>
          </div>
          <Link href="/club/panier" className="btn cart-bar-btn">
            Voir le panier
          </Link>
        </div>
      )}
    </>
  );
}
