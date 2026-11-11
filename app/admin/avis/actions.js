"use server";

import { redirect } from "next/navigation";
import { requireAdmin, ACTIVE_RESERVATION } from "@/lib/data";
import { envoyer } from "@/lib/push";

// Masque ou réaffiche un avis.
export async function basculerAvis(formData) {
  const { supabase } = await requireAdmin();
  const id = formData.get("id");
  const masquer = formData.get("masquer") === "1";
  const { error } = await supabase.from("cuvee_reviews").update({ hidden: masquer }).eq("id", id);
  redirect(error ? "/admin/avis?erreur=1" : `/admin/avis?masque=${masquer ? 1 : 0}`);
}

// Masque ou réaffiche le mot laissé sur un domaine.
export async function basculerReco(formData) {
  const { supabase } = await requireAdmin();
  const id = formData.get("id");
  const masquer = formData.get("masquer") === "1";
  const { error } = await supabase.from("domain_reviews").update({ hidden: masquer }).eq("id", id);
  redirect(error ? "/admin/avis?erreur=1" : `/admin/avis?masque=${masquer ? 1 : 0}`);
}

// Invite par notification les réservataires d'un domaine livré qui n'ont encore rien répondu
// (ni avis sur une cuvée, ni recommandation du domaine, ni « Plus tard »).
export async function inviterAvis(formData) {
  const { supabase } = await requireAdmin();
  const id = formData.get("domain_id");

  const { data: d } = await supabase.from("domains").select("id, name, slug, status").eq("id", id).maybeSingle();
  if (!d || d.status !== "livre") redirect("/admin/avis?erreur=1");

  const [{ data: resas }, { data: deja }, { data: recos }] = await Promise.all([
    supabase
      .from("reservations")
      .select("member_id, cuvees!inner(domain_id)")
      .eq("cuvees.domain_id", id)
      .in("status", ACTIVE_RESERVATION),
    supabase.from("cuvee_reviews").select("member_id, cuvees!inner(domain_id)").eq("cuvees.domain_id", id),
    supabase.from("domain_reviews").select("member_id").eq("domain_id", id),
  ]);
  const ontNote = new Set([...(deja || []), ...(recos || [])].map((r) => r.member_id));
  const membres = [...new Set((resas || []).map((r) => r.member_id))].filter((m) => !ontNote.has(m));

  let envoye = 0;
  if (membres.length) {
    const res = await envoyer(supabase, {
      userIds: membres,
      title: `Votre avis sur ${d.name}`,
      body: "Vous avez goûté vos bouteilles ? Dites-nous si vous recommandez le domaine, en un geste.",
      url: `/club/domaine/${d.slug}#cuvees`,
      tag: `avis-${id}`,
    });
    envoye = res.ok || 0;
  }
  redirect(`/admin/avis?invite=${membres.length}&envoye=${envoye}`);
}
