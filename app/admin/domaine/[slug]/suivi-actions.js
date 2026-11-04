"use server";

import { redirect } from "next/navigation";
import { requireAdmin, ACTIVE_RESERVATION } from "@/lib/data";
import { envoyer } from "@/lib/push";

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
