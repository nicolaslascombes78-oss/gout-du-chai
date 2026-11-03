"use client";

import { useEffect, useState } from "react";

// Panier gardé sur l'appareil : pour chaque cuvée modifiée, la quantité voulue
// (la réservation réelle n'est enregistrée qu'à la confirmation).
const KEY = "gdc-panier-v1";
const EVT = "gdc-panier";

export function readCart() {
  try {
    return JSON.parse(window.localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

function writeCart(cart) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cart));
  } catch {
    // stockage indisponible (navigation privée stricte) : on continue sans
  }
  window.dispatchEvent(new Event(EVT));
}

// qty = null retire la ligne (retour à la quantité déjà réservée).
export function setLine(cuveeId, qty, meta = {}) {
  const cart = readCart();
  if (qty === null) delete cart[cuveeId];
  else cart[cuveeId] = { ...cart[cuveeId], ...meta, qty };
  writeCart(cart);
}

export function clearLines(ids) {
  const cart = readCart();
  (ids || Object.keys(cart)).forEach((id) => delete cart[id]);
  writeCart(cart);
}

export function useCart() {
  const [cart, setCart] = useState({});
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => setCart(readCart());
    sync();
    setReady(true);
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return { cart, ready, count: Object.keys(cart).length };
}

export function reservationError(error) {
  const msg = error?.message || "";
  if (msg.includes("domain_closed:")) {
    return `Les réservations sont closes pour ${msg.split("domain_closed:")[1].trim()}.`;
  }
  if (msg.includes("pack_size:")) {
    return `Une cuvée se réserve par ${msg.split("pack_size:")[1].trim()} bouteilles : ajustez la quantité.`;
  }
  if (msg.includes("cuvee_unavailable")) return "Une cuvée n'est plus disponible. Retirez-la du panier.";
  if (msg.includes("not_member")) return "Votre session a expiré. Reconnectez-vous.";
  return "La réservation n'a pas pu être enregistrée. Réessayez dans un instant.";
}
