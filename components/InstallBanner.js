"use client";

import { useEffect, useState } from "react";

// Bandeau « Ajoutez le club à votre écran d'accueil ».
// - iPhone : marche à suivre (Partager > Sur l'écran d'accueil).
// - Android : bouton « Installer » quand le navigateur le propose.
// - Jamais affiché dans l'appli déjà installée.
// - Affiché une seule fois : ensuite il ne revient plus, même s'il n'a pas été fermé.
const CLE = "gdc-install-vu";

function estInstallee() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function estIphone() {
  const ua = window.navigator.userAgent;
  const ipadRecent = ua.includes("Macintosh") && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(ua) || ipadRecent;
}

function dejaVu() {
  try { return localStorage.getItem(CLE) === "1"; } catch { return false; }
}

function marquerVu() {
  try { localStorage.setItem(CLE, "1"); } catch {}
}

export default function InstallBanner() {
  const [mode, setMode] = useState(null); // null | "iphone" | "android"
  const [invite, setInvite] = useState(null);

  useEffect(() => {
    if (estInstallee() || dejaVu()) return;

    if (estIphone()) {
      const t = setTimeout(() => { setMode("iphone"); marquerVu(); }, 1500);
      return () => clearTimeout(t);
    }

    const capter = (e) => {
      e.preventDefault();
      setInvite(e);
      setMode("android");
      marquerVu();
    };
    window.addEventListener("beforeinstallprompt", capter);
    return () => window.removeEventListener("beforeinstallprompt", capter);
  }, []);

  if (!mode) return null;

  const fermer = () => setMode(null);

  const installer = async () => {
    if (!invite) return;
    invite.prompt();
    await invite.userChoice.catch(() => null);
    setMode(null);
  };

  return (
    <aside className="install-banner" role="dialog" aria-label="Installer le club sur votre téléphone">
      <button className="install-close" onClick={fermer} aria-label="Masquer">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>

      <p className="install-title">Le club sur votre écran d'accueil</p>

      {mode === "iphone" ? (
        <>
          <p className="install-text">
            Touchez{" "}
            <svg className="install-share" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-label="le bouton Partager">
              <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
            </svg>{" "}
            Partager, puis « Sur l'écran d'accueil ».
          </p>
          <p className="install-note">
            À la première ouverture depuis l'icône, vous recevrez un nouveau code de connexion par e-mail.
          </p>
        </>
      ) : (
        <>
          <p className="install-text">
            Retrouvez la sélection et vos réservations d'un geste, en plein écran.
          </p>
          <div className="install-actions">
            <button className="install-btn" onClick={installer}>Installer</button>
            <button className="install-later" onClick={fermer}>Plus tard</button>
          </div>
        </>
      )}
    </aside>
  );
}
