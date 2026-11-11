// Pluie de paillettes d'or, lancée quand un membre valide sa réservation.
// Le calque est posé directement sur la page : il continue pendant le changement d'écran,
// puis se retire tout seul. Rien ne se passe si le téléphone demande de réduire les animations.

const COULEURS = ["#c9a45c", "#e3c987", "#f2ebdd", "#fff4d6", "#b08a43"];
const NOMBRE = 110; // nombre de paillettes
const DUREE = 2200; // durée totale en millisecondes

export function lancerPaillettes(origine) {
  if (typeof window === "undefined") return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: `${w}px`,
    height: `${h}px`,
    pointerEvents: "none",
    zIndex: "9999",
  });
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }
  ctx.scale(dpr, dpr);

  // Les paillettes jaillissent du bouton (ou du bas de l'écran à défaut)
  const x0 = origine ? origine.left + origine.width / 2 : w / 2;
  const y0 = origine ? origine.top + origine.height / 2 : h * 0.75;
  const largeur = origine ? origine.width * 0.7 : 60;

  const parts = Array.from({ length: NOMBRE }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.85;
    const vitesse = 7 + Math.random() * 10;
    return {
      x: x0 + (Math.random() - 0.5) * largeur,
      y: y0,
      vx: Math.cos(angle) * vitesse,
      vy: Math.sin(angle) * vitesse,
      r: 2 + Math.random() * 3.5,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.3,
      couleur: COULEURS[Math.floor(Math.random() * COULEURS.length)],
      losange: Math.random() < 0.45,
      phase: Math.random() * Math.PI * 2,
    };
  });

  const debut = performance.now();
  let precedent = debut;

  function image(t) {
    const dt = Math.min(2, (t - precedent) / 16.67);
    precedent = t;
    const age = (t - debut) / DUREE;
    const fondu = Math.max(0, 1 - Math.max(0, age - 0.55) / 0.45);

    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.vx *= Math.pow(0.985, dt);
      p.vy = p.vy * Math.pow(0.985, dt) + 0.32 * dt; // gravité
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;

      const scintille = 0.6 + 0.4 * Math.sin(t / 90 + p.phase);
      ctx.globalAlpha = fondu * scintille;
      ctx.fillStyle = p.couleur;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      if (p.losange) {
        ctx.beginPath();
        ctx.moveTo(0, -p.r * 1.3);
        ctx.lineTo(p.r * 0.7, 0);
        ctx.lineTo(0, p.r * 1.3);
        ctx.lineTo(-p.r * 0.7, 0);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.scale(1, Math.cos(p.rot * 2)); // petite feuille d'or qui tourne sur elle-même
        ctx.fillRect(-p.r, -p.r * 0.45, p.r * 2, p.r * 0.9);
      }
      ctx.restore();
    }

    if (age < 1) requestAnimationFrame(image);
    else canvas.remove();
  }

  requestAnimationFrame(image);
}
