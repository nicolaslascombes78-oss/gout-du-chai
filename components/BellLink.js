"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Cloche en haut des écrans du club : mène aux réglages de notifications de l'espace Membre.
// Un point doré signale que les notifications ne sont pas encore activées sur cet appareil.
export default function BellLink() {
  const [off, setOff] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
        if (Notification.permission === "denied") return;
        const reg = await navigator.serviceWorker.getRegistration("/");
        const abo = reg ? await reg.pushManager.getSubscription() : null;
        setOff(!abo);
      } catch {
        // la cloche reste simplement sans point
      }
    })();
  }, []);

  return (
    <Link
      href="/club/membre#notifications"
      className="bell"
      aria-label={off ? "Notifications : pas encore activées" : "Notifications"}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6.5 2 6.5H4S6 14 6 9z" />
        <path d="M10 19a2 2 0 0 0 4 0" />
      </svg>
      {off && <span className="bell-dot" aria-hidden="true" />}
    </Link>
  );
}
