"use client";

// Le sceau : un anneau doré qui se referme quand la commande est complète.
// Or = bouteilles réservées par le club, ivoire = celles du membre, gris = à trouver.
// Au centre : le nombre de bouteilles qui manquent (une coche quand le seuil est atteint).
//
// Effets : l'anneau se trace quand le sceau apparaît à l'écran et le nombre
// décompte jusqu'à sa valeur ; quand une réservation change, l'anneau glisse
// vers la nouvelle valeur ; quand le seuil est atteint, la coche se dessine et
// un éclat doré passe une fois. Ensuite, de temps en temps, un reflet de lumière
// traverse la partie remplie de l'anneau, comme sur un sceau de cire.
// Tout est coupé si le téléphone est réglé sur « réduire les animations ».
import { useEffect, useId, useRef, useState } from "react";
import styles from "./Seal.module.css";

const C = 2 * Math.PI * 40;
const FIRST_DURATION = 1100; // première apparition
const UPDATE_DURATION = 600; // changement de réservation
const ease = (t) => 1 - Math.pow(1 - t, 3);
const ECLAT_CYCLE = 8; // un reflet toutes les 8 secondes environ, décalé d'un sceau à l'autre

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
  const [calm, setCalm] = useState(true); // pas de reflet tant qu'on ne sait pas si les animations sont permises
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const shineId = `seal-shine-${uid}`;
  // Décalage stable propre à chaque sceau, pour que les reflets ne passent pas tous en même temps
  const shineDelay = (uid.split("").reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 997, 7) % 80) / 10;

  useEffect(() => {
    setCalm(reducedMotion());
  }, []);

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
  const settled = Math.abs(v.r - rTarget) < 0.001 && Math.abs(v.m - mTarget) < 0.001;
  const filled = a + b;
  const showShine = !calm && settled && filled > 0.01;
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
        {showShine && (
          <>
            <defs>
              <linearGradient id={shineId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="96" y2="96">
                <stop offset="0" stopColor="#fff3d6" stopOpacity="0" />
                <stop offset="0.42" stopColor="#fff3d6" stopOpacity="0" />
                <stop offset="0.5" stopColor="#fff3d6" stopOpacity="0.85" />
                <stop offset="0.58" stopColor="#fff3d6" stopOpacity="0" />
                <stop offset="1" stopColor="#fff3d6" stopOpacity="0" />
                <animateTransform
                  attributeName="gradientTransform"
                  type="translate"
                  values="-110 -110; 110 110; 110 110"
                  keyTimes="0; 0.15; 1"
                  calcMode="spline"
                  keySplines="0.4 0 0.2 1; 0 0 1 1"
                  dur={`${ECLAT_CYCLE}s`}
                  begin={`${shineDelay}s`}
                  repeatCount="indefinite"
                />
              </linearGradient>
            </defs>
            <circle
              cx="48"
              cy="48"
              r="40"
              fill="none"
              stroke={`url(#${shineId})`}
              strokeWidth={stroke}
              strokeDasharray={`${filled} ${C}`}
              transform="rotate(-90 48 48)"
              pointerEvents="none"
            />
          </>
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
