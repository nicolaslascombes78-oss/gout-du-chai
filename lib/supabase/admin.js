// Accès complet à la base, réservé au serveur (paiements, webhook Stripe).
// La clé est lue dans les variables Vercel : jamais dans le code, jamais dans le navigateur.
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !cle) throw new Error("cle_service_absente");
  return createClient(url, cle, { auth: { persistSession: false, autoRefreshToken: false } });
}
