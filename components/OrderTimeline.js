// Frise de suivi d'une commande : Réservée → Déclenchée → Payée → Expédiée → Livrée.
// status = statut du domaine ; paid = toutes les bouteilles du membre sont payées.
const ETAPES = ["Réservée", "Déclenchée", "Payée", "Expédiée", "Livrée"];
const NIVEAU = { declenche: 1, expedie: 3, livre: 4 };

function legende(niveau, paid) {
  if (niveau === 0) return "En attente du seuil";
  if (niveau === 1) return paid ? "Payée · expédition à venir" : "Commande déclenchée · paiement à venir";
  if (niveau === 3) return "En route vers vous";
  return "Livrée · belle dégustation";
}

export default function OrderTimeline({ status, paid }) {
  const niveau = NIVEAU[status] || 0;
  const faites = [true, niveau >= 1, Boolean(paid), niveau >= 3, niveau >= 4];
  const prochaine = faites.indexOf(false);

  return (
    <div className="timeline-wrap">
      <ol className="timeline" aria-label="Suivi de la commande">
        {ETAPES.map((etape, i) => (
          <li
            key={etape}
            className={`timeline-step${faites[i] ? " is-done" : ""}${i === prochaine ? " is-next" : ""}`}
          >
            <span className="timeline-dot" aria-hidden="true" />
            <span className="timeline-label">{etape}</span>
          </li>
        ))}
      </ol>
      <p className="timeline-caption">{legende(niveau, paid)}</p>
    </div>
  );
}
