"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import CodeVerify from "@/components/CodeVerify";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const address = email.trim().toLowerCase();

  async function send() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: {
        shouldCreateUser: false, // seuls les membres existants peuvent se connecter ici
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return error;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const error = await send();
    setLoading(false);
    if (error) {
      setError(
        error.status === 429
          ? "Trop de demandes en peu de temps. Merci de réessayer dans quelques minutes."
          : "Cette adresse ne correspond à aucun membre du club."
      );
      return;
    }
    setSent(true);
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
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={loading || !email.trim()}>
        {loading ? "Envoi…" : "Recevoir mon code"}
      </button>
    </form>
  );
}
