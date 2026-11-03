"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Connexion par code : le membre reste dans son navigateur habituel
// (Safari, Chrome…) au lieu d'ouvrir le lien dans l'appli mail.
export default function CodeVerify({ email, onResend }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resent, setResent] = useState(false);

  const clean = code.replace(/\D/g, "");

  async function onSubmit(e) {
    e.preventDefault();
    if (clean.length < 6) return;
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: clean,
      type: "email",
    });
    if (error) {
      setLoading(false);
      setError("Ce code est incorrect ou a expiré. Vérifiez-le ou demandez-en un nouveau.");
      return;
    }
    // Crée la fiche membre à la première connexion (sans effet ensuite).
    const { error: signupError } = await supabase.rpc("complete_signup");
    if (signupError) {
      await supabase.auth.signOut();
      setLoading(false);
      setError("Ce code d'invitation n'est plus valable. Demandez un nouveau code à votre parrain.");
      return;
    }
    // Rechargement complet pour que le serveur lise la nouvelle session.
    window.location.href = "/club";
  }

  async function resend() {
    setError("");
    const ok = await onResend();
    setResent(ok);
  }

  return (
    <form onSubmit={onSubmit} className="stack" style={{ textAlign: "center" }}>
      <p className="eyebrow">E-mail envoyé</p>
      <h2>Saisissez votre code</h2>
      <p className="muted">
        Nous avons envoyé un code à <strong>{email}</strong>. Saisissez-le ici,
        ou touchez le bouton de l&apos;e-mail.
      </p>
      <input
        className="otp"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={8}
        placeholder="••••••"
        aria-label="Code reçu par e-mail"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        autoFocus
      />
      {error && <p className="error">{error}</p>}
      {resent && !error && <p className="success">Un nouveau code vient de partir.</p>}
      <button className="btn" disabled={loading || clean.length < 6}>
        {loading ? "Vérification…" : "Entrer dans le club"}
      </button>
      <button type="button" className="link-btn" onClick={resend}>
        Je n&apos;ai rien reçu : renvoyer un code
      </button>
    </form>
  );
}
