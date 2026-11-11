"use server";

import { createClient } from "@/lib/supabase/server";

const TYPES = ["envie", "idee", "probleme"];

// Boîte à idées : envoi d’un message par un membre (envie de vin, idée, problème).
export async function envoyerIdee(_prev, formData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erreur: "Votre session a expiré : reconnectez-vous puis réessayez." };

  const kind = (formData.get("kind") || "").toString();
  const message = (formData.get("message") || "").toString().trim();
  const sujet = (formData.get("sujet") || "").toString().trim().slice(0, 200) || null;
  const page = (formData.get("page") || "").toString().slice(0, 300) || null;

  if (!TYPES.includes(kind)) return { ok: false, erreur: "Choisissez d’abord le type de message." };
  if (message.length < 3) return { ok: false, erreur: "Écrivez quelques mots avant d’envoyer." };
  if (message.length > 2000) return { ok: false, erreur: "Votre message est un peu long : 2 000 caractères au maximum." };

  const { error } = await supabase.from("feedbacks").insert({ member_id: user.id, kind, message, sujet, page });
  if (error) return { ok: false, erreur: "L’envoi a échoué. Réessayez dans un instant." };
  return { ok: true };
}
