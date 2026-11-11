// Avis des membres sur les cuvées : mots-clés proposés et petits calculs partagés.
export const AVIS_TAGS = [
  "Fruité",
  "Floral",
  "Minéral",
  "Boisé",
  "Épicé",
  "Gourmand",
  "Frais",
  "Puissant",
  "À boire maintenant",
  "À garder",
];

export const AVIS_MAX_TAGS = 3;
export const AVIS_MAX_TEXTE = 600;

// Moyenne arrondie au dixième, ou null s'il n'y a pas d'avis.
export function moyenne(avis) {
  if (!avis?.length) return null;
  const s = avis.reduce((t, a) => t + Number(a.rating || 0), 0);
  return Math.round((s / avis.length) * 10) / 10;
}

// « 4,3 » à la française.
export const noteTexte = (n) => String(n).replace(".", ",");
