"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Panier : pour chaque cuvée modifiée, la quantité voulue
// (la réservation réelle n'est enregistrée qu'à la confirmation).
// Il est gardé sur l'appareil pour l'affichage immédiat, ET dans le compte du membre
// (table Supabase « carts ») : le même panier dans Safari, dans l'appli installée
// et sur l'ordinateur. En cas d'écart, la version modifiée le plus récemment l'emporte.
const KEY = "gdc-panier-v1";
const META = "gdc-panier-meta-v1"; // { owner: id du membre, at: date de dernière modification }
const EVT = "gdc-panier";

function lireJSON(cle, defaut) {
  try {
    return JSON.parse(window.localStorage.getItem(cle)) || defaut;
  } catch {
    return defaut;
  }
}

function ecrireJSON(cle, valeur) {
  try {
    window.localStorage.setItem(cle, JSON.stringify(valeur));
  } catch {
    // stockage indisponible (navigation privée stricte) : on continue sans
  }
}

export function readCart() {
  return lireJSON(KEY, {});
}

function readMeta() {
  return lireJSON(META, {});
}

// Écrit le panier sur l'appareil. depuisServeur = true : pas de renvoi vers Supabase.
function writeCart(cart, { at = Date.now(), depuisServeur = false } = {}) {
  ecrireJSON(KEY, cart);
  ecrireJSON(META, { ...readMeta(), at });
  window.dispatchEvent(new Event(EVT));
  if (!depuisServeur) planifierEnvoi();
}

// ---- Synchronisation avec le compte du membre ----

async function session() {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  return { supabase, id: data.session?.user?.id || null };
}

let minuterie = null;
function planifierEnvoi() {
  clearTimeout(minuterie);
  minuterie = setTimeout(envoyer, 500); // regroupe les clics rapides sur + et −
}

async function envoyer() {
  try {
    const { supabase, id } = await session();
    if (!id) return;
    const meta = readMeta();
    await supabase.from("carts").upsert({
      member_id: id,
      items: readCart(),
      updated_ms: meta.at || Date.now(),
    });
  } catch {
    // hors ligne : le panier reste sur l'appareil et repartira à la prochaine modification
  }
}

let enCours = null;
let dernierChargement = 0;

async function recuperer() {
  if (enCours) return enCours;
  if (Date.now() - dernierChargement < 5000) return;
  enCours = (async () => {
    try {
      const { supabase, id } = await session();
      if (!id) return;
      dernierChargement = Date.now();

      // Un autre membre s'est connecté sur cet appareil : on ne mélange pas les paniers.
      const meta = readMeta();
      if (meta.owner && meta.owner !== id) {
        ecrireJSON(KEY, {});
        ecrireJSON(META, { owner: id, at: 0 });
        window.dispatchEvent(new Event(EVT));
      } else if (!meta.owner) {
        ecrireJSON(META, { ...meta, owner: id });
      }

      const { data, error } = await supabase
        .from("carts")
        .select("items, updated_ms")
        .eq("member_id", id)
        .maybeSingle();
      if (error) return;

      const local = readMeta();
      const localAt = Number(local.at || 0);
      const serveurAt = Number(data?.updated_ms || 0);

      if (data && serveurAt > localAt) {
        writeCart(data.items || {}, { at: serveurAt, depuisServeur: true });
      } else if (localAt > serveurAt || (!data && Object.keys(readCart()).length > 0)) {
        if (!localAt) ecrireJSON(META, { ...local, at: Date.now() });
        await envoyer();
      }
    } catch {
      // hors ligne : on garde le panier de l'appareil
    } finally {
      enCours = null;
    }
  })();
  return enCours;
}

// ---- Fonctions utilisées par les écrans (inchangées) ----

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
    const auRetour = () => {
      if (document.visibilityState === "visible") recuperer();
    };
    sync();
    setReady(true);
    recuperer();
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    document.addEventListener("visibilitychange", auRetour);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
      document.removeEventListener("visibilitychange", auRetour);
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
