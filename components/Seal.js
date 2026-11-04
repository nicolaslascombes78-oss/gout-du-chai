// Le sceau : un anneau doré qui se referme quand la commande est complète.
// Or = bouteilles réservées par le club, ivoire = celles du membre, gris = à trouver.
// Au centre : le nombre de bouteilles qui manquent (une coche quand le seuil est atteint).
const C = 2 * Math.PI * 40;

export default function Seal({ reserved = 0, mine = 0, threshold, size = 72, bare = false }) {
  if (!threshold) return null;
  const r = Math.min(Math.max(0, reserved), threshold);
  const m = Math.min(Math.max(0, mine), r);
  const a = (C * (r - m)) / threshold;
  const b = (C * m) / threshold;
  const missing = Math.max(0, threshold - reserved);
  const stroke = size >= 96 ? 5 : size >= 64 ? 6.5 : 9;
  const label =
    missing === 0
      ? `Commande complète : ${threshold} bouteilles sur ${threshold}`
      : `Plus que ${missing} bouteille${missing > 1 ? "s" : ""} sur ${threshold}${m ? `, dont ${m} à vous` : ""}`;

  return (
    <span className="seal" style={{ width: size, height: size }}>
      <svg role="img" aria-label={label} width={size} height={size} viewBox="0 0 96 96">
        <circle cx="48" cy="48" r="40" fill="none" stroke="var(--line)" strokeWidth={stroke} />
        {a > 0 && (
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke="var(--gold)"
            strokeWidth={stroke}
            strokeDasharray={`${a} ${C}`}
            transform="rotate(-90 48 48)"
          />
        )}
        {b > 0 && (
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke="var(--ivory)"
            strokeWidth={stroke}
            strokeDasharray={`${b} ${C}`}
            strokeDashoffset={-a}
            transform="rotate(-90 48 48)"
          />
        )}
        {missing === 0 && (
          <path d="M34 49l10 10 19-22" fill="none" stroke="var(--gold-soft)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>
      {!bare && missing > 0 && (
        <span className="seal-center" aria-hidden="true">
          <span className="seal-num" style={{ fontSize: Math.round(size * 0.3) }}>
            {missing}
          </span>
          {size >= 64 && <span className="seal-lbl">à trouver</span>}
        </span>
      )}
    </span>
  );
}
