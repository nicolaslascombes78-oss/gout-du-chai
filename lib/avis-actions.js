"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/data";
import { AVIS_MAX_TAGS, AVIS_MAX_TEXTE, AVIS_TAGS } from "@/lib/avis";

// Enregistre (ou met à jour) l'avis du membre sur une cuvée.
// Le droit de donner un avis (cuvée réservée et commande livrée) est vérifié par la base.
export async function enregistrerAvis({ cuveeId, slug, rating, tags, comment }) {
  const { supabase, member } = await requireMember();
  const note = Math.round(Number(rating));
  if (!cuveeId || !(note >= 1 && note <= 5)) return { ok: false, erreur: "note" };

  const choisis = [...new Set((Array.isArray(tags) ? tags : []).filter((t) => AVIS_TAGS.includes(t)))].slice(
    0,
    AVIS_MAX_TAGS
  );
  const texte = String(comment || "").trim().slice(0, AVIS_MAX_TEXTE) || null;

  const { error } = await supabase
    .from("cuvee_reviews")
    .upsert(
      { cuvee_id: cuveeId, member_id: member.id, rating: note, tags: choisis, comment: texte },
      { onConflict: "cuvee_id,member_id" }
    );
  if (error) return { ok: false, erreur: "droit" };

  if (slug) revalidatePath(`/club/domaine/${slug}`);
  return { ok: true };
}

// Retire l'avis du membre sur une cuvée.
export async function retirerAvis({ cuveeId, slug }) {
  const { supabase, member } = await requireMember();
  if (!cuveeId) return { ok: false };
  const { error } = await supabase.from("cuvee_reviews").delete().eq("cuvee_id", cuveeId).eq("member_id", member.id);
  if (error) return { ok: false };
  if (slug) revalidatePath(`/club/domaine/${slug}`);
  return { ok: true };
}
