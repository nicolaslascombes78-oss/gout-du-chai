// Stripe prévient le club ici : carte enregistrée, paiement réussi, paiement refusé.
// Adresse à déclarer dans Stripe : https://www.legoutduchai.fr/api/stripe/webhook
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { enregistrerCarte, marquerPaye, marquerRefuse } from "@/lib/paiements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ erreur: "webhook non configuré" }, { status: 500 });

  // Vérifie que le message vient bien de Stripe (signature).
  const corps = await request.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(corps, request.headers.get("stripe-signature"), secret);
  } catch {
    return NextResponse.json({ erreur: "signature invalide" }, { status: 400 });
  }

  const db = createAdminClient();
  try {
    const o = event.data.object;
    switch (event.type) {
      // Carte enregistrée depuis la page Stripe
      case "checkout.session.completed": {
        if (o.mode === "setup" && o.setup_intent && o.metadata?.member_id) {
          const si = await stripe().setupIntents.retrieve(o.setup_intent);
          if (si.payment_method) await enregistrerCarte(db, o.metadata.member_id, si.payment_method);
        }
        break;
      }
      // Paiement réussi (débit au déclenchement ou régularisation par le membre)
      case "payment_intent.succeeded": {
        const { domain_id, member_id, save_card } = o.metadata || {};
        if (domain_id && member_id) {
          await marquerPaye(db, { domainId: domain_id, memberId: member_id, piId: o.id });
          if (save_card === "1" && o.payment_method) await enregistrerCarte(db, member_id, o.payment_method);
        }
        break;
      }
      // Paiement refusé
      case "payment_intent.payment_failed": {
        const { domain_id, member_id } = o.metadata || {};
        if (domain_id && member_id) {
          await marquerRefuse(db, {
            domainId: domain_id,
            memberId: member_id,
            piId: o.id,
            motif: o.last_payment_error?.decline_code || o.last_payment_error?.code,
          });
        }
        break;
      }
      default:
        break;
    }
  } catch {
    // Stripe renverra le message plus tard : on signale l'échec.
    return NextResponse.json({ erreur: "traitement impossible" }, { status: 500 });
  }

  return NextResponse.json({ recu: true });
}
