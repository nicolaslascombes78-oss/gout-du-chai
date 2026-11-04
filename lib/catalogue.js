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

// Jours restants avant la date limite, comptés en heure de Paris
// (même résultat sur le serveur et sur le téléphone).
export function daysLeft(deadline) {
  if (!deadline) return null;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
  return Math.round((Date.parse(String(deadline).slice(0, 10)) - Date.parse(today)) / 864e5);
}

export function closingLabel(deadline) {
  const j = daysLeft(deadline);
  if (j == null) return null;
  if (j < 0) return "Réservations closes";
  if (j === 0) return "Clôture ce soir";
  if (j === 1) return "Clôture demain";
  if (j <= 21) return `Clôture dans ${j} jours`;
  const d = new Date(String(deadline).slice(0, 10) + "T12:00:00Z");
  return "Clôture le " + d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });
}

// Badge d'une carte : seulement s'il apprend quelque chose (plus de « Ouvert » partout).
export function cardBadge(domain, st) {
  const j = daysLeft(domain.deadline);
  if (["ouvert", "bientot"].includes(st.key) && j != null && j >= 0 && j <= 5) {
    return { key: "urgent", label: "Derniers jours" };
  }
  if (st.key === "ouvert") return null;
  return st;
}
