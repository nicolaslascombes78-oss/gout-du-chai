import { closingLabel, daysLeft, percent } from "@/lib/catalogue";

// Avancement d'une commande groupée.
// À 0 bouteille, on invite à être le premier plutôt que d'afficher « 0 membre ».
export default function Gauge({ reserved = 0, threshold, participants = 0, deadline = null, showDeadline = false }) {
  if (!threshold) return <p className="muted">Seuil à venir</p>;
  const missing = Math.max(0, threshold - reserved);
  const close = showDeadline ? closingLabel(deadline) : null;
  const j = showDeadline ? daysLeft(deadline) : null;
  return (
    <div>
      <div className="gauge" role="img" aria-label={`${reserved} bouteilles réservées sur ${threshold}`}>
        <span style={{ width: `${percent(reserved, threshold)}%` }} />
      </div>
      {reserved === 0 ? (
        <p className="muted gauge-txt">Soyez le premier · seuil de {threshold} bouteilles</p>
      ) : (
        <p className="muted gauge-txt">
          <strong>{reserved}</strong> / {threshold} bouteilles
          {missing > 0 ? ` · plus que ${missing}` : " · seuil atteint"}
          {participants > 0 ? ` · ${participants} membre${participants > 1 ? "s" : ""}` : ""}
        </p>
      )}
      {close && <p className={`muted gauge-txt${j != null && j >= 0 && j <= 5 ? " is-urgent" : ""}`}>{close}</p>}
    </div>
  );
}
