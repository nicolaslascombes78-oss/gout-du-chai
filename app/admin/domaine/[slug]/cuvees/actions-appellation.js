"use server";

import { requireAdmin } from "@/lib/data";
import { updateCuveeFiche } from "@/app/admin/actions";

// Fiche détaillée d'une cuvée : enregistre l'appellation, puis le reste de la fiche comme avant.
export async function updateCuveeFicheAvecAppellation(formData) {
  const { supabase } = await requireAdmin();
  const id = formData.get("id");
  const appellation = (formData.get("appellation") || "").toString().trim() || null;
  if (id) await supabase.from("cuvees").update({ appellation }).eq("id", id);
  return updateCuveeFiche(formData);
}
