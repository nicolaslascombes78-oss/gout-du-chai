"use client";

// Bouton d'envoi qui demande une confirmation avant d'agir (annulations dans l'admin).
export default function ConfirmSubmit({ message, children, className = "btn-annuler" }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
