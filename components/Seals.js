// Note sur 5 affichée en sceaux dorés (pleins, à moitié ou vides).
export default function Seals({ value, label }) {
  const v = Number(value) || 0;
  return (
    <span className="seals" role="img" aria-label={label || `${String(v).replace(".", ",")} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <i key={i} className={v >= i ? "on" : v >= i - 0.5 ? "half" : ""} />
      ))}
    </span>
  );
}
