import { percent } from "@/lib/catalogue";

export default function Gauge({ reserved = 0, threshold, participants = 0 }) {
  if (!threshold) return <p className="muted">Seuil à venir</p>;
  const missing = Math.max(0, threshold - reserved);
  return (
    <div>
      <div className="gauge">
        <span style={{ width: `${percent(reserved, threshold)}%` }} />
      </div>
      <p className="muted" style={{ marginTop: 6 }}>
        {reserved} / {threshold} bouteilles · {participants} membre{participants > 1 ? "s" : ""}
        {missing > 0 && reserved > 0 ? ` · plus que ${missing}` : ""}
      </p>
    </div>
  );
}
