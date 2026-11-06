"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Bouton « Recevoir les notifications » de l'espace Membre.
// Enregistre l'appareil du membre dans la table push_subscriptions (Supabase).
const CLE_PUBLIQUE = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function versOctets(base64) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const brut = atob(b64);
  return Uint8Array.from([...brut].map((c) => c.charCodeAt(0)));
}

function enBase64Url(buffer) {
  let s = "";
  new Uint8Array(buffer).forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function estIphone() {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

function estInstallee() {
  return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
}

export default function NotificationToggle({ moment = null }) {
  // etat : chargement | indisponible | installer | refuse | inactif | actif
  const [etat, setEtat] = useState("chargement");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState("");
  const [vient, setVient] = useState(false); // activation demandée à l'instant

  useEffect(() => {
    (async () => {
      const compatible = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!CLE_PUBLIQUE) return setEtat("indisponible");
      if (!compatible) return setEtat(estIphone() && !estInstallee() ? "installer" : "indisponible");
      if (Notification.permission === "denied") return setEtat("refuse");
      try {
        const reg = await navigator.serviceWorker.getRegistration("/");
        const abo = reg ? await reg.pushManager.getSubscription() : null;
        setEtat(abo ? "actif" : "inactif");
      } catch {
        setEtat("inactif");
      }
    })();
  }, []);

  const activer = async () => {
    setVient(true);
    setErreur("");
    setOccupe(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setEtat(permission === "denied" ? "refuse" : "inactif");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const abo =
        (await reg.pushManager.getSubscription()) ||
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: versOctets(CLE_PUBLIQUE) }));

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("session");

      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: abo.endpoint,
          p256dh: enBase64Url(abo.getKey("p256dh")),
          auth: enBase64Url(abo.getKey("auth")),
          user_agent: navigator.userAgent.slice(0, 300),
        },
        { onConflict: "endpoint" }
      );
      if (error) throw error;
      setEtat("actif");
    } catch {
      setErreur("L'activation n'a pas abouti. Réessayez dans un instant.");
    } finally {
      setOccupe(false);
    }
  };

  const desactiver = async () => {
    setErreur("");
    setOccupe(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const abo = reg ? await reg.pushManager.getSubscription() : null;
      if (abo) {
        const supabase = createClient();
        await supabase.from("push_subscriptions").delete().eq("endpoint", abo.endpoint);
        await abo.unsubscribe();
      }
      setEtat("inactif");
    } catch {
      setErreur("La désactivation n'a pas abouti. Réessayez dans un instant.");
    } finally {
      setOccupe(false);
    }
  };

  if (etat === "chargement") return null;

  // Juste après une réservation : une seule proposition, au bon moment, et rien si c'est déjà réglé.
  if (moment === "reservation") {
    if (etat === "actif") {
      return vient ? (
        <p className="success notif-moment">C&apos;est noté : vous serez prévenu sur cet appareil.</p>
      ) : null;
    }
    if (etat === "inactif") {
      return (
        <div className="notif-moment">
          <p>Être prévenu quand le sceau se referme ?</p>
          <button className="btn btn-ghost" onClick={activer} disabled={occupe}>
            {occupe ? "Activation…" : "Me prévenir"}
          </button>
          {erreur && <p className="error">{erreur}</p>}
        </div>
      );
    }
    if (etat === "installer") {
      return (
        <p className="muted notif-moment">
          Pour être prévenu quand le sceau se referme, ajoutez le club à votre écran d&apos;accueil (Partager, puis
          « Sur l&apos;écran d&apos;accueil »).
        </p>
      );
    }
    return null;
  }

  return (
    <div className="card stack">
      {etat === "actif" && (
        <>
          <p className="success">Notifications activées sur cet appareil.</p>
          <p className="muted">Nouveaux domaines, seuils bientôt atteints, commandes déclenchées.</p>
          <button className="btn btn-ghost" onClick={desactiver} disabled={occupe}>
            Ne plus recevoir de notifications
          </button>
        </>
      )}

      {etat === "inactif" && (
        <>
          <p className="muted">
            Soyez prévenu des nouveaux domaines, des seuils bientôt atteints et du déclenchement de vos commandes.
          </p>
          <button className="btn" onClick={activer} disabled={occupe}>
            {occupe ? "Activation…" : "Recevoir les notifications"}
          </button>
        </>
      )}

      {etat === "installer" && (
        <p className="muted">
          Sur iPhone, les notifications fonctionnent depuis l&apos;application : ajoutez d&apos;abord le club à votre
          écran d&apos;accueil (Partager, puis « Sur l&apos;écran d&apos;accueil »), puis revenez ici.
        </p>
      )}

      {etat === "refuse" && (
        <p className="muted">
          Les notifications sont bloquées pour le club. Vous pouvez les autoriser dans les réglages de votre
          téléphone, rubrique Notifications.
        </p>
      )}

      {etat === "indisponible" && (
        <p className="muted">Les notifications ne sont pas disponibles sur cet appareil.</p>
      )}

      {erreur && <p className="error">{erreur}</p>}
    </div>
  );
}
