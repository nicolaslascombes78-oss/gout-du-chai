// Outils partagés pour le catalogue.

export const COLOR_LABELS = {
  blanc: "Blanc",
  rouge: "Rouge",
  rose: "Rosé",
  bulles: "Bulles",
  autre: "Autres",
};

export const COLOR_ORDER = ["bulles", "blanc", "rose", "rouge", "autre"];

export function euros(n) {
  return Number(n).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

// Statut affiché : « Bientôt atteint » calculé en direct dès 70 % du seuil.
export function displayStatus(domain, reserved) {
  if (domain.status === "a_venir") return { key: "a_venir", label: "À venir" };
  if (domain.status === "declenche") return { key: "declenche", label: "Déclenché" };
  if (domain.status === "expedie") return { key: "declenche", label: "Expédié" };
  if (domain.status === "livre") return { key: "livre", label: "Livré" };
  if (domain.status === "expire") return { key: "expire", label: "Expiré" };
  if (domain.threshold && reserved >= domain.threshold) return { key: "declenche", label: "Seuil atteint" };
  if (domain.threshold && reserved / domain.threshold >= 0.7) return { key: "bientot", label: "Bientôt atteint" };
  return { key: "ouvert", label: "Ouvert" };
}

export function percent(reserved, threshold) {
  if (!threshold) return 0;
  return Math.min(100, Math.round((reserved / threshold) * 100));
}
