"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: false, // seuls les membres existants peuvent se connecter ici
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
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
    return (
      <div className="stack" style={{ textAlign: "center" }}>
        <p className="eyebrow">E-mail envoyé</p>
        <h2>Vérifiez votre boîte mail</h2>
        <p className="muted">
          Ouvrez le lien reçu sur <strong>{email}</strong> depuis ce même appareil.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="stack">
      <div>
        <label htmlFor="email">E-mail</label>
        <input id="email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={loading || !email.trim()}>
        {loading ? "Envoi…" : "Recevoir mon lien"}
      </button>
    </form>
  );
}
