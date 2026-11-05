import LegalLayout from "@/components/LegalLayout";
import { CLUB, VIENT } from "@/lib/club-infos";

export const metadata = { title: "Mentions légales — Le Goût du Chai" };

export default function MentionsLegales() {
  return (
    <LegalLayout title="Mentions légales">
      <section>
        <h2>Éditeur et vendeur</h2>
        {CLUB.vendeur ? (
          <p>
            Le site legoutduchai.fr est édité par {CLUB.vendeur}.
            {CLUB.siret ? ` SIRET : ${CLUB.siret}.` : ""}
            {CLUB.tva ? ` TVA intracommunautaire : ${CLUB.tva}.` : ""}
          </p>
        ) : (
          <p>{VIENT}</p>
        )}
        {(CLUB.contactEmail || CLUB.telephone) && (
          <p>
            Contact :{" "}
            {CLUB.contactEmail && <a href={`mailto:${CLUB.contactEmail}`}>{CLUB.contactEmail}</a>}
            {CLUB.contactEmail && CLUB.telephone ? " · " : ""}
            {CLUB.telephone}
          </p>
        )}
        {CLUB.directeurPublication && <p>Direction de la publication : {CLUB.directeurPublication}.</p>}
      </section>

      <section>
        <h2>Licence</h2>
        <p>{CLUB.licence ? `Vente de boissons alcooliques à distance sous couvert d'une ${CLUB.licence}.` : VIENT}</p>
      </section>

      <section>
        <h2>Hébergement</h2>
        <p>Le site est hébergé par Vercel Inc., société de droit américain (vercel.com).</p>
        <p>Les données des membres sont stockées par Supabase (supabase.com).</p>
      </section>

      <section>
        <h2>Propriété intellectuelle</h2>
        <p>
          Les textes, le nom, le logo et l&apos;identité visuelle du club lui appartiennent. Les photographies des
          domaines restent la propriété des vignerons.
        </p>
      </section>

      <section>
        <h2>Médiation</h2>
        <p>
          {CLUB.mediateur
            ? `En cas de litige, vous pouvez recourir gratuitement au médiateur de la consommation : ${CLUB.mediateur.nom} (${CLUB.mediateur.site}).`
            : VIENT}
        </p>
      </section>

      <section>
        <h2>Santé</h2>
        <p>
          L&apos;abus d&apos;alcool est dangereux pour la santé, à consommer avec modération. La vente d&apos;alcool
          est interdite aux mineurs.
        </p>
      </section>
    </LegalLayout>
  );
}
