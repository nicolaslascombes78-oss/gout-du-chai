"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import CodeVerify from "@/components/CodeVerify";

export default function JoinForm({ code }) {
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "" });
  const [adult, setAdult] = useState(false);
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const ready = form.first_name.trim() && form.last_name.trim() && form.email.trim() && adult && terms;
  const address = form.email.trim().toLowerCase();

  async function send() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: address,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          invite_code: code,
          is_adult: true,
          accepted_terms: true,
        },
      },
    });
    return error;
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!ready) return;
    setError("");
    setLoading(true);
    const supabase = createClient();

    // Revérifie le code juste avant l'envoi.
    const { data: valid } = await supabase.rpc("check_invitation", { p_code: code });
    if (!valid) {
      setLoading(false);
      setError("Ce code d'invitation n'est plus valable.");
      return;
    }

    const error = await send();
    setLoading(false);
    if (error) {
      setError(
        error.status === 429
          ? "Trop de demandes en peu de temps. Merci de réessayer dans quelques minutes."
          : "L'envoi de l'e-mail a échoué. Vérifiez l'adresse et réessayez."
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
      <p className="muted">
        Code d&apos;invitation : <strong style={{ color: "var(--gold-soft)" }}>{code}</strong>
      </p>
      <div>
        <label htmlFor="first_name">Prénom</label>
        <input id="first_name" type="text" autoComplete="given-name" value={form.first_name} onChange={set("first_name")} />
      </div>
      <div>
        <label htmlFor="last_name">Nom</label>
        <input id="last_name" type="text" autoComplete="family-name" value={form.last_name} onChange={set("last_name")} />
      </div>
      <div>
        <label htmlFor="email">E-mail</label>
        <input id="email" type="email" autoComplete="email" inputMode="email" value={form.email} onChange={set("email")} />
      </div>
      <label className="check">
        <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} />
        Je certifie avoir 18 ans ou plus.
      </label>
      <label className="check">
        <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
        J&apos;accepte les conditions du club.
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={loading || !ready}>
        {loading ? "Envoi…" : "Recevoir mon code d'accès"}
      </button>
    </form>
  );
}
