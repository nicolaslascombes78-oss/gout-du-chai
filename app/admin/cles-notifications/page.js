"use client";

import { useState } from "react";

// Page d'usage unique : fabrique les deux clés des notifications (« clés VAPID »).
// Les clés sont créées dans VOTRE navigateur et ne sont envoyées nulle part :
// cette page n'enregistre rien, ni dans Supabase, ni sur le serveur.

function enBase64Url(octets) {
  let s = "";
  new Uint8Array(octets).forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export default function ClesNotifications() {
  const [cles, setCles] = useState(null);
  const [copie, setCopie] = useState("");
  const [erreur, setErreur] = useState("");

  const generer = async () => {
    setErreur("");
    try {
      const paire = await crypto.subtle.generateKey(
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign", "verify"]
      );
      const publique = enBase64Url(await crypto.subtle.exportKey("raw", paire.publicKey));
      const privee = (await crypto.subtle.exportKey("jwk", paire.privateKey)).d;
      setCles({ publique, privee });
    } catch {
      setErreur("Votre navigateur n'a pas pu créer les clés. Essayez avec Chrome ou Safari à jour.");
    }
  };

  const copier = async (nom, valeur) => {
    try {
      await navigator.clipboard.writeText(valeur);
      setCopie(nom);
      setTimeout(() => setCopie(""), 2000);
    } catch {
      setErreur("Copie impossible : sélectionnez le texte et copiez-le à la main.");
    }
  };

  return (
    <main className="shell">
      <p className="brand">Le Goût du Chai</p>
      <h1>Clés des notifications</h1>
      <p className="lead">À faire une seule fois. Une nouvelle paire de clés désactiverait les notifications déjà acceptées par les membres.</p>
      <div className="ornament" />

      {!cles ? (
        <div className="card stack">
          <p className="muted">Les clés sont créées dans ce navigateur et ne sont envoyées nulle part.</p>
          <button className="btn" onClick={generer}>Créer les clés</button>
        </div>
      ) : (
        <div className="stack">
          <div className="card stack">
            <label htmlFor="cle-publique">NEXT_PUBLIC_VAPID_PUBLIC_KEY</label>
            <input id="cle-publique" type="text" readOnly value={cles.publique} onFocus={(e) => e.target.select()} />
            <button className="btn btn-ghost" onClick={() => copier("publique", cles.publique)}>
              {copie === "publique" ? "Copiée" : "Copier la clé publique"}
            </button>
          </div>
          <div className="card stack">
            <label htmlFor="cle-privee">VAPID_PRIVATE_KEY</label>
            <input id="cle-privee" type="text" readOnly value={cles.privee} onFocus={(e) => e.target.select()} />
            <button className="btn btn-ghost" onClick={() => copier("privee", cles.privee)}>
              {copie === "privee" ? "Copiée" : "Copier la clé privée"}
            </button>
            <p className="muted">La clé privée ne va que dans Vercel. Ne la partagez avec personne, assistant compris.</p>
          </div>
          <p className="notice">Une fois les deux clés enregistrées dans Vercel, fermez simplement cette page : elles disparaissent.</p>
        </div>
      )}

      {erreur && <p className="error" style={{ marginTop: 14 }}>{erreur}</p>}
    </main>
  );
}
