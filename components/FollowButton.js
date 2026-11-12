"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// « Suivre ce domaine » : le membre est prévenu à l'ouverture de sa prochaine commande.
// compact : petit bouton seul (carte de commande de la fiche domaine) ; l'explication passe en infobulle.
export default function FollowButton({ domainId, initial = false, interet = false, compact = false }) {
  const [suivi, setSuivi] = useState(initial);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState(false);

  const basculer = async () => {
    setOccupe(true);
    setErreur(false);
    const avant = suivi;
    setSuivi(!avant);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const id = data.session?.user?.id;
      if (!id) throw new Error("session");
      const { error } = avant
        ? await supabase.from("domain_follows").delete().eq("member_id", id).eq("domain_id", domainId)
        : await supabase.from("domain_follows").insert({ member_id: id, domain_id: domainId });
      if (error && error.code !== "23505") throw error; // 23505 : déjà suivi
    } catch {
      setSuivi(avant);
      setErreur(true);
    } finally {
      setOccupe(false);
    }
  };

  const libelle = suivi
    ? interet
      ? "Vous êtes intéressé"
      : "Domaine suivi"
    : interet
      ? "Je suis intéressé"
      : "Suivre ce domaine";

  const explication = erreur
    ? "L'enregistrement n'a pas abouti. Réessayez dans un instant."
    : suivi
      ? interet
        ? "Vous serez prévenu dès l’ouverture des réservations."
        : "Vous serez prévenu à l'ouverture de sa prochaine commande."
      : interet
        ? "Ce domaine vous tente ? Dites-le : vous serez prévenu dès son ouverture."
        : "Soyez prévenu à l'ouverture de sa prochaine commande.";

  if (compact) {
    return (
      <div className="follow follow-compact">
        <button
          type="button"
          className={`follow-btn${suivi ? " is-on" : ""}`}
          onClick={basculer}
          disabled={occupe}
          aria-pressed={suivi}
          title={explication}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path
              d="M12 3.2l2.6 5.5 6 .7-4.5 4.1 1.2 5.9L12 16.4l-5.3 3 1.2-5.9-4.5-4.1 6-.7z"
              fill={suivi ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
          {libelle}
        </button>
        {erreur && (
          <p className="follow-erreur" role="alert">
            {explication}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="follow">
      <button
        type="button"
        className={`follow-btn${suivi ? " is-on" : ""}`}
        onClick={basculer}
        disabled={occupe}
        aria-pressed={suivi}
      >
        <span aria-hidden="true">{suivi ? "★" : "☆"}</span> {libelle}
      </button>
      <p className="muted">{explication}</p>
    </div>
  );
}
