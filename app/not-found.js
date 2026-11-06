import Link from "next/link";
import "@/app/ergonomie.css";

export const metadata = { title: "Page introuvable — Le Goût du Chai" };

// Page affichée pour toute adresse inconnue (lien cassé, domaine retiré…).
export default function NotFound() {
  return (
    <main className="shell errpage">
      <p className="brand">Le Goût du Chai</p>
      <div className="errpage-body">
        <p className="errpage-code" aria-hidden="true">
          404
        </p>
        <h1 className="errpage-title">Cette page n&apos;existe pas, ou plus.</h1>
        <p className="errpage-txt">
          Le domaine a peut-être quitté la Sélection, ou le lien que vous avez suivi est incomplet.
        </p>
        <div className="errpage-actions">
          <Link href="/club/selection" className="btn">
            Voir la Sélection
          </Link>
          <Link href="/club" className="btn btn-ghost">
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
      <footer className="foot">L&apos;abus d&apos;alcool est dangereux pour la santé, à consommer avec modération.</footer>
    </main>
  );
}
