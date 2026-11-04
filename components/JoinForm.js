"use client";

import "@/app/ergonomie.css";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { withTimeout, sendError } from "@/lib/withTimeout";
import CodeVerify from "@/components/CodeVerify";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function JoinForm({ code }) {
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "" });
  const [adult, setAdult] = useState(false);
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errs, setErrs] = useState({});
  const [sent, setSent] = useState(false);

  const clear = (k) => errs[k] && setErrs({ ...errs, [k]: "" });
  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    clear(k);
  };
  const address = form.email.trim().toLowerCase();

  // Une erreur par champ, affichée juste sous le champ concerné.
  function validate() {
    const e = {};
    if (!form.first_name.trim()) e.first_name = "Indiquez votre prénom.";
    if (!form.last_name.trim()) e.last_name = "Indiquez votre nom.";
    if (!EMAIL.test(address)) e.email = "Cette adresse e-mail ne semble pas valide : vérifiez le @ et le domaine.";
    if (!adult) e.adult = "Le club est réservé aux personnes majeures : cochez la case pour continuer.";
    if (!terms) e.terms = "Acceptez les conditions du club pour continuer.";
    setErrs(e);
    const first = ["first_name", "last_name", "email", "adult", "terms"].find((k) => e[k]);
    if (first) document.getElementById(first)?.focus();
    return !first;
  }

  async function send() {
    const supabase = createClient();
    const { error } = await withTimeout(
      supabase.auth.signInWithOtp({
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
      })
    );
    return error;
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (loading) return;
    setError("");
    if (!validate()) return;
    setLoading(true);
    try {
      const supabase = createClient();
      // Revérifie le code juste avant l'envoi.
      const { data: valid, error: checkError } = await withTimeout(
        supabase.rpc("check_invitation", { p_code: code })
      );
      if (checkError) {
        setError(sendError(checkError));
        return;
      }
      if (!valid) {
        setError("Ce code d'invitation n'est plus valable. Si vous êtes déjà membre, connectez-vous ci-dessous.");
        return;
      }
      const err = await send();
      if (err) {
        setError(sendError(err));
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

  const fieldErr = (k) =>
    errs[k] ? (
      <p className="error field-err" id={`err-${k}`} role="alert">
        {errs[k]}
      </p>
    ) : null;
  const aria = (k) => (errs[k] ? { "aria-invalid": true, "aria-describedby": `err-${k}` } : {});

  return (
    <form onSubmit={onSubmit} className="stack" noValidate>
      <p className="notice">
        Déjà membre ? <Link href="/connexion">Connectez-vous avec votre e-mail</Link>, inutile de vous réinscrire.
      </p>
      <p className="muted">
        Code d&apos;invitation : <strong style={{ color: "var(--gold-soft)" }}>{code}</strong>
      </p>
      <div>
        <label htmlFor="first_name">Prénom</label>
        <input
          id="first_name"
          type="text"
          autoComplete="given-name"
          value={form.first_name}
          onChange={set("first_name")}
          {...aria("first_name")}
        />
        {fieldErr("first_name")}
      </div>
      <div>
        <label htmlFor="last_name">Nom</label>
        <input
          id="last_name"
          type="text"
          autoComplete="family-name"
          value={form.last_name}
          onChange={set("last_name")}
          {...aria("last_name")}
        />
        {fieldErr("last_name")}
      </div>
      <div>
        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={form.email}
          onChange={set("email")}
          {...aria("email")}
        />
        {fieldErr("email")}
      </div>
      <div>
        <label className="check">
          <input
            id="adult"
            type="checkbox"
            checked={adult}
            onChange={(e) => {
              setAdult(e.target.checked);
              clear("adult");
            }}
            {...aria("adult")}
          />
          Je certifie avoir 18 ans ou plus.
        </label>
        {fieldErr("adult")}
      </div>
      <div>
        <label className="check">
          <input
            id="terms"
            type="checkbox"
            checked={terms}
            onChange={(e) => {
              setTerms(e.target.checked);
              clear("terms");
            }}
            {...aria("terms")}
          />
          J&apos;accepte les conditions du club.
        </label>
        {fieldErr("terms")}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="btn" disabled={loading}>
        {loading ? "Envoi…" : "Recevoir mon code d'accès"}
      </button>
      {error && (
        <p className="muted" style={{ textAlign: "center" }}>
          <Link href="/connexion">Je suis déjà membre : me connecter</Link>
        </p>
      )}
    </form>
  );
}
