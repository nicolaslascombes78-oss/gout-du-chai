// Icônes de l'appli générées par le code (aucun fichier image à envoyer sur GitHub).
// Adresses : /pwa-icon/192, /pwa-icon/512, /pwa-icon/maskable, /pwa-icon/apple
// Elles sont fabriquées une seule fois au déploiement, puis servies comme des fichiers fixes.
import { ImageResponse } from "next/og";

export const dynamic = "force-static";

const ENCRE = "#0e0d0b";
const OR = "#c9a45c";
const OR_CLAIR = "#e3c987";

// size : taille en pixels ; zone : part de l'image où le dessin doit tenir
// (Android découpe les icônes « maskable » en cercle : on garde le dessin au centre)
const VARIANTES = {
  "192": { size: 192, zone: 0.84 },
  "512": { size: 512, zone: 0.84 },
  maskable: { size: 512, zone: 0.62 },
  apple: { size: 180, zone: 0.84 },
};

export function generateStaticParams() {
  return Object.keys(VARIANTES).map((variant) => ({ variant }));
}

// Charge la lettre « G » en Bodoni Moda depuis Google Fonts.
// En cas d'échec, l'icône est quand même produite avec la police par défaut.
async function chargerBodoni() {
  try {
    const css = await (
      await fetch("https://fonts.googleapis.com/css2?family=Bodoni+Moda:wght@500&text=G")
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    return await (await fetch(url)).arrayBuffer();
  } catch {
    return null;
  }
}

export async function GET(_request, { params }) {
  const { variant } = await params;
  const v = VARIANTES[variant];
  if (!v) return new Response("Icône introuvable", { status: 404 });

  const police = await chargerBodoni();
  const s = v.size;
  const cadre = Math.round(s * v.zone);
  const trait = Math.max(1, Math.round(s / 160));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: ENCRE,
        }}
      >
        <div
          style={{
            width: cadre,
            height: cadre,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `${trait}px solid ${OR}`,
            borderRadius: Math.round(cadre * 0.08),
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: Math.round(cadre * 0.66),
              lineHeight: 1,
              color: OR_CLAIR,
              fontFamily: police ? "Bodoni" : undefined,
              marginTop: Math.round(cadre * 0.04),
            }}
          >
            G
          </div>
        </div>
      </div>
    ),
    {
      width: s,
      height: s,
      ...(police ? { fonts: [{ name: "Bodoni", data: police, weight: 500, style: "normal" }] } : {}),
    }
  );
}
