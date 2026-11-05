import LegalLayout from "@/components/LegalLayout";
import { CLUB, VIENT } from "@/lib/club-infos";

export const metadata = { title: "Les règles du club — Le Goût du Chai" };

export default function Regles() {
  const contact = CLUB.contactEmail ? (
    <a href={`mailto:${CLUB.contactEmail}`}>{CLUB.contactEmail}</a>
  ) : (
    "l'adresse de contact du club"
  );

  return (
    <LegalLayout
      title="Les règles du club"
      intro="Comment fonctionne une commande groupée, du choix des bouteilles à leur arrivée chez vous."
    >
      <section>
        <h2>Le principe</h2>
        <p>
          Le Goût du Chai est un club privé, sur invitation. Ensemble, les membres commandent directement auprès de
          vignerons choisis, au prix adhérent. Chaque domaine a un seuil : un nombre de bouteilles à réunir entre tous
          les membres avant une date de clôture. Quand le seuil est atteint, le sceau se referme et la commande part
          chez le vigneron.
        </p>
      </section>

      <section>
        <h2>Réserver</h2>
        <p>
          Vous choisissez vos bouteilles sur la fiche d&apos;un domaine, puis vous les réservez depuis votre panier.
          Rien n&apos;est débité au moment de la réservation. Le paiement en ligne sera confié à notre prestataire,
          Stripe, avec la validation 3D Secure de votre banque : le club ne verra jamais votre numéro de carte.
        </p>
      </section>

      <section>
        <h2>Modifier ou annuler</h2>
        <p>
          Tant que la commande n&apos;est pas lancée, vous pouvez ajouter ou retirer des bouteilles, ou annuler votre
          réservation, librement et sans frais, depuis votre espace Membre.
        </p>
      </section>

      <section>
        <h2>Quand le seuil est atteint</h2>
        <p>
          {CLUB.seuilAtteint === "immediat"
            ? "La commande part dès que le seuil est atteint. "
            : CLUB.seuilAtteint === "cloture"
              ? "La commande reste ouverte jusqu'à sa date de clôture, pour compléter les caisses. "
              : ""}
          Vous êtes prévenu, puis débité du montant de vos bouteilles de ce domaine, et de rien d&apos;autre.
          {CLUB.delaiRegularisation
            ? ` Si le paiement n'aboutit pas, nous vous prévenons et vous disposez de ${CLUB.delaiRegularisation} pour régulariser ; passé ce délai, votre réservation est annulée.`
            : " Si le paiement n'aboutit pas, nous vous prévenons pour que vous puissiez régulariser."}
        </p>
      </section>

      <section>
        <h2>Si le seuil n&apos;est pas atteint</h2>
        <p>
          À la date de clôture, la commande est annulée : vous n&apos;êtes pas débité et vous êtes prévenu.
          {CLUB.prolongation
            ? ` Le club peut prolonger une seule fois la commande, de ${CLUB.prolongation} ; les membres qui ont réservé en sont informés et peuvent toujours annuler.`
            : ""}
        </p>
      </section>

      <section>
        <h2>Les prix</h2>
        <p>
          Les prix affichés sont des prix adhérents, toutes taxes comprises, au départ du domaine. Les frais de
          livraison s&apos;y ajoutent.
        </p>
      </section>

      <section>
        <h2>La livraison</h2>
        <p>
          Les bouteilles sont livrées à l&apos;adresse indiquée dans votre espace Membre
          {CLUB.livraison ? `, ${CLUB.livraison}.` : `. Transporteur, frais et délai : ${VIENT.charAt(0).toLowerCase()}${VIENT.slice(1)}`}{" "}
          Le retrait sur place n&apos;est pas proposé pour l&apos;instant.
        </p>
      </section>

      <section>
        <h2>Bouteille abîmée ou erreur de livraison</h2>
        <p>
          Vérifiez votre colis à réception et signalez-nous tout problème
          {CLUB.delaiSignalement ? ` sous ${CLUB.delaiSignalement}` : " au plus vite"}, à {contact}, photo à
          l&apos;appui. Vous bénéficiez des garanties légales de conformité et des vices cachés.
        </p>
      </section>

      <section>
        <h2>Droit de rétractation</h2>
        <p>
          Comme pour tout achat à distance, vous disposez de 14 jours à compter de la réception de vos bouteilles
          pour vous rétracter, sans avoir à vous justifier. Écrivez-nous à {contact} : les bouteilles nous sont
          retournées intactes
          {CLUB.retourAuxFraisDuClub === true ? ", à nos frais" : CLUB.retourAuxFraisDuClub === false ? ", à vos frais" : ""}, et
          vous êtes remboursé sous 14 jours au plus.
        </p>
      </section>

      <section>
        <h2>Majorité et modération</h2>
        <p>
          La vente d&apos;alcool est réservée aux personnes majeures : chaque membre certifie avoir 18 ans ou plus.
          L&apos;abus d&apos;alcool est dangereux pour la santé, à consommer avec modération.
        </p>
      </section>

      <section>
        <h2>Invitations</h2>
        <p>
          Le club grandit par cooptation. Chaque membre dispose de codes d&apos;invitation personnels, valables 30
          jours. Inviter n&apos;engage ni vous, ni la personne invitée.
        </p>
      </section>

      <section>
        <h2>Une question</h2>
        <p>
          {CLUB.contactEmail ? <>Écrivez-nous à {contact}.</> : VIENT}
          {CLUB.mediateur
            ? ` En cas de litige que nous n'aurions pas pu résoudre ensemble, vous pouvez saisir gratuitement le médiateur de la consommation : ${CLUB.mediateur.nom} (${CLUB.mediateur.site}).`
            : ""}
        </p>
      </section>
    </LegalLayout>
  );
}
