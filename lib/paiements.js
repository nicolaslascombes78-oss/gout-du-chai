// Paiements des commandes groupées (côté serveur uniquement).
// Principe : la carte du membre est enregistrée chez Stripe ; elle n'est débitée
// qu'au déclenchement de la commande d'un domaine, du montant exact de ses bouteilles.
import { stripe, enCentimes } from "@/lib/stripe";
import { envoyer } from "@/lib/push";

const A_PAYER = ["en_attente", "confirmee"];

// ---- Client Stripe du membre et carte enregistrée ----

export async function carteDuMembre(db, memberId) {
  const { data } = await db.from("member_cards").select("*").eq("member_id", memberId).maybeSingle();
  return data;
}

// Crée la fiche client Stripe du membre la première fois.
export async function clientStripe(db, member) {
  const carte = await carteDuMembre(db, member.id);
  if (carte?.stripe_customer_id) return carte.stripe_customer_id;

  const client = await stripe().customers.create(
    {
      email: member.email || undefined,
      name: `${member.first_name || ""} ${member.last_name || ""}`.trim() || undefined,
      metadata: { member_id: member.id, member_number: String(member.member_number ?? "") },
    },
    { idempotencyKey: `client-${member.id}` }
  );
  const { error } = await db
    .from("member_cards")
    .upsert({ member_id: member.id, stripe_customer_id: client.id, updated_at: new Date().toISOString() });
  if (error) throw error;
  return client.id;
}

// Mémorise la carte enregistrée (référence Stripe, marque, 4 derniers chiffres, expiration).
export async function enregistrerCarte(db, memberId, paymentMethodId) {
  const pm = await stripe().paymentMethods.retrieve(paymentMethodId);
  const customer = typeof pm.customer === "string" ? pm.customer : pm.customer?.id;
  if (!customer) return false;

  // Sécurité : la carte doit appartenir au client Stripe de ce membre.
  const existante = await carteDuMembre(db, memberId);
  if (existante?.stripe_customer_id && existante.stripe_customer_id !== customer) return false;

  await stripe().customers.update(customer, { invoice_settings: { default_payment_method: pm.id } });
  const c = pm.card || {};
  const exp = c.exp_month ? `${String(c.exp_month).padStart(2, "0")}/${String(c.exp_year).slice(-2)}` : null;
  const { error } = await db.from("member_cards").upsert({
    member_id: memberId,
    stripe_customer_id: customer,
    payment_method: pm.id,
    brand: c.brand || null,
    last4: c.last4 || null,
    exp,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
  return true;
}

// ---- Réservations à payer ----

// Lignes encore à payer pour un domaine, regroupées par membre.
export async function aPayerParMembre(db, domainId) {
  const { data, error } = await db
    .from("reservations")
    .select("id, member_id, quantity, unit_price, status, cuvees!inner(domain_id)")
    .eq("cuvees.domain_id", domainId)
    .in("status", A_PAYER)
    .eq("archived", false);
  if (error) throw error;
  const parMembre = {};
  for (const r of data || []) {
    const m = (parMembre[r.member_id] ||= { memberId: r.member_id, ids: [], cents: 0 });
    m.ids.push(r.id);
    m.cents += r.quantity * enCentimes(r.unit_price);
  }
  return parMembre;
}

async function majPaiement(db, domainId, memberId, champs) {
  const { data, error } = await db
    .from("payments")
    .upsert(
      { domain_id: domainId, member_id: memberId, ...champs, updated_at: new Date().toISOString() },
      { onConflict: "domain_id,member_id" }
    )
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

// Paiement réussi : réservations payées, membre prévenu. Sans effet si déjà fait.
export async function marquerPaye(db, { domainId, memberId, piId }) {
  const { data: avant } = await db
    .from("payments")
    .select("status")
    .eq("domain_id", domainId)
    .eq("member_id", memberId)
    .maybeSingle();
  const dejaPaye = avant?.status === "payee";

  const lignes = (await aPayerParMembre(db, domainId))[memberId];
  if (lignes?.ids.length) {
    const { error } = await db
      .from("reservations")
      .update({ status: "payee", paid_at: new Date().toISOString() })
      .in("id", lignes.ids);
    if (error) throw error;
  }
  await majPaiement(db, domainId, memberId, {
    status: "payee",
    error: null,
    ...(piId ? { stripe_payment_intent: piId } : {}),
    ...(avant ? {} : { amount_cents: lignes?.cents || 0 }),
  });

  if (!dejaPaye) {
    const { data: d } = await db.from("domains").select("name").eq("id", domainId).maybeSingle();
    await envoyer(db, {
      userIds: [memberId],
      title: "Paiement reçu",
      body: `Merci, votre paiement pour ${d?.name || "votre commande"} est bien enregistré.`,
      url: "/club/membre",
      tag: `paiement-${domainId}`,
    }).catch(() => {});
  }
}

// ---- Débit au déclenchement ----

// Débite un membre pour un domaine. Renvoie le résultat : payee, action_requise, refusee, sans_carte, en_cours, ignore.
export async function debiterMembre(db, domain, lignes) {
  const memberId = lignes.memberId;
  const montant = lignes.cents;
  if (montant <= 0) return "ignore";

  const { data: existant } = await db
    .from("payments")
    .select("id, status, updated_at")
    .eq("domain_id", domain.id)
    .eq("member_id", memberId)
    .maybeSingle();
  // Déjà payé, ou en attente de validation par le membre : on ne redébite pas.
  if (existant?.status === "payee" || existant?.status === "action_requise") return "ignore";
  // Débit lancé il y a moins de 10 minutes : on attend la réponse de Stripe.
  if (existant?.status === "en_cours" && Date.now() - new Date(existant.updated_at).getTime() < 10 * 60 * 1000) {
    return "ignore";
  }

  const carte = await carteDuMembre(db, memberId);
  if (!carte?.payment_method) {
    await majPaiement(db, domain.id, memberId, { amount_cents: montant, status: "sans_carte", error: null });
    await envoyer(db, {
      userIds: [memberId],
      title: "Votre commande est lancée",
      body: `Enregistrez votre carte pour régler votre commande ${domain.name}.`,
      url: "/club/membre/carte",
      tag: `paiement-${domain.id}`,
    }).catch(() => {});
    return "sans_carte";
  }

  await majPaiement(db, domain.id, memberId, { amount_cents: montant, status: "en_cours", error: null });

  const minute = Math.floor(Date.now() / 60000);
  try {
    const pi = await stripe().paymentIntents.create(
      {
        amount: montant,
        currency: "eur",
        customer: carte.stripe_customer_id,
        payment_method: carte.payment_method,
        off_session: true,
        confirm: true,
        description: `Le Goût du Chai — commande ${domain.name}`,
        metadata: { domain_id: domain.id, member_id: memberId },
      },
      { idempotencyKey: `debit-${domain.id}-${memberId}-${montant}-${minute}` }
    );
    if (pi.status === "succeeded") {
      await marquerPaye(db, { domainId: domain.id, memberId, piId: pi.id });
      return "payee";
    }
    if (pi.status === "requires_action") {
      await aValider(db, domain, memberId, pi.id);
      return "action_requise";
    }
    await majPaiement(db, domain.id, memberId, { status: "en_cours", stripe_payment_intent: pi.id });
    return "en_cours";
  } catch (e) {
    const pi = e?.raw?.payment_intent;
    if (e?.code === "authentication_required") {
      await aValider(db, domain, memberId, pi?.id || null);
      return "action_requise";
    }
    await majPaiement(db, domain.id, memberId, {
      status: "refusee",
      stripe_payment_intent: pi?.id || null,
      error: (e?.decline_code || e?.code || e?.message || "erreur").toString().slice(0, 200),
    });
    await envoyer(db, {
      userIds: [memberId],
      title: "Paiement refusé",
      body: `Le paiement de votre commande ${domain.name} n'a pas abouti. Touchez pour régulariser.`,
      url: "/club/membre/carte",
      tag: `paiement-${domain.id}`,
    }).catch(() => {});
    return "refusee";
  }
}

// La banque demande une validation (3D Secure) : le membre la fait depuis son espace.
async function aValider(db, domain, memberId, piId) {
  await majPaiement(db, domain.id, memberId, { status: "action_requise", stripe_payment_intent: piId, error: null });
  await envoyer(db, {
    userIds: [memberId],
    title: "Validez votre paiement",
    body: `Votre banque demande une validation pour la commande ${domain.name}. Touchez pour la faire.`,
    url: "/club/membre/carte",
    tag: `paiement-${domain.id}`,
  }).catch(() => {});
}

// Paiement refusé par la banque après coup (signalé par le webhook).
export async function marquerRefuse(db, { domainId, memberId, piId, motif }) {
  const { data: p } = await db
    .from("payments")
    .select("status, stripe_payment_intent")
    .eq("domain_id", domainId)
    .eq("member_id", memberId)
    .maybeSingle();
  if (!p || p.status === "payee" || p.stripe_payment_intent !== piId) return;
  await majPaiement(db, domainId, memberId, { status: "refusee", error: (motif || "refus").slice(0, 200) });
}
