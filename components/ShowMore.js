"use client";

import { useState } from "react";

// Liste de cuvées raccourcie : les cuvées en trop restent dans la page mais masquées
// jusqu'à ce que le membre demande à les voir.
export default function ShowMore({ count, children }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <div style={{ display: ouvert ? "contents" : "none" }}>{children}</div>
      <button type="button" className="link-btn cuvee-more" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)}>
        {ouvert ? "Afficher moins" : `Voir les ${count} autres cuvées`}
      </button>
    </>
  );
}
