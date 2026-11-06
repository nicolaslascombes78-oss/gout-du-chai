"use client";

import "@/app/ergonomie.css";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { withTimeout, sendError } from "@/lib/withTimeout";
import CodeVerify from "@/components/CodeVerify";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function LoginForm({ next = null }) {
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
          emailRedirectTo: `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`,
        },
      })
    );
    return error;
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setError("");
    // Vérification avant l'envoi : le message s'affiche sous le champ.
    if (!EMAIL.test(address)) {
      setError(
        address
          ? "Cette adresse e-mail ne semble pas valide : vérifiez le @ et le domaine."
          : "Saisissez l'adresse e-mail de votre compte membre."
      );
      document.getElementById("email")?.focus();
      return;
    }
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
    return <CodeVerify email={address} next={next} onResend={async () => !(await send())} />;
  }

  return (
    <form onSubmit={onSubmit} className="stack" noValidate>
      <div>
        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError("");
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "err-email" : undefined}
        />
        {error && (
          <p className="error field-err" id="err-email" role="alert">
            {error}
          </p>
        )}
      </div>
      <button className="btn" disabled={loading}>
        {loading ? "Envoi…" : "Recevoir mon code"}
      </button>
    </form>
  );
}
