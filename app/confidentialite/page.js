import LegalLayout from "@/components/LegalLayout";
import { CLUB, VIENT } from "@/lib/club-infos";

export const metadata = { title: "Confidentialité — Le Goût du Chai" };

export default function Confidentialite() {
  return (
    <LegalLayout title="Confidentialité" intro="Ce que le club conserve à votre sujet, pourquoi, et vos droits.">
      <section>
        <h2>Ce que nous conservons</h2>
        <p>
          Votre prénom, votre nom, votre adresse e-mail, votre adresse de livraison, vos réservations et commandes,
          les invitations que vous envoyez et, si vous les activez, l&apos;abonnement aux notifications de votre
          appareil. Votre numéro de carte bancaire ne sera jamais stocké par le club : il sera conservé par Stripe.
        </p>
      </section>

      <section>
        <h2>Pourquoi</h2>
        <p>
          Pour gérer votre adhésion, vos réservations, le débit au lancement des commandes, la livraison et les
          notifications que vous avez demandées. Ces données ne sont ni vendues ni utilisées à des fins
          publicitaires.
        </p>
      </section>

      <section>
        <h2>Qui y a accès</h2>
        <p>
          Les administrateurs du club, et nos prestataires techniques, uniquement pour faire fonctionner le service :
          Vercel (hébergement), Supabase (base de données), Stripe (paiement) et Resend (e-mails de connexion et
          d&apos;information).
        </p>
      </section>

      <section>
        <h2>Les adresses e-mail d&apos;invitation</h2>
        <p>L&apos;adresse e-mail saisie pour inviter quelqu&apos;un ne sert qu&apos;à cette invitation.</p>
      </section>

      <section>
        <h2>Combien de temps</h2>
        <p>
          Tant que vous êtes membre
          {CLUB.conservation ? `, puis ${CLUB.conservation} après la fin de votre adhésion` : ""}, sauf obligations
          comptables qui imposent de conserver les factures plus longtemps.
        </p>
      </section>

      <section>
        <h2>Vos droits</h2>
        <p>
          Vous pouvez consulter, corriger, exporter ou faire supprimer vos données, et vous opposer à certains usages
          {CLUB.contactEmail ? (
            <>
              , en écrivant à <a href={`mailto:${CLUB.contactEmail}`}>{CLUB.contactEmail}</a>.
            </>
          ) : (
            ". L'adresse à laquelle écrire sera indiquée ici très prochainement."
          )}{" "}
          Vous pouvez aussi saisir la CNIL (cnil.fr).
        </p>
      </section>

      <section>
        <h2>Cookies</h2>
        <p>Le site n&apos;utilise que les cookies nécessaires à votre connexion.</p>
      </section>
    </LegalLayout>
  );
}
