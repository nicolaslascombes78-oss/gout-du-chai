// Frise verticale de suivi d'une commande : Réservée → Seuil atteint → Déclenchée → Payée → Expédiée → Livrée.
// status = statut du domaine ; paid = toutes les bouteilles du membre sont payées ;
// seuil = { atteint, reserved, threshold, participants } ; dates = date de chaque étape franchie ;
// prevue = date de livraison annoncée par le club.
import styles from "./OrderTimeline.module.css";

const NIVEAU = { declenche: 1, expedie: 3, livre: 4 };
const FUSEAU = "Europe/Paris";

// Accepte une date seule (« 2026-11-20 ») ou un horodatage complet
export function lireDate(v) {
  if (!v) return null;
  const d = typeof v === "string" && v.length === 10 ? new Date(`${v}T12:00:00Z`) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
export function dateCourte(v) {
  const d = lireDate(v);
  return d ? d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", timeZone: FUSEAU }) : null;
}
export function dateLongue(v) {
  const d = lireDate(v);
  return d
    ? d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: FUSEAU })
    : null;
}

export default function OrderTimeline({ status, paid, dates = {}, prevue, seuil = {} }) {
  const niveau = NIVEAU[status] || 0;
  const seuilFait = niveau >= 1 || Boolean(seuil.atteint);
  const etapes = [
    { nom: "Réservée", fait: true, quand: dates.reservee },
    {
      nom: "Seuil atteint",
      fait: seuilFait,
      detail: seuil.threshold
        ? `${Math.min(seuil.reserved || 0, seuil.threshold)} / ${seuil.threshold} bouteilles · ${seuil.participants || 0} membre${(seuil.participants || 0) > 1 ? "s" : ""}`
        : null,
    },
    {
      nom: "Déclenchée",
      fait: niveau >= 1,
      quand: dates.declenchee,
      aide: "Commande passée au domaine, puis débit de votre carte",
    },
    { nom: "Payée", fait: Boolean(paid), quand: dates.payee },
    { nom: "Expédiée", fait: niveau >= 3, quand: dates.expediee },
    { nom: "Livrée", fait: niveau >= 4, quand: dates.livree },
  ];
  const prochaine = etapes.findIndex((e) => !e.fait);
  const livraison = dateCourte(prevue);

  return (
    <ol className={styles.frise} aria-label="Suivi de la commande">
      {etapes.map((e, i) => {
        const enCours = i === prochaine;
        const quand = e.fait ? dateCourte(e.quand) : e.nom === "Livrée" && livraison ? `Prévue le ${livraison}` : null;
        return (
          <li
            key={e.nom}
            className={`${styles.etape} ${e.fait ? styles.fait : ""} ${enCours ? styles.enCours : ""}`}
          >
            <span className={styles.point} aria-hidden="true" />
            <div className={styles.texte}>
              <div className={styles.ligne}>
                <span className={styles.nom}>{e.nom}</span>
                {quand && <span className={styles.date}>{quand}</span>}
              </div>
              {e.fait && e.detail && <span className={styles.aide}>{e.detail}</span>}
              {enCours && e.aide && <span className={styles.aide}>{e.aide}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
