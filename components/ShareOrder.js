"use client";

import { useState } from "react";

// « Partager la commande » : ouvre le partage du téléphone (WhatsApp, SMS…), sinon copie le message.
export default function ShareOrder({ name, region, missing, slug }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/club/domaine/${slug}`;
    const text =
      missing > 0
        ? `Il manque ${missing} bouteille${missing > 1 ? "s" : ""} pour lancer notre commande chez ${name}${region ? ` (${region})` : ""}. Tu en es ?`
        : `La commande chez ${name} est complète !`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Le Goût du Chai", text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // partage annulé par le membre : rien à faire
    }
  }

  return (
    <button type="button" className="btn btn-ghost order-btn" onClick={share}>
      {copied ? "Message copié" : "Partager la commande"}
    </button>
  );
}
