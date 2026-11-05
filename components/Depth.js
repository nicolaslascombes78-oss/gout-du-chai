"use client";

// Profondeur de l'appli :
// - les photos des domaines glissent un peu moins vite que la page au défilement ;
// - les cartes situées plus bas montent doucement et sortent de l'ombre en arrivant à l'écran.
// Rien ne s'active si le téléphone est réglé sur « réduire les animations ».
import { useEffect } from "react";

const PHOTOS = ".dom-img-hero:not(.is-logo):not(.is-empty), .dom-img-cover:not(.is-logo):not(.is-empty)";
const CARTES = ".card, .ncard";
const AMPLITUDE = 5; // en % de la hauteur de la photo

export default function Depth() {
  useEffect(() => {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const root = document.documentElement;
    root.classList.add("depth-on");
    const seen = new WeakSet();
    let raf = 0;
    let watchRaf = 0;

    // Décalage des photos selon leur position à l'écran
    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      document.querySelectorAll(PHOTOS).forEach((fig) => {
        const r = fig.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        const p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
        const clamped = Math.max(-1, Math.min(1, p));
        fig.style.setProperty("--py", `${(clamped * -AMPLITUDE).toFixed(2)}%`);
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    // Apparition des cartes
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target;
          io.unobserve(el);
          el.classList.add("is-in");
          // Une fois arrivée, la carte redevient normale (retour au toucher compris)
          setTimeout(() => el.classList.remove("reveal", "is-in"), 750);
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.05 }
    );

    const watch = () => {
      watchRaf = 0;
      const vh = window.innerHeight;
      document.querySelectorAll(CARTES).forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        // Les cartes déjà visibles ne s'animent pas : pas de clignotement à l'ouverture
        if (el.getBoundingClientRect().top < vh) return;
        el.classList.add("reveal");
        io.observe(el);
      });
      onScroll();
    };
    const scheduleWatch = () => {
      if (!watchRaf) watchRaf = requestAnimationFrame(watch);
    };

    watch();
    // Nouvelles pages et nouveaux contenus (navigation dans l'appli)
    const mo = new MutationObserver(scheduleWatch);
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(watchRaf);
      io.disconnect();
      mo.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      root.classList.remove("depth-on");
    };
  }, []);

  return null;
}
