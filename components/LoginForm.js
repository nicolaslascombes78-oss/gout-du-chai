"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { withTimeout, sendError } from "@/lib/withTimeout";
import CodeVerify from "@/components/CodeVerify";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const address = email.trim().toLowerCase();

  async function send() {
    const supabase = createClient();
    const { error } = await withTimeout(
      supabase.auth.signInWithOtp({
        email: address,
        options: {
          shouldCreateUser: false, // seuls les membres existants peuvent se connecter ici
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
    );
    return error;
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      const err = await send();
      if (err) {
        const unknown = err.message !== "timeout" && err.status !== 429 && !/rate|seconds/i.test(err.message || "");
        setError(
          unknown
            ? "Cette adresse ne correspond à aucun membre. Si vous avez reçu une invitation, inscrivez-vous depuis l'accueil avec votre code."
            : sendError(err)
        );
        return;
      }
      setSent(true);
    } catch {
      setError("Une erreur inattendue est survenue. Réessayez dans un instant.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return <CodeVerify email={address} onResend={async () => !(await send())} />;
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <div>
        <label htmlFor="email">E-mail</label>
        <input id="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="btn" disabled={loading || !email.trim()}>
        {loading ? "Envoi…" : "Recevoir mon code"}
      </button>
    </form>
  );
}
