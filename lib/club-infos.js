// Informations du club affichées dans les pages Règles, Mentions légales et Confidentialité.
// Tant qu'une valeur vaut null, la page affiche une phrase neutre à la place.
// Pour compléter : remplacer null par le texte entre guillemets, par exemple
//   contactEmail: "contact@legoutduchai.fr",
export const CLUB = {
  // Contact
  contactEmail: null, // ex. "contact@legoutduchai.fr"
  telephone: null, // ex. "06 00 00 00 00"

  // Société qui vend aux membres
  vendeur: null, // ex. "SAS Le Goût du Chai, au capital de 1 000 €, 12 rue de la Cave, 78000 Ville"
  siret: null, // ex. "123 456 789 00012 (RCS Versailles)"
  tva: null, // ex. "FR00123456789"
  directeurPublication: null, // ex. "Prénom Nom"

  // Vente d'alcool en ligne
  licence: null, // ex. "petite licence à emporter délivrée par la mairie de Gargenville"
  mediateur: null, // ex. { nom: "Nom du médiateur", site: "https://…" }

  // Règles des commandes
  seuilAtteint: null, // "immediat" (la commande part tout de suite) ou "cloture" (reste ouverte jusqu'à la date)
  prolongation: null, // ex. "14 jours" si le club peut prolonger une fois une commande ; null sinon
  delaiRegularisation: null, // ex. "48 heures" pour régulariser un paiement refusé
  livraison: null, // ex. "par Colissimo, sous 10 jours environ après le lancement, 9,90 € par colis"
  delaiSignalement: null, // ex. "48 heures" pour signaler une bouteille cassée
  retourAuxFraisDuClub: null, // true si le club paie le retour en cas de rétractation, false sinon

  // Données personnelles
  conservation: null, // ex. "3 ans" après la fin de l'adhésion

  miseAJour: "5 novembre 2026",
};

export const VIENT = "Cette information sera précisée ici très prochainement.";
