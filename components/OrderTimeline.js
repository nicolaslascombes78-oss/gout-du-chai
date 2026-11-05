// Frise de suivi d'une commande : Réservée → Déclenchée → Payée → Expédiée → Livrée.
// status = statut du domaine ; paid = toutes les bouteilles du membre sont payées.
// dates = date de chaque étape franchie ; prevue = date de livraison annoncée par le club.
import styles from "./OrderTimeline.module.css";

const ETAPES = ["Réservée", "Déclenchée", "Payée", "Expédiée", "Livrée"];
const NIVEAU = { declenche: 1, expedie: 3, livre: 4 };
const FUSEAU = "Europe/Paris";

// Accepte une date seule (« 2026-11-20 ») ou un horodatage complet
function lireDate(v) {
  if (!v) return null;
  const d = typeof v === "string" && v.length === 10 ? new Date(`${v}T12:00:00Z`) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
function dateCourte(v) {
  const d = lireDate(v);
  return d ? d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: FUSEAU }) : null;
}
function dateLongue(v) {
  const d = lireDate(v);
  return d
    ? d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: FUSEAU })
    : null;
}

function legende(niveau, paid, livree) {
  if (niveau === 0) return "En attente du seuil";
  if (niveau === 1) return paid ? "Payée · expédition à venir" : "Commande déclenchée · paiement à venir";
  if (niveau === 3) return "En route vers vous";
  const le = dateLongue(livree);
  return le ? `Livrée le ${le} · belle dégustation` : "Livrée · belle dégustation";
}

export default function OrderTimeline({ status, paid, dates = {}, prevue }) {
  const niveau = NIVEAU[status] || 0;
  const faites = [true, niveau >= 1, Boolean(paid), niveau >= 3, niveau >= 4];
  const prochaine = faites.indexOf(false);
  const datesEtapes = [dates.reservee, dates.declenchee, dates.payee, dates.expediee, dates.livree];
  const enCours = niveau >= 1 && niveau < 4;
  const livraison = dateLongue(prevue);

  return (
    <div className="timeline-wrap">
      <ol className="timeline" aria-label="Suivi de la commande">
        {ETAPES.map((etape, i) => {
          const quand = faites[i] ? dateCourte(datesEtapes[i]) : null;
          return (
            <li
              key={etape}
              className={`timeline-step${faites[i] ? " is-done" : ""}${i === prochaine ? " is-next" : ""}`}
            >
              <span className="timeline-dot" aria-hidden="true" />
              <span className="timeline-label">{etape}</span>
              {quand && <span className={styles.date}>{quand}</span>}
            </li>
          );
        })}
      </ol>
      <p className="timeline-caption">{legende(niveau, paid, dates.livree)}</p>
      {enCours && livraison && (
        <p className={styles.prevue}>
          Livraison prévue le <strong>{livraison}</strong>
        </p>
      )}
      {enCours && !livraison && <p className={styles.attente}>Date de livraison communiquée très bientôt.</p>}
    </div>
  );
}
