"use client";

import Link from "next/link";
import { useEffect } from "react";
import "@/app/ergonomie.css";

// Page affichée si un écran rencontre une erreur inattendue.
export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="shell errpage">
      <p className="brand">Le Goût du Chai</p>
      <div className="errpage-body">
        <p className="errpage-code" aria-hidden="true">
          Oups
        </p>
        <h1 className="errpage-title">Un petit incident est survenu.</h1>
        <p className="errpage-txt">
          Cet écran n&apos;a pas pu s&apos;afficher. Réessayez dans un instant ; si le problème persiste, revenez à
          l&apos;accueil du club.
        </p>
        <div className="errpage-actions">
          <button type="button" className="btn" onClick={() => reset()}>
            Réessayer
          </button>
          <Link href="/club" className="btn btn-ghost">
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
