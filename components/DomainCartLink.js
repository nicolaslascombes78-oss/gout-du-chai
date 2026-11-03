"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";

export default function DomainCartLink({ editable, closedLabel }) {
  const { count } = useCart();
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
        Choisissez vos bouteilles ci-dessus, puis confirmez depuis votre panier.
      </p>
    );
  }
  return (
    <Link href="/club/panier" className="btn">
      Voir mon panier · {count} cuvée{count > 1 ? "s" : ""} à confirmer
    </Link>
  );
}
