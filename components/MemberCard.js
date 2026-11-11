"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./MemberCard.module.css";

// Carte de membre qui capte la lumière : le reflet doré suit l'inclinaison du téléphone.
// Sans capteur (ou avant l'autorisation sur iPhone), le reflet dérive doucement et suit le doigt.
export default function MemberCard({ children }) {
  const ref = useRef(null);
  const [aDemander, setADemander] = useState(false); // iPhone : il faut un toucher pour autoriser le capteur
  const ecouteRef = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduit = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduit) return; // reflet fixe, pas d'animation

    const clamp = (v) => Math.max(-1, Math.min(1, v));
    let cible = { x: 0, y: -0.3 };
    const actuel = { x: 0, y: -0.3 };
    let base = null;
    let capteur = false;
    let doigt = false;
    let visible = true;
    let raf = 0;
    const debut = performance.now();

    function boucle(t) {
      if (!capteur && !doigt) {
        // Dérive lente, comme une lumière qui passe
        const s = (t - debut) / 1000;
        cible = { x: Math.sin(s * 0.45) * 0.6, y: Math.cos(s * 0.3) * 0.4 - 0.1 };
      }
      actuel.x += (cible.x - actuel.x) * 0.08;
      actuel.y += (cible.y - actuel.y) * 0.08;
      el.style.setProperty("--mx", `${(50 + actuel.x * 50).toFixed(2)}%`);
      el.style.setProperty("--my", `${(50 + actuel.y * 50).toFixed(2)}%`);
      el.style.setProperty("--ry", `${(actuel.x * 6).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${(-actuel.y * 6).toFixed(2)}deg`);
      raf = visible ? requestAnimationFrame(boucle) : 0;
    }

    function orientation(e) {
      if (e.gamma == null || e.beta == null) return;
      capteur = true;
      if (base === null) base = e.beta;
      base += (e.beta - base) * 0.01; // se recentre doucement sur la façon de tenir le téléphone
      cible = { x: clamp(e.gamma / 22), y: clamp((e.beta - base) / 22) };
    }
    ecouteRef.current = () => window.addEventListener("deviceorientation", orientation);

    function suitDoigt(e) {
      const r = el.getBoundingClientRect();
      doigt = true;
      cible = {
        x: clamp(((e.clientX - r.left) / r.width) * 2 - 1),
        y: clamp(((e.clientY - r.top) / r.height) * 2 - 1),
      };
    }
    function lacheDoigt() {
      doigt = false;
    }
    el.addEventListener("pointermove", suitDoigt);
    el.addEventListener("pointerdown", suitDoigt);
    el.addEventListener("pointerup", lacheDoigt);
    el.addEventListener("pointerleave", lacheDoigt);
    el.addEventListener("pointercancel", lacheDoigt);

    const D = window.DeviceOrientationEvent;
    if (D && typeof D.requestPermission === "function") setADemander(true);
    else if (D) ecouteRef.current();

    // Pas d'animation quand la carte est hors de l'écran (économie de batterie)
    const obs = new IntersectionObserver(([entree]) => {
      visible = entree.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(boucle);
    });
    obs.observe(el);
    raf = requestAnimationFrame(boucle);

    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
      window.removeEventListener("deviceorientation", orientation);
      el.removeEventListener("pointermove", suitDoigt);
      el.removeEventListener("pointerdown", suitDoigt);
      el.removeEventListener("pointerup", lacheDoigt);
      el.removeEventListener("pointerleave", lacheDoigt);
      el.removeEventListener("pointercancel", lacheDoigt);
    };
  }, []);

  async function activer() {
    if (!aDemander) return;
    setADemander(false);
    try {
      const reponse = await window.DeviceOrientationEvent.requestPermission();
      if (reponse === "granted") ecouteRef.current?.();
    } catch {
      // refusé ou indisponible : le reflet continue de suivre le doigt
    }
  }

  return (
    <section ref={ref} className={`member-card stack ${styles.carte}`} onClick={activer}>
      {children}
      {aDemander && <p className={styles.indice}>Touchez la carte, puis inclinez le téléphone</p>}
    </section>
  );
}
