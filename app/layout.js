import { Bodoni_Moda, Inter } from "next/font/google";
import "./globals.css";
import "./pwa.css";
import "./ambiance.css";

const serif = Bodoni_Moda({ subsets: ["latin"], variable: "--font-serif", display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata = {
  title: "Le Goût du Chai — Club privé",
  description: "Le club des vignerons confidentiels. Sur invitation.",
  robots: { index: false, follow: false },
  applicationName: "Le Goût du Chai",
  // Appli ajoutée à l'écran d'accueil de l'iPhone : plein écran, barre d'état fondue dans le fond encre
  appleWebApp: {
    capable: true,
    title: "Goût du Chai",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/pwa-icon/192",
    apple: "/pwa-icon/apple",
  },
  formatDetection: { telephone: false },
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0e0d0b",
  viewportFit: "cover", // l'appli occupe tout l'écran, encoche comprise
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
