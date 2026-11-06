"use server";

import { redirect } from "next/navigation";
import { requireAdmin, ACTIVE_RESERVATION } from "@/lib/data";
import { envoyer } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";
import { aPayerParMembre, debiterMembre } from "@/lib/paiements";

// Étape suivante autorisée pour un domaine
const SUIVANT = { a_venir: "ouvert", ouvert: "declenche", bientot_atteint: "declenche", declenche: "expedie", expedie: "livre" };

const MESSAGES = {
  ouvert: (d) => ({ title: d.name, body: "Les réservations sont ouvertes. Vous suivez ce domaine." }),
  declenche: (d) => ({ title: "Commande déclenchée", body: `Votre commande ${d.name} est déclenchée. Merci de votre confiance.` }),
  expedie: (d) => ({ title: "Vos bouteilles sont en route", body: `Votre commande ${d.name} a été expédiée.` }),
  livre: (d) => ({ title: "Commande livrée", body: `Votre commande ${d.name} est livrée. Belle dégustation !` }),
};

async function reservations(supabase, domainId) {
  const { data } = await supabase
    .from("reservations")
    .select("id, member_id, cuvees!inner(domain_id)")
    .eq("cuvees.domain_id", domainId)
    .in("status", ACTIVE_RESERVATION);
  return data || [];
}

export async function avancerSuivi(formData) {
  const { supabase } = await requireAdmin();
  const id = formData.get("id");
  const slug = formData.get("slug");
  const vers = formData.get("vers");
  const notifier = formData.get("notifier") === "1";

  const { data: d } = await supabase.from("domains").select("id, name, status").eq("id", id).maybeSingle();
  if (!d || SUIVANT[d.status] !== vers) redirect(`/admin/domaine/${slug}?erreurSuivi=1`);

  const { error } = await supabase.from("domains").update({ status: vers }).eq("id", id);
  if (error) redirect(`/admin/domaine/${slug}?erreurSuivi=1`);

  let envoye = 0;
  if (notifier) {
    // Ouverture : les membres qui suivent le domaine. Ensuite : ses réservataires.
    const membres =
      vers === "ouvert"
        ? ((await supabase.from("domain_follows").select("member_id").eq("domain_id", id)).data || []).map((f) => f.member_id)
        : [...new Set((await reservations(supabase, id)).map((r) => r.member_id))];
    if (membres.length) {
      const url = vers === "ouvert" ? `/club/domaine/${slug}` : "/club/membre";
      const res = await envoyer(supabase, { userIds: membres, ...MESSAGES[vers](d), url, tag: `suivi-${id}` });
      envoye = res.ok || 0;
    }
  }
  redirect(`/admin/domaine/${slug}?suivi=${vers}&envoye=${envoye}`);
}

// Date de livraison annoncée aux membres (vide = pas encore connue)
export async function fixerLivraison(formData) {
  const { supabase } = await requireAdmin();
  const id = formData.get("id");
  const slug = formData.get("slug");
  const brute = String(formData.get("expected_delivery") || "").trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(brute) ? brute : null;
  const notifier = formData.get("notifier") === "1";

  const { data: d } = await supabase.from("domains").select("id, name").eq("id", id).maybeSingle();
  if (!d) redirect(`/admin/domaine/${slug}?erreurSuivi=1`);

  const { error } = await supabase.from("domains").update({ expected_delivery: date }).eq("id", id);
  if (error) redirect(`/admin/domaine/${slug}?erreurSuivi=1`);

  let envoye = 0;
  if (notifier && date) {
    const membres = [...new Set((await reservations(supabase, id)).map((r) => r.member_id))];
    if (membres.length) {
      const jour = new Date(`${date}T12:00:00Z`).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "Europe/Paris",
      });
      const res = await envoyer(supabase, {
        userIds: membres,
        title: "Date de livraison",
        body: `Votre commande ${d.name} est prévue pour le ${jour}.`,
        url: "/club/membre",
        tag: `livraison-${id}`,
      });
      envoye = res.ok || 0;
    }
  }
  redirect(`/admin/domaine/${slug}?livraison=${date ? 1 : 0}&envoye=${envoye}`);
}

export async function marquerPaye(formData) {
  const { supabase } = await requireAdmin();
  const domainId = formData.get("domain_id");
  const slug = formData.get("slug");
  const memberId = formData.get("member_id");
  const paye = formData.get("paye") === "1";

  const { data: d } = await supabase.from("domains").select("id, name").eq("id", domainId).maybeSingle();
  const lignes = (await reservations(supabase, domainId)).filter((r) => r.member_id === memberId).map((r) => r.id);
  if (!d || lignes.length === 0) redirect(`/admin/domaine/${slug}?erreurSuivi=1`);

  const { error } = await supabase
    .from("reservations")
    .update({ status: paye ? "payee" : "confirmee" })
    .in("id", lignes);
  if (error) redirect(`/admin/domaine/${slug}?erreurSuivi=1`);

  // Paiement Stripe du membre : aligné sur le marquage manuel (payé hors Stripe, ou à redébiter).
  try {
    const db = createAdminClient();
    if (paye) {
      await db.from("payments").update({ status: "payee", error: null, updated_at: new Date().toISOString() })
        .eq("domain_id", domainId).eq("member_id", memberId);
    } else {
      await db.from("payments").delete().eq("domain_id", domainId).eq("member_id", memberId).eq("status", "payee");
    }
  } catch {
    // paiement Stripe pas encore configuré : le marquage manuel suffit
  }

  if (paye) {
    await envoyer(supabase, {
      userIds: [memberId],
      title: "Paiement reçu",
      body: `Merci, votre paiement pour ${d.name} est bien enregistré.`,
      url: "/club/membre",
      tag: `paiement-${domainId}`,
    });
  }
  redirect(`/admin/domaine/${slug}?paye=${paye ? 1 : 0}`);
}

// Débite la carte enregistrée de chaque réservataire pas encore payé.
export async function debiterCartes(formData) {
  await requireAdmin();
  const id = formData.get("id");
  const slug = formData.get("slug");
  let bilan = null;
  let erreur = "1";
  try {
    const db = createAdminClient();
    const { data: d } = await db.from("domains").select("id, name, status").eq("id", id).maybeSingle();
    if (d && ["declenche", "expedie", "livre"].includes(d.status)) {
      bilan = { payee: 0, action_requise: 0, refusee: 0, sans_carte: 0, en_cours: 0 };
      const parMembre = await aPayerParMembre(db, d.id);
      for (const lignes of Object.values(parMembre)) {
        const r = await debiterMembre(db, d, lignes);
        if (r in bilan) bilan[r]++;
      }
    } else {
      erreur = "statut";
    }
  } catch (e) {
    erreur = String(e?.message || "").includes("cle_") ? "cles" : "1";
  }
  if (!bilan) redirect(`/admin/domaine/${slug}?erreurDebit=${erreur}`);
  const b = bilan;
  redirect(`/admin/domaine/${slug}?debit=${b.payee}-${b.action_requise}-${b.refusee}-${b.sans_carte}-${b.en_cours}`);
}
