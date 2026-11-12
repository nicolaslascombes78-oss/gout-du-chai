// Gabarit commun des sous-pages de l'espace membre : retour, titre, introduction.
import Link from "next/link";
import ClubHeader from "@/components/ClubHeader";
import e from "@/components/Espace.module.css";

export default function SousPage({ titre, intro, children }) {
  return (
    <main className="shell">
      <ClubHeader />
      <Link href="/club/membre" className={e.retour}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        Votre espace
      </Link>
      <h1 style={{ fontSize: 30 }}>{titre}</h1>
      {intro && <p className={e.introPage}>{intro}</p>}
      <div className={e.contenu}>{children}</div>
    </main>
  );
}
