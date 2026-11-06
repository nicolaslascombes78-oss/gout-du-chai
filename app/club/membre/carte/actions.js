"use server";

import { redirect } from "next/navigation";
import { requireMember } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, origine } from "@/lib/stripe";
import { clientStripe, aPayerParMembre } from "@/lib/paiements";

// Ouvre la page sécurisée de Stripe pour enregistrer (ou changer) la carte. Rien n'est débité.
export async function enregistrerCarteAction() {
  const { member } = await requireMember();
  let url;
  try {
    const db = createAdminClient();
    const customer = await clientStripe(db, member);
    const base = await origine();
    const session = await stripe().checkout.sessions.create({
      mode: "setup",
      currency: "eur",
      customer,
      payment_method_types: ["card"],
      locale: "fr",
      metadata: { member_id: member.id },
      setup_intent_data: { metadata: { member_id: member.id } },
      success_url: `${base}/club/membre/carte?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/club/membre/carte?annule=1`,
    });
    url = session.url;
  } catch {
    redirect("/club/membre/carte?erreur=1");
  }
  redirect(url);
}

// Régler une commande dont le débit automatique n'a pas abouti (validation bancaire ou refus).
export async function payerCommande(formData) {
  const { member } = await requireMember();
  const paymentId = String(formData.get("payment_id") || "");
  let url;
  try {
    const db = createAdminClient();
    const { data: p } = await db
      .from("payments")
      .select("id, domain_id, member_id, status, stripe_payment_intent, domains(name)")
      .eq("id", paymentId)
      .maybeSingle();
    if (!p || p.member_id !== member.id || !["action_requise", "refusee", "sans_carte"].includes(p.status)) {
      redirect("/club/membre/carte?erreur=1");
    }

    const lignes = (await aPayerParMembre(db, p.domain_id))[member.id];
    if (!lignes || lignes.cents <= 0) redirect("/club/membre/carte?erreur=1");

    // Ancienne tentative en suspens : on l'annule pour ne jamais débiter deux fois.
    if (p.stripe_payment_intent) {
      try {
        await stripe().paymentIntents.cancel(p.stripe_payment_intent);
      } catch {
        // déjà annulée ou terminée
      }
    }

    const customer = await clientStripe(db, member);
    const base = await origine();
    const metadata = { domain_id: p.domain_id, member_id: member.id, payment_id: p.id, save_card: "1" };
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      customer,
      locale: "fr",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: lignes.cents,
            product_data: { name: `Commande ${p.domains?.name || "Le Goût du Chai"}` },
          },
        },
      ],
      metadata,
      payment_intent_data: { metadata, setup_future_usage: "off_session" },
      success_url: `${base}/club/membre/carte?paiement={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/club/membre/carte?annule=1`,
    });
    url = session.url;
  } catch (e) {
    if (e?.digest?.startsWith?.("NEXT_REDIRECT")) throw e;
    redirect("/club/membre/carte?erreur=1");
  }
  redirect(url);
}
