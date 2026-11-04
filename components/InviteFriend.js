"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { withTimeout } from "@/lib/withTimeout";

const SITE = "https://www.legoutduchai.fr";

function message(code, link) {
  return `Je t'invite au Goût du Chai, notre club privé d'achats groupés de vins de vignerons. Inscris-toi ici : ${link} (code d'invitation : ${code}, valable 30 jours).`;
}

export default function InviteFriend({ invitesLeft, isAdmin, firstName }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  const canInvite = isAdmin || invitesLeft > 0;
  const link = code ? `${SITE}/rejoindre?code=${encodeURIComponent(code)}` : "";
  const text = code ? message(code, link) : "";

  async function create(e) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await withTimeout(supabase.rpc("create_my_invitation", { p_email: email.trim() || null }));
    setLoading(false);
    if (error) {
      setError(
        /no_invites_left/.test(error.message || "")
          ? "Vous n'avez plus d'invitation disponible."
          : "L'invitation n'a pas pu être créée. Réessayez dans un instant."
      );
      return;
    }
    setCode(data);
    router.refresh(); // met à jour le compteur et la liste
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Invitation au Goût du Chai", text });
      } catch {
        // partage annulé
      }
    } else {
      copy();
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Copie impossible : sélectionnez le lien ci-dessous et copiez-le.");
    }
  }

  if (code) {
    return (
      <div className="card stack" style={{ borderColor: "var(--gold)" }}>
        <p className="eyebrow">Invitation prête</p>
        <p className="num-big" style={{ textAlign: "center" }}>
          {code}
        </p>
        <p className="muted" style={{ wordBreak: "break-all" }}>
          {link}
        </p>
        <div className="grid-2">
          <a className="btn" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
          <a className="btn btn-ghost" href={`sms:?&body=${encodeURIComponent(text)}`}>
            SMS
          </a>
          <a
            className="btn btn-ghost"
            href={`mailto:${email.trim()}?subject=${encodeURIComponent(
              `${firstName || "Un membre"} vous invite au Goût du Chai`
            )}&body=${encodeURIComponent(text)}`}
          >
            E-mail
          </a>
          <button type="button" className="btn btn-ghost" onClick={share}>
            {copied ? "Copié !" : "Autre…"}
          </button>
        </div>
        <button type="button" className="link-btn" onClick={copy}>
          {copied ? "Message copié" : "Copier le message"}
        </button>
        {error && <p className="error">{error}</p>}
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            setCode("");
            setEmail("");
          }}
        >
          Créer une autre invitation
        </button>
      </div>
    );
  }

  if (!canInvite) {
    return (
      <div className="card">
        <p className="muted">Vous avez utilisé toutes vos invitations. Merci de faire grandir le cercle !</p>
      </div>
    );
  }

  return (
    <form onSubmit={create} className="card stack">
      <p>
        {isAdmin ? (
          "Invitations illimitées (administrateur)."
        ) : (
          <>
            Il vous reste <strong className="price">{invitesLeft}</strong> invitation{invitesLeft > 1 ? "s" : ""} à offrir.
          </>
        )}
      </p>
      <div>
        <label htmlFor="invite-email">E-mail de la personne (facultatif)</label>
        <input
          id="invite-email"
          type="email"
          inputMode="email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      {error && <p className="error">{error}</p>}
      <button className="btn" disabled={loading}>
        {loading ? "Création…" : "Créer une invitation"}
      </button>
      <p className="muted">Un code personnel, valable 30 jours, à envoyer par WhatsApp, SMS ou e-mail.</p>
    </form>
  );
}
