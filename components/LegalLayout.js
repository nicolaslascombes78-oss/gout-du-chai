import Link from "next/link";
import { CLUB } from "@/lib/club-infos";

// Mise en page commune des pages Règles du club, Mentions légales et Confidentialité.
// Ces pages restent lisibles sans être connecté.
export default function LegalLayout({ title, intro, children }) {
  return (
    <main className="shell legal">
      <div className="row" style={{ alignItems: "center" }}>
        <Link href="/" className="muted">
          ← Le Goût du Chai
        </Link>
      </div>
      <h1 className="legal-title">{title}</h1>
      {intro && <p className="legal-intro">{intro}</p>}
      <p className="legal-maj">Mise à jour le {CLUB.miseAJour}</p>
      <div className="legal-body">{children}</div>
      <LegalLinks />
    </main>
  );
}

export function LegalLinks() {
  return (
    <footer className="foot legal-links">
      <nav aria-label="Informations du club">
        <Link href="/regles">Règles du club</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/mentions-legales">Mentions légales</Link>
        <span aria-hidden="true"> · </span>
        <Link href="/confidentialite">Confidentialité</Link>
      </nav>
      <p>L&apos;abus d&apos;alcool est dangereux pour la santé, à consommer avec modération. Vente réservée aux personnes majeures.</p>
    </footer>
  );
}
