"use client";

// Profondeur de l'appli :
// - les photos des domaines glissent un peu moins vite que la page au défilement ;
// - les cartes situées plus bas montent doucement et sortent de l'ombre en arrivant à l'écran ;
// - fondu entre les pages : l'ancienne page s'assombrit au toucher d'un lien,
//   puis chaque nouvelle page (écran de chargement compris) apparaît en fondu ;
// - lumière vivante : le reflet doré des cartes suit l'inclinaison du téléphone (Android),
//   le doigt sur l'écran (iPhone, qui exigerait sinon une autorisation à chaque ouverture)
//   ou la souris (ordinateur). Le reflet se met en pause pendant un défilement :
//   le faire bouger en même temps obligeait l'iPhone à redessiner tout l'écran,
//   ce qui faisait décoller la barre du bas.
// Rien ne s'active si le téléphone est réglé sur « réduire les animations ».
import { useEffect } from "react";

const PHOTOS = ".dom-img-hero:not(.is-logo):not(.is-empty), .dom-img-cover:not(.is-logo):not(.is-empty)";
const CARTES = ".card, .ncard";
const AMPLITUDE = 5; // en % de la hauteur de la photo
const PAGES = ".club-app main";
const FONDU_ENTREE = 500; // durée d'apparition d'une nouvelle page, en millisecondes
const FONDU_SORTIE = 180; // durée d'assombrissement de l'ancienne page
const LUMIERE_REPOS = { x: 0.3, y: 0 }; // position du reflet quand rien ne bouge (en haut à gauche)
const LUMIERE_DOUCEUR = 0.12; // 0,05 = très lent, 0,3 = très vif
const LUMIERE_PAUSE = 200; // le reflet reprend 200 ms après la fin du défilement

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

    // Lumière vivante : position du reflet doré sur les cartes
    const cible = { ...LUMIERE_REPOS };
    const lumiere = { ...LUMIERE_REPOS };
    let lumiereRaf = 0;
    let defile = false; // vrai pendant un défilement : le reflet ne bouge pas
    let finDefile = 0;
    const borne = (v, min, max) => Math.max(min, Math.min(max, v));
    const anime = () => {
      lumiereRaf = 0;
      if (defile) return;
      lumiere.x += (cible.x - lumiere.x) * LUMIERE_DOUCEUR;
      lumiere.y += (cible.y - lumiere.y) * LUMIERE_DOUCEUR;
      root.style.setProperty("--lx", `${(lumiere.x * 100).toFixed(1)}%`);
      root.style.setProperty("--ly", `${(lumiere.y * 100).toFixed(1)}%`);
      if (Math.abs(cible.x - lumiere.x) > 0.002 || Math.abs(cible.y - lumiere.y) > 0.002) {
        lumiereRaf = requestAnimationFrame(anime);
      }
    };
    const relance = () => {
      if (!lumiereRaf && !defile) lumiereRaf = requestAnimationFrame(anime);
    };
    const vise = (x, y) => {
      cible.x = borne(x, -0.1, 1.1);
      cible.y = borne(y, -0.1, 1.1);
      relance();
    };
    const auRepos = () => vise(LUMIERE_REPOS.x, LUMIERE_REPOS.y);

    // Pendant un défilement, le reflet s'arrête ; il reprend juste après
    const onScrollLumiere = () => {
      defile = true;
      if (lumiereRaf) {
        cancelAnimationFrame(lumiereRaf);
        lumiereRaf = 0;
      }
      clearTimeout(finDefile);
      finDefile = setTimeout(() => {
        defile = false;
        relance();
      }, LUMIERE_PAUSE);
    };

    // Android (et appareils sans autorisation requise) : inclinaison du téléphone
    const iPhone = typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function";
    const onOrientation = (e) => {
      if (e.gamma == null || e.beta == null) return;
      // gauche-droite : de -35° à +35° ; avant-arrière : autour de 45° (téléphone tenu en main)
      vise(0.5 + e.gamma / 70, (e.beta - 25) / 50);
    };
    if (!iPhone) window.addEventListener("deviceorientation", onOrientation);

    // iPhone et ordinateur : le reflet suit le doigt ou la souris
    const onPointer = (e) => {
      if (e.pointerType === "touch" && !iPhone) return; // sur Android, c'est l'inclinaison qui commande
      vise(e.clientX / window.innerWidth, e.clientY / window.innerHeight);
    };
    const onPointerEnd = (e) => {
      if (e.pointerType === "touch") auRepos();
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onPointer, { passive: true });
    window.addEventListener("pointerup", onPointerEnd, { passive: true });
    window.addEventListener("pointercancel", onPointerEnd, { passive: true });
    document.documentElement.addEventListener("mouseleave", auRepos);

    watch();
    // Nouvelles pages et nouveaux contenus (navigation dans l'appli)
    const mo = new MutationObserver(scheduleWatch);
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScrollLumiere, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(watchRaf);
      io.disconnect();
      mo.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScrollLumiere);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("click", onClick, true);
      cancelAnimationFrame(lumiereRaf);
      clearTimeout(finDefile);
      window.removeEventListener("deviceorientation", onOrientation);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("pointerup", onPointerEnd);
      window.removeEventListener("pointercancel", onPointerEnd);
      document.documentElement.removeEventListener("mouseleave", auRepos);
      root.style.removeProperty("--lx");
      root.style.removeProperty("--ly");
      root.classList.remove("depth-on");
    };
  }, []);

  return null;
}
