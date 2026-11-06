"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { withTimeout } from "@/lib/withTimeout";

// « Partager la commande » : à un membre (lien seul) ou à un ami, avec un code d'invitation joint.
export default function ShareOrder({ name, region, missing, slug, canInvite = false, invitesLeft = null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const accroche =
    missing > 0
      ? `Il manque ${missing} bouteille${missing > 1 ? "s" : ""} pour lancer notre commande chez ${name}${region ? ` (${region})` : ""}.`
      : `La commande chez ${name} est complète !`;

  function flash() {
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  // Lien public seul : pour un membre, ou un ami qui a déjà son code.
  async function shareSimple() {
    const url = `${window.location.origin}/c/${slug}`;
    const text = missing > 0 ? `${accroche} Tu en es ?` : accroche;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Le Goût du Chai", text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      flash();
    } catch {
      // partage annulé
    }
  }

  // Crée une invitation (une seule par ouverture du menu), puis propose de l'envoyer.
  async function createInvite() {
    if (busy || code) return;
    setError("");
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await withTimeout(supabase.rpc("create_my_invitation", { p_email: null }));
    setBusy(false);
    if (error) {
      setError(
        /no_invites_left/.test(error.message || "")
          ? "Vous n'avez plus d'invitation disponible."
          : "L'invitation n'a pas pu être créée. Réessayez dans un instant."
      );
      return;
    }
    setCode(data);
    router.refresh(); // met à jour le compteur d'invitations
  }

  const inviteUrl = code && typeof window !== "undefined" ? `${window.location.origin}/c/${slug}?code=${encodeURIComponent(code)}` : "";
  const inviteText = code
    ? `${accroche} Je t'invite au Goût du Chai pour en profiter : ${inviteUrl} (invitation valable 30 jours).`
    : "";

  async function shareInvite() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Invitation au Goût du Chai", text: inviteText });
        return;
      }
      await navigator.clipboard.writeText(inviteText);
      flash();
    } catch {
      // partage annulé
    }
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteText);
      flash();
    } catch {
      setError("Copie impossible : réessayez avec le bouton Autre…");
    }
  }

  if (!canInvite) {
    return (
      <button type="button" className="btn btn-ghost order-btn" onClick={shareSimple}>
        {copied ? "Message copié" : "Partager la commande"}
      </button>
    );
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost order-btn" aria-expanded="false" onClick={() => setOpen(true)}>
        Partager la commande
      </button>
    );
  }

  return (
    <div className="share-menu" role="group" aria-label="Partager la commande">
      {code ? (
        <>
          <p className="share-menu-t">
            Invitation prête : <strong>{code}</strong>
          </p>
          <div className="share-menu-row">
            <a
              className="btn order-btn"
              href={`https://wa.me/?text=${encodeURIComponent(inviteText)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </a>
            <button type="button" className="btn btn-ghost order-btn" onClick={shareInvite}>
              Autre…
            </button>
          </div>
          <button type="button" className="link-btn" onClick={copyInvite}>
            {copied ? "Message copié" : "Copier le message"}
          </button>
        </>
      ) : (
        <>
          <button type="button" className="share-opt share-opt-main" onClick={createInvite} disabled={busy}>
            <span className="share-opt-t">{busy ? "Création de l'invitation…" : "Inviter un ami avec ce lien"}</span>
            <span className="share-opt-s">
              Un code d&apos;invitation est joint au message
              {invitesLeft != null ? ` · il vous en reste ${invitesLeft}` : ""}
            </span>
          </button>
          <button type="button" className="share-opt" onClick={shareSimple}>
            <span className="share-opt-t">{copied ? "Message copié" : "Envoyer à un membre"}</span>
            <span className="share-opt-s">Le lien seul, sans invitation</span>
          </button>
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="link-btn" onClick={() => setOpen(false)}>
        Fermer
      </button>
    </div>
  );
}
