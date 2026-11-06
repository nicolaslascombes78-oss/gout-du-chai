// Connexion à Stripe, côté serveur uniquement. La clé secrète est lue dans les variables Vercel.
import Stripe from "stripe";

let client = null;

export function stripe() {
  if (!client) {
    const cle = process.env.STRIPE_SECRET_KEY;
    if (!cle) throw new Error("cle_stripe_absente");
    client = new Stripe(cle);
  }
  return client;
}

export const enCentimes = (montant) => Math.round(Number(montant) * 100);

export async function origine() {
  const { headers } = await import("next/headers");
  const h = await headers();
  const hote = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || "https";
  return `${proto}://${hote}`;
}

const MARQUES = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  cartes_bancaires: "Carte Bancaire",
  discover: "Discover",
  jcb: "JCB",
  unionpay: "UnionPay",
  diners: "Diners",
};
export const nomMarque = (b) => MARQUES[b] || "Carte";
