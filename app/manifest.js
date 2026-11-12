// Manifeste de l'appli installable (PWA).
// Next.js le sert automatiquement à l'adresse /manifest.webmanifest
// et ajoute lui-même la balise <link rel="manifest"> dans toutes les pages.
// Icônes : le bouchon « marque au fer ». Les adresses ont changé de nom (bouchon-…)
// pour que les téléphones remplacent l'ancienne icône au lieu de la garder en mémoire.
export default function manifest() {
  return {
    id: "/club",
    name: "Le Goût du Chai",
    short_name: "Goût du Chai",
    description: "Le cercle privé d'achats groupés, directement auprès des domaines.",
    lang: "fr",
    dir: "ltr",
    start_url: "/club",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0e0d0b", // encre : écran de lancement
    theme_color: "#0e0d0b",
    icons: [
      { src: "/pwa-icon/bouchon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/bouchon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/bouchon-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
