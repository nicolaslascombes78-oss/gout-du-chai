"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/data";
import { AVIS_MAX_TAGS, AVIS_MAX_TEXTE, AVIS_TAGS, RECO_MAX_TEXTE, VERDICTS } from "@/lib/avis";

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

// Recommandation du domaine (oui / peut_etre / non), ou « ignore » quand le membre touche « Plus tard ».
// Le droit de répondre (commande du domaine reçue) est vérifié par la base.
export async function repondreDomaine({ domainId, slug, verdict, comment }) {
  const { supabase, member } = await requireMember();
  if (!domainId || !(verdict in VERDICTS || verdict === "ignore")) return { ok: false };
  const texte = verdict === "ignore" ? null : String(comment || "").trim().slice(0, RECO_MAX_TEXTE) || null;

  const ligne = { domain_id: domainId, member_id: member.id, verdict };
  // Un commentaire vide envoyé avec la réponse ne doit pas effacer celui déjà écrit
  if (texte !== null || verdict === "ignore") ligne.comment = texte;
  const { error } = await supabase.from("domain_reviews").upsert(ligne, { onConflict: "domain_id,member_id" });
  if (error) return { ok: false };

  if (slug) revalidatePath(`/club/domaine/${slug}`);
  return { ok: true };
}
