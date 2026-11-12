// Icônes de l'appli générées par le code (aucun fichier image à envoyer sur GitHub).
// Dessin : le bouchon « marque au fer » (monogramme GC pyrogravé sur liège).
// Adresses : /pwa-icon/192, /pwa-icon/512, /pwa-icon/maskable, /pwa-icon/apple
//            /pwa-icon/logo (bouchon seul, fond transparent, pour l'en-tête de l'appli)
// Elles sont fabriquées une seule fois au déploiement, puis servies comme des fichiers fixes.
import { ImageResponse } from "next/og";
import * as opentype from "opentype.js";

export const dynamic = "force-static";

const ENCRE = "#0e0d0b";
const MARQUE = "#120904"; // couleur du marquage au fer

// size : taille en pixels ; zone : part de l'image occupée par le bouchon ;
// fond : true = fond encre de l'appli, false = transparent.
// (Android découpe les icônes « maskable » en cercle : on garde le bouchon au centre)
const VARIANTES = {
  "192": { size: 192, zone: 0.9, fond: true },
  "512": { size: 512, zone: 0.9, fond: true },
  maskable: { size: 512, zone: 0.74, fond: true },
  apple: { size: 180, zone: 0.9, fond: true },
  logo: { size: 256, zone: 0.94, fond: false },
};

export function generateStaticParams() {
  return Object.keys(VARIANTES).map((variant) => ({ variant }));
}

// Charge une police Google (uniquement les lettres utiles).
// En cas d'échec, le bouchon est quand même produit, sans les lettres.
async function chargerPolice(famille, axes, texte) {
  try {
    const css = await (
      await fetch(
        `https://fonts.googleapis.com/css2?family=${famille}:${axes}&text=${encodeURIComponent(texte)}`
      )
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    return opentype.parse(await (await fetch(url)).arrayBuffer());
  } catch {
    return null;
  }
}

// Transforme un texte en tracés posés sur un cercle (centre 200,200).
// haut = true : texte en haut du bouchon ; false : texte en bas, lisible de gauche à droite.
function texteEnArc(police, texte, taille, espacement, rayon, haut) {
  if (!police) return "";
  const echelle = taille / police.unitsPerEm;
  const lettres = [...texte].map((c) => ({
    c,
    av: police.charToGlyph(c).advanceWidth * echelle,
  }));
  const total = lettres.reduce((s, l) => s + l.av + espacement, 0) - espacement;
  let curseur = 0;
  let sortie = "";
  for (const l of lettres) {
    const s = curseur + l.av / 2;
    curseur += l.av + espacement;
    if (l.c === " ") continue;
    const angle = haut
      ? -Math.PI / 2 - total / 2 / rayon + s / rayon
      : Math.PI / 2 + total / 2 / rayon - s / rayon;
    const x = 200 + rayon * Math.cos(angle);
    const y = 200 + rayon * Math.sin(angle);
    const rot = (angle * 180) / Math.PI + (haut ? 90 : -90);
    const d = police.getPath(l.c, -l.av / 2, 0, taille).toPathData(2);
    sortie += `<path transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rot.toFixed(2)})" d="${d}"/>`;
  }
  return sortie;
}

function lettre(police, c, x, y, taille) {
  if (!police) return "";
  const av = (police.charToGlyph(c).advanceWidth * taille) / police.unitsPerEm;
  return `<path d="${police.getPath(c, x - av / 2, y, taille).toPathData(2)}"/>`;
}

const FEUILLE = `d="M 0 0 Q 6 -5 14 0 Q 6 5 0 0 Z"`;
const feuilles = [
  [128, 125], [138, 55], [148, 125], [158, 55], [168, 90],
  [52, -125], [42, -55], [32, -125], [22, -55], [12, -90],
]
  .map(([a, r]) => `<path transform="translate(200 200) rotate(${a}) translate(147 0) rotate(${r})" ${FEUILLE}/>`)
  .join("");

// Le bouchon, dessiné dans un carré de 400 × 400.
function bouchon(cinzel, cormorant, ombre) {
  return `
<defs>
<radialGradient id="g" cx="42%" cy="36%" r="70%"><stop offset="0" stop-color="#F8EBD0"/><stop offset="0.6" stop-color="#EED5AA"/><stop offset="0.92" stop-color="#DDB984"/><stop offset="1" stop-color="#B98D52"/></radialGradient>
<filter id="t" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="3" seed="9"/><feColorMatrix values="0 0 0 0 0.34  0 0 0 0 0.20  0 0 0 0 0.09  -9 0 0 0 4.1"/><feComposite in2="SourceGraphic" operator="in"/></filter>
<filter id="u" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.28  0 0 0 0 0.12  0.8 0 0 0 -0.4"/><feComposite in2="SourceGraphic" operator="in"/></filter>
<filter id="b" x="-5%" y="-5%" width="110%" height="110%">
<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="5" result="n"/>
<feDisplacementMap in="SourceGraphic" in2="n" scale="0.7" result="ink"/>
<feMorphology in="ink" operator="dilate" radius="1.2" result="fat"/>
<feGaussianBlur in="fat" stdDeviation="1.6" result="soft"/>
<feColorMatrix in="soft" values="0 0 0 0 0.42  0 0 0 0 0.24  0 0 0 0 0.09  0 0 0 0.12 0" result="halo"/>
<feMerge><feMergeNode in="halo"/><feMergeNode in="ink"/></feMerge>
</filter>
<filter id="o" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000" flood-opacity="0.6"/></filter>
<radialGradient id="v" cx="50%" cy="50%" r="50%"><stop offset="0.78" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#3A2010" stop-opacity="0.22"/></radialGradient>
</defs>
<circle cx="200" cy="200" r="184" fill="url(#g)"${ombre ? ' filter="url(#o)"' : ""}/>
<circle cx="200" cy="200" r="184" fill="#000" filter="url(#u)"/>
<circle cx="200" cy="200" r="184" fill="#000" filter="url(#t)" opacity="0.2"/>
<g fill="#6E4A26" opacity="0.32"><ellipse cx="112" cy="116" rx="5" ry="2.2"/><ellipse cx="292" cy="124" rx="4" ry="1.8"/><ellipse cx="318" cy="276" rx="5" ry="2.4"/><ellipse cx="86" cy="262" rx="3.5" ry="1.8"/><ellipse cx="168" cy="72" rx="3" ry="1.4"/><ellipse cx="334" cy="196" rx="3" ry="1.6"/><ellipse cx="236" cy="338" rx="4" ry="1.8"/></g>
<circle cx="200" cy="200" r="184" fill="url(#v)"/>
<circle cx="200" cy="200" r="183" fill="none" stroke="#8C6234" stroke-width="2.5"/>
<path d="M 60 120 A 165 165 0 0 1 280 50" fill="none" stroke="#FBEBCB" stroke-opacity="0.55" stroke-width="2" stroke-linecap="round"/>
<g filter="url(#b)" fill="${MARQUE}" stroke="${MARQUE}">
<circle cx="200" cy="200" r="172" fill="none" stroke-width="3.8"/>
<circle cx="200" cy="200" r="166.5" fill="none" stroke-width="1.4"/>
<circle cx="200" cy="200" r="118" fill="none" stroke-width="1.4"/>
<circle cx="200" cy="200" r="113" fill="none" stroke-width="3"/>
<circle cx="200" cy="200" r="107" fill="none" stroke-width="2.8" stroke-linecap="round" stroke-dasharray="0 8.4"/>
<g stroke="none">
${texteEnArc(cinzel, "LE GOÛT DU CHAI", 23, 6.6, 138, true)}
${texteEnArc(cinzel, "CLUB PRIVÉ", 12.5, 4.5, 156, false)}
<path d="M 56 194 L 58 198.5 L 62.8 199 L 59.2 202 L 60.3 206.8 L 56 204.3 L 51.7 206.8 L 52.8 202 L 49.2 199 L 54 198.5 Z"/>
<path d="M 344 194 L 346 198.5 L 350.8 199 L 347.2 202 L 348.3 206.8 L 344 204.3 L 339.7 206.8 L 340.8 202 L 337.2 199 L 342 198.5 Z"/>
${feuilles}
<circle cx="194" cy="118" r="3.2"/><circle cx="201.5" cy="118" r="3.2"/><circle cx="209" cy="118" r="3.2"/>
<circle cx="197.7" cy="124.5" r="3.2"/><circle cx="205.2" cy="124.5" r="3.2"/>
<circle cx="201.5" cy="131" r="3.2"/>
${lettre(cormorant, "G", 181, 246, 128)}
${lettre(cormorant, "C", 226, 246, 128)}
<path d="M 200 264 L 204 268 L 200 272 L 196 268 Z"/>
</g>
<path d="M 126.5 327.3 A 147 147 0 0 1 56.2 230.6" fill="none" stroke-width="1.3"/>
<path d="M 273.5 327.3 A 147 147 0 0 0 343.8 230.6" fill="none" stroke-width="1.3"/>
<path d="M 201.5 114.5 Q 203 108 209 105" fill="none" stroke-width="1.2" stroke-linecap="round"/>
<line x1="152" y1="268" x2="192" y2="268" stroke-width="0.9"/>
<line x1="208" y1="268" x2="248" y2="268" stroke-width="0.9"/>
</g>`;
}

export async function GET(_request, { params }) {
  const { variant } = await params;
  const v = VARIANTES[variant];
  if (!v) return new Response("Icône introuvable", { status: 404 });

  const [cinzel, cormorant] = await Promise.all([
    chargerPolice("Cinzel", "wght@700", "LE GOÛT DU CHAI CLUB PRIVÉ"),
    chargerPolice("Cormorant+Garamond", "ital,wght@1,700", "GC"),
  ]);

  const s = v.size;
  const d = s * v.zone; // diamètre du bouchon
  const k = d / 400;
  const marge = (s - d) / 2;

  const fond = v.fond
    ? `<defs>
<radialGradient id="lueur" cx="50%" cy="-8%" r="75%"><stop offset="0" stop-color="#c9a45c" stop-opacity="0.16"/><stop offset="0.62" stop-color="#c9a45c" stop-opacity="0"/></radialGradient>
<radialGradient id="vig" cx="50%" cy="50%" r="72%"><stop offset="0.52" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.4"/></radialGradient>
</defs>
<rect width="${s}" height="${s}" fill="${ENCRE}"/>
<rect width="${s}" height="${s}" fill="url(#lueur)"/>
<rect width="${s}" height="${s}" fill="url(#vig)"/>`
    : "";

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
${fond}
<g transform="translate(${marge} ${marge}) scale(${k})">${bouchon(cinzel, cormorant, v.fond)}</g>
</svg>`;

  const image = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex" }}>
        <img src={image} width={s} height={s} alt="" />
      </div>
    ),
    { width: s, height: s }
  );
}
