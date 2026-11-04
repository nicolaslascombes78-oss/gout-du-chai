"use client";

// Le sceau : un anneau doré qui se referme quand la commande est complète.
// Or = bouteilles réservées par le club, ivoire = celles du membre, gris = à trouver.
// Au centre : le nombre de bouteilles qui manquent (une coche quand le seuil est atteint).
//
// Effets : l'anneau se trace quand le sceau apparaît à l'écran et le nombre
// décompte jusqu'à sa valeur ; quand une réservation change, l'anneau glisse
// vers la nouvelle valeur ; quand le seuil est atteint, la coche se dessine et
// un éclat doré passe une fois. Tout est coupé si le téléphone est réglé
// sur « réduire les animations ».
import { useEffect, useRef, useState } from "react";
import styles from "./Seal.module.css";

const C = 2 * Math.PI * 40;
const FIRST_DURATION = 1100; // première apparition
const UPDATE_DURATION = 600; // changement de réservation
const ease = (t) => 1 - Math.pow(1 - t, 3);

function reducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function Seal({ reserved = 0, mine = 0, threshold, size = 72, bare = false }) {
  const rTarget = threshold ? Math.min(Math.max(0, reserved), threshold) : 0;
  const mTarget = Math.min(Math.max(0, mine), rTarget);

  const ref = useRef(null);
  const shown = useRef({ r: 0, m: 0 });
  const started = useRef(false);
  const [v, setV] = useState({ r: 0, m: 0 });
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    if (!threshold) return undefined;
    let raf = 0;
    let observer = null;

    const run = () => {
      started.current = true;
      const from = shown.current;
      const to = { r: rTarget, m: mTarget };
      if (reducedMotion() || (from.r === to.r && from.m === to.m)) {
        shown.current = to;
        setV(to);
        return;
      }
      const duration = from.r === 0 && from.m === 0 ? FIRST_DURATION : UPDATE_DURATION;
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min(1, (now - t0) / duration);
        const e = ease(p);
        const cur = { r: from.r + (to.r - from.r) * e, m: from.m + (to.m - from.m) * e };
        shown.current = cur;
        setV(cur);
        if (p < 1) {
          raf = requestAnimationFrame(step);
        } else if (to.r >= threshold && from.r < threshold) {
          setCelebrate(true);
        }
      };
      raf = requestAnimationFrame(step);
    };

    const el = ref.current;
    if (started.current || !el || typeof IntersectionObserver === "undefined") {
      run();
    } else {
      // On attend que le sceau soit visible pour lancer l'animation.
      observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((x) => x.isIntersecting)) {
            observer.disconnect();
            observer = null;
            run();
          }
        },
        { threshold: 0.4 }
      );
      observer.observe(el);
    }

    return () => {
      cancelAnimationFrame(raf);
      if (observer) observer.disconnect();
    };
  }, [rTarget, mTarget, threshold]);

  if (!threshold) return null;

  const a = (C * Math.max(0, v.r - v.m)) / threshold;
  const b = (C * v.m) / threshold;
  const drawnFull = v.r >= threshold - 0.001;
  const shownMissing = Math.max(0, Math.round(threshold - v.r));
  const missing = Math.max(0, threshold - reserved);
  const m = mTarget;
  const stroke = size >= 96 ? 5 : size >= 64 ? 6.5 : 9;
  const label =
    missing === 0
      ? `Commande complète : ${threshold} bouteilles sur ${threshold}`
      : `Plus que ${missing} bouteille${missing > 1 ? "s" : ""} sur ${threshold}${m ? `, dont ${m} à vous` : ""}`;

  return (
    <span ref={ref} className="seal" style={{ width: size, height: size }}>
      <svg
        role="img"
        aria-label={label}
        width={size}
        height={size}
        viewBox="0 0 96 96"
        className={`${styles.svg}${celebrate ? ` ${styles.glow}` : ""}`}
      >
        <circle cx="48" cy="48" r="40" fill="none" stroke="var(--line)" strokeWidth={stroke} />
        {celebrate && (
          <circle
            className={styles.halo}
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke="var(--gold-soft)"
            strokeWidth={stroke}
          />
        )}
        {a > 0.01 && (
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
        {b > 0.01 && (
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
        {drawnFull && (
          <path
            className={styles.check}
            pathLength="1"
            d="M34 49l10 10 19-22"
            fill="none"
            stroke="var(--gold-soft)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
      {!bare && !drawnFull && (
        <span className="seal-center" aria-hidden="true">
          <span className={`seal-num ${styles.num}`} style={{ fontSize: Math.round(size * 0.3) }}>
            {shownMissing}
          </span>
          {size >= 64 && <span className="seal-lbl">à trouver</span>}
        </span>
      )}
    </span>
  );
}
