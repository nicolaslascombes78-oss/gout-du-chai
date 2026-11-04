import Seal from "@/components/Seal";
import { closingLabel, daysLeft } from "@/lib/catalogue";

// Avancement d'une commande groupée : le sceau, puis les lignes de texte.
// variant="lines" : seulement le texte (la carte place le sceau elle-même).
export default function Gauge({
  reserved = 0,
  threshold,
  participants = 0,
  deadline = null,
  showDeadline = false,
  mine = 0,
  size = 72,
  variant = "row",
}) {
  if (!threshold) return <p className="muted">Seuil à venir</p>;
  const missing = Math.max(0, threshold - reserved);
  const close = showDeadline ? closingLabel(deadline) : null;
  const j = showDeadline ? daysLeft(deadline) : null;
  const urgent = j != null && j >= 0 && j <= 5;

  const lines = (
    <div className="gauge-lines">
      {reserved === 0 ? (
        <p className="gauge-txt">
          <span className="gauge-first">Soyez le premier</span> · seuil de {threshold} bouteilles
        </p>
      ) : (
        <p className="gauge-txt">
          <strong>{reserved}</strong> / {threshold} bouteilles
          {missing === 0 ? " · seuil atteint" : ""}
          {participants > 0 ? ` · ${participants} membre${participants > 1 ? "s" : ""}` : ""}
        </p>
      )}
      {mine > 0 && (
        <p className="muted gauge-txt">
          <i className="dot-mine" aria-hidden="true" /> dont vos {mine}
        </p>
      )}
      {close && <p className={`muted gauge-txt${urgent ? " is-urgent" : ""}`}>{close}</p>}
    </div>
  );

  if (variant === "lines") return lines;
  return (
    <div className="gauge-row">
      <Seal reserved={reserved} mine={mine} threshold={threshold} size={size} />
      {lines}
    </div>
  );
}
