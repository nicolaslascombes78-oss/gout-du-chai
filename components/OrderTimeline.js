// Frise de suivi d'une commande : Réservée → Déclenchée → Payée → Expédiée → Livrée.
// status = statut du domaine ; paid = toutes les bouteilles du membre sont payées.
const ETAPES = ["Réservée", "Déclenchée", "Payée", "Expédiée", "Livrée"];
const NIVEAU = { declenche: 1, expedie: 3, livre: 4 };

export default function OrderTimeline({ status, paid }) {
  const niveau = NIVEAU[status] || 0;
  const faites = [true, niveau >= 1, Boolean(paid), niveau >= 3, niveau >= 4];
  const courante = faites.indexOf(false);

  return (
    <ol className="timeline" aria-label="Suivi de la commande">
      {ETAPES.map((etape, i) => (
        <li
          key={etape}
          className={`timeline-step${faites[i] ? " is-done" : ""}${i === courante ? " is-current" : ""}`}
          aria-current={i === courante ? "step" : undefined}
        >
          <span className="timeline-dot" aria-hidden="true" />
          <span className="timeline-label">{etape}</span>
        </li>
      ))}
    </ol>
  );
}
