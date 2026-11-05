"use client";

// Profondeur de l'appli :
// - les photos des domaines glissent un peu moins vite que la page au défilement ;
// - les cartes situées plus bas montent doucement et sortent de l'ombre en arrivant à l'écran ;
// - fondu entre les pages : l'ancienne page s'assombrit au toucher d'un lien,
//   puis chaque nouvelle page (écran de chargement compris) apparaît en fondu.
// Rien ne s'active si le téléphone est réglé sur « réduire les animations ».
import { useEffect } from "react";

const PHOTOS = ".dom-img-hero:not(.is-logo):not(.is-empty), .dom-img-cover:not(.is-logo):not(.is-empty)";
const CARTES = ".card, .ncard";
const AMPLITUDE = 5; // en % de la hauteur de la photo
const PAGES = ".club-app main";
const FONDU_ENTREE = 500; // durée d'apparition d'une nouvelle page, en millisecondes
const FONDU_SORTIE = 180; // durée d'assombrissement de l'ancienne page

export default function Depth() {
  useEffect(() => {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    const root = document.documentElement;
    root.classList.add("depth-on");
    const seen = new WeakSet();
    const seenPages = new WeakSet();
    let firstWatch = true;
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
      // Fondu d'entrée de chaque nouvelle page (pas pour la toute première, déjà affichée)
      document.querySelectorAll(PAGES).forEach((page) => {
        if (seenPages.has(page)) return;
        seenPages.add(page);
        if (firstWatch || typeof page.animate !== "function") return;
        page.animate(
          [
            { opacity: 0, transform: "translateY(12px)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: FONDU_ENTREE, easing: "cubic-bezier(.2, .7, .2, 1)", fill: "backwards" }
        );
      });
      firstWatch = false;
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

    // Fondu de sortie : l'ancienne page s'assombrit dès qu'on touche un lien du club
    const onClick = (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || !url.pathname.startsWith("/club")) return;
      if (url.pathname === window.location.pathname) return;
      const page = document.querySelector(PAGES);
      if (!page || typeof page.animate !== "function") return;
      const dim = page.animate([{ opacity: 1 }, { opacity: 0.3 }], {
        duration: FONDU_SORTIE,
        easing: "ease-out",
        fill: "forwards",
      });
      // Si la page ne change finalement pas, elle redevient normale
      setTimeout(() => {
        if (page.isConnected) dim.cancel();
      }, 2500);
    };
    document.addEventListener("click", onClick, true);

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
      document.removeEventListener("click", onClick, true);
      root.classList.remove("depth-on");
    };
  }, []);

  return null;
}
