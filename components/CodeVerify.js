"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { withTimeout } from "@/lib/withTimeout";

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
    if (loading) return;
    if (clean.length < 6) {
      setError("Saisissez les 6 chiffres du code reçu par e-mail.");
      document.getElementById("otp")?.focus();
      return;
    }
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await withTimeout(supabase.auth.verifyOtp({ email, token: clean, type: "email" }));
    if (error) {
      setLoading(false);
      setError(
        error.message === "timeout"
          ? "Le réseau ne répond pas. Vérifiez votre connexion, puis réessayez."
          : "Ce code est incorrect ou a expiré. Vérifiez-le ou demandez-en un nouveau."
      );
      return;
    }
    // Crée la fiche membre à la première connexion (sans effet ensuite).
    const { error: signupError } = await withTimeout(supabase.rpc("complete_signup"));
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
    setResent(false);
    const ok = await onResend();
    if (ok) setResent(true);
    else setError("Le nouveau code n'a pas pu partir. Attendez une minute, puis réessayez.");
  }

  return (
    <form onSubmit={onSubmit} className="stack" style={{ textAlign: "center" }} noValidate>
      <p className="eyebrow">E-mail envoyé</p>
      <h2>Saisissez votre code</h2>
      <p className="muted">
        Nous avons envoyé un code à <strong>{email}</strong>. Saisissez-le ici,
        ou touchez le bouton de l&apos;e-mail.
      </p>
      <div>
        <input
          id="otp"
          className="otp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={8}
          placeholder="••••••"
          aria-label="Code reçu par e-mail"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "err-otp" : undefined}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, ""));
            if (error) setError("");
          }}
          autoFocus
        />
        {error && (
          <p className="error field-err" id="err-otp" role="alert">
            {error}
          </p>
        )}
        {resent && !error && (
          <p className="success field-err" role="status">
            Un nouveau code vient de partir.
          </p>
        )}
      </div>
      <button className="btn" disabled={loading}>
        {loading ? "Vérification…" : "Entrer dans le club"}
      </button>
      <button type="button" className="link-btn" onClick={resend}>
        Je n&apos;ai rien reçu : renvoyer un code
      </button>
    </form>
  );
}
