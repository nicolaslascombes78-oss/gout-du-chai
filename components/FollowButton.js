"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// « Suivre ce domaine » : le membre est prévenu à l'ouverture de sa prochaine commande.
export default function FollowButton({ domainId, initial = false, interet = false }) {
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

  return (
    <div className="follow">
      <button
        type="button"
        className={`follow-btn${suivi ? " is-on" : ""}`}
        onClick={basculer}
        disabled={occupe}
        aria-pressed={suivi}
      >
        <span aria-hidden="true">{suivi ? "★" : "☆"}</span> {suivi
          ? interet
            ? "Vous êtes intéressé"
            : "Domaine suivi"
          : interet
            ? "Je suis intéressé"
            : "Suivre ce domaine"}
      </button>
      <p className="muted">
        {erreur
          ? "L'enregistrement n'a pas abouti. Réessayez dans un instant."
          : suivi
            ? interet
              ? "Vous serez prévenu dès l’ouverture des réservations."
              : "Vous serez prévenu à l'ouverture de sa prochaine commande."
            : interet
              ? "Ce domaine vous tente ? Dites-le : vous serez prévenu dès son ouverture."
              : "Soyez prévenu à l'ouverture de sa prochaine commande."}
      </p>
    </div>
  );
}
