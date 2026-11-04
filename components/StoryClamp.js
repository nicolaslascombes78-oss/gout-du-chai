"use client";

import { useState } from "react";

// « Pourquoi on l'aime » : trois lignes, puis « Lire la suite » si le texte est long.
export default function StoryClamp({ text }) {
  const [open, setOpen] = useState(false);
  const long = (text || "").length > 220;
  return (
    <div>
      <p className={`story-text${long && !open ? " is-clamped" : ""}`} style={{ whiteSpace: "pre-line" }}>
        {text}
      </p>
      {long && (
        <button type="button" className="link-btn story-more" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? "Réduire" : "Lire la suite"}
        </button>
      )}
    </div>
  );
}
