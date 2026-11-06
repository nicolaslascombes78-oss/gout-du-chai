import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Point d'arrivée du lien magique : ouvre la session puis crée la fiche membre
// (à la première connexion) à partir du code d'invitation.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Page où revenir après la connexion (seulement une page du club).
  const n = searchParams.get("next") || "";
  const suite = n.startsWith("/club") && !n.startsWith("//") ? n : "/club";

  if (!code) return NextResponse.redirect(`${origin}/?erreur=lien`);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/?erreur=lien`);

  const { error: signupError } = await supabase.rpc("complete_signup");
  if (signupError) {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/?erreur=invitation`);
  }

  return NextResponse.redirect(`${origin}${suite}`);
}
