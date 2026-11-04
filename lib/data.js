import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Vérifie la session + la fiche membre. Redirige sinon.
export async function requireMember() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: member } = await supabase
    .from("members")
    .select("id, first_name, last_name, email, member_number, invites_left, created_at, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!member) {
    const { error } = await supabase.rpc("complete_signup");
    if (error) redirect("/?erreur=invitation");
    redirect("/club");
  }
  return { supabase, member };
}

// Domaines + avancement + résumé des cuvées (couleurs, prix mini, coups de cœur).
export async function loadSelection(supabase) {
  const [{ data: domains }, { data: progress }, { data: cuvees }] = await Promise.all([
    supabase
      .from("domains")
      .select("id, slug, name, region, appellation, tagline, threshold, deadline, status, tags, sort_order, created_at, photos, photo_logo, photo_bg")
      .eq("is_allocation", false)
      .order("sort_order")
      .order("region")
      .order("name"),
    supabase.from("domain_progress").select("domain_id, reserved_bottles, participants"),
    supabase.from("cuvees").select("domain_id, color, member_price, is_favorite").eq("active", true),
  ]);

  const prog = Object.fromEntries((progress || []).map((p) => [p.domain_id, p]));
  const summary = {};
  for (const c of cuvees || []) {
    const s = (summary[c.domain_id] ||= { colors: new Set(), minPrice: Infinity, favorite: false, count: 0 });
    s.colors.add(c.color);
    s.minPrice = Math.min(s.minPrice, Number(c.member_price));
    s.favorite ||= c.is_favorite;
    s.count++;
  }

  return (domains || []).map((d) => {
    const s = summary[d.id];
    const p = prog[d.id] || { reserved_bottles: 0, participants: 0 };
    return {
      ...d,
      reserved: p.reserved_bottles,
      participants: p.participants,
      colors: s ? [...s.colors] : [],
      minPrice: s && s.minPrice !== Infinity ? s.minPrice : null,
      favorite: s?.favorite || false,
      cuveeCount: s?.count || 0,
    };
  });
}

// Réservé aux administrateurs du club.
export async function requireAdmin() {
  const ctx = await requireMember();
  if (!ctx.member.is_admin) redirect("/club");
  return ctx;
}

export const ACTIVE_RESERVATION = ["en_attente", "confirmee", "payee"];
