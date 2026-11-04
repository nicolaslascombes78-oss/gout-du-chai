"use server";

import { redirect } from "next/navigation";
import { requireAdmin, ACTIVE_RESERVATION } from "@/lib/data";
import { envoyer } from "@/lib/push";

export async function envoyerNotification(formData) {
  const { supabase, member } = await requireAdmin();
  const type = formData.get("type");
  const domainId = formData.get("domain_id");

  let message;
  let userIds = null;

  if (type === "test") {
    userIds = [member.id];
    message = {
      title: "Le Goût du Chai",
      body: "Notification d'essai : tout fonctionne.",
      url: "/club",
      tag: "essai",
    };
  } else {
    const { data: d } = await supabase
      .from("domains")
      .select("id, name, slug, threshold")
      .eq("id", domainId)
      .maybeSingle();
    if (!d) redirect("/admin/notifications?erreur=domaine");
    const url = `/club/domaine/${d.slug}`;

    if (type === "nouveau") {
      message = { title: "Nouveau domaine", body: `${d.name} rejoint la Sélection.`, url, tag: `nouveau-${d.id}` };
    } else if (type === "relance") {
      const { data: p } = await supabase
        .from("domain_progress")
        .select("reserved_bottles")
        .eq("domain_id", d.id)
        .maybeSingle();
      const reste = Math.max(0, (d.threshold || 0) - (p?.reserved_bottles || 0));
      if (!d.threshold || reste === 0) redirect("/admin/notifications?erreur=seuil");
      message = {
        title: d.name,
        body: `Plus que ${reste} bouteille${reste > 1 ? "s" : ""} pour déclencher la commande.`,
        url,
        tag: `seuil-${d.id}`,
      };
    } else if (type === "declenche") {
      const { data: resa } = await supabase
        .from("reservations")
        .select("member_id, cuvees!inner(domain_id)")
        .eq("cuvees.domain_id", d.id)
        .in("status", ACTIVE_RESERVATION);
      userIds = [...new Set((resa || []).map((r) => r.member_id))];
      if (userIds.length === 0) redirect("/admin/notifications?erreur=reservataires");
      message = {
        title: "Commande déclenchée",
        body: `Votre commande ${d.name} est déclenchée. Merci de votre confiance.`,
        url: "/club/membre",
        tag: `declenche-${d.id}`,
      };
    } else {
      redirect("/admin/notifications?erreur=type");
    }
  }

  const res = await envoyer(supabase, { userIds, ...message });
  if (res.erreur) redirect(`/admin/notifications?erreur=${res.erreur}`);
  redirect(`/admin/notifications?envoye=${res.ok}&echec=${res.echec}`);
}
