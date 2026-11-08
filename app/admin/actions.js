"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/data";

const STATUSES = ["a_venir", "ouvert", "bientot_atteint", "declenche", "livre", "expire"];

export async function updateDomain(formData) {
  const { supabase } = await requireAdmin();
  const id = formData.get("id");
  const slug = formData.get("slug");
  const status = formData.get("status");
  const threshold = parseInt(formData.get("threshold"), 10);
  const deadline = formData.get("deadline") || null;
  if (!STATUSES.includes(status)) redirect(`/admin/domaine/${slug}?erreur=statut`);

  const { error } = await supabase
    .from("domains")
    .update({ status, threshold: Number.isFinite(threshold) && threshold > 0 ? threshold : null, deadline })
    .eq("id", id);
  if (error) redirect(`/admin/domaine/${slug}?erreur=enregistrement`);
  revalidatePath("/admin");
  revalidatePath(`/admin/domaine/${slug}`);
  redirect(`/admin/domaine/${slug}?ok=1`);
}

function randomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/O ni 1/I
  let s = "";
  for (let i = 0; i < 5; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `CHAI-${s}`;
}

export async function createInvitation(formData) {
  const { supabase, member } = await requireAdmin();
  const code = (formData.get("code") || "").toString().trim().toUpperCase() || randomCode();
  const maxUses = Math.max(1, parseInt(formData.get("max_uses"), 10) || 1);
  const expires = formData.get("expires_at");
  const email = (formData.get("invited_email") || "").toString().trim().toLowerCase() || null;

  if (!/^[A-Z0-9-]{4,30}$/.test(code)) redirect("/admin/invitations?erreur=format");

  const { error } = await supabase.from("invitations").insert({
    code,
    max_uses: maxUses,
    expires_at: expires ? new Date(`${expires}T23:59:59`).toISOString() : null,
    invited_email: email,
    issuer_id: member.id,
  });
  if (error) redirect(`/admin/invitations?erreur=${error.code === "23505" ? "doublon" : "enregistrement"}`);
  revalidatePath("/admin/invitations");
  redirect(`/admin/invitations?nouveau=${encodeURIComponent(code)}`);
}

export async function disableInvitation(formData) {
  const { supabase } = await requireAdmin();
  await supabase
    .from("invitations")
    .update({ expires_at: new Date().toISOString(), status: "desactivee" })
    .eq("id", formData.get("id"));
  revalidatePath("/admin/invitations");
  redirect("/admin/invitations");
}

export async function updateMember(formData) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("admin_set_member", {
    p_member: formData.get("id"),
    p_invites: parseInt(formData.get("invites_left"), 10) || 0,
    p_status: formData.get("status"),
  });
  revalidatePath("/admin/membres");
  redirect(`/admin/membres?${error ? "erreur=1" : "ok=1"}`);
}

// Fiche détaillée d'une cuvée (page « Fiches des cuvées » de l'admin).
export async function updateCuveeFiche(formData) {
  const { supabase } = await requireAdmin();
  const id = formData.get("id");
  const slug = formData.get("slug");
  const txt = (k) => {
    const v = (formData.get(k) || "").toString().trim();
    return v || null;
  };
  const deg = parseFloat((formData.get("degre") || "").toString().replace(",", "."));
  const labels = formData
    .getAll("labels")
    .map(String)
    .filter((l) => ["bio", "biodynamie", "nature"].includes(l));
  const source = txt("source_fiche");

  const { error } = await supabase
    .from("cuvees")
    .update({
      description: (formData.get("description") || "").toString().trim(),
      cepages: txt("cepages"),
      elevage: txt("elevage"),
      accords: txt("accords"),
      service: txt("service"),
      garde: txt("garde"),
      degre: Number.isFinite(deg) && deg > 0 && deg < 100 ? Math.round(deg * 10) / 10 : null,
      labels: labels.length ? labels : null,
      source_fiche: source && /^https?:\/\//.test(source) ? source : null,
    })
    .eq("id", id);

  revalidatePath(`/admin/domaine/${slug}/cuvees`);
  revalidatePath(`/club/domaine/${slug}`);
  redirect(`/admin/domaine/${slug}/cuvees?${error ? "erreur=1" : `ok=${id}`}#c-${id}`);
}
