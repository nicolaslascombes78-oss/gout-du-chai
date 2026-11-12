import Link from "next/link";
import BellLink from "@/components/BellLink";
import ConceptButton from "@/components/ConceptButton";
import BrandLogo from "@/components/BrandLogo";

// En-tête des écrans du club. La déconnexion se trouve en bas de l'espace Membre.
// En haut à gauche : le logo du club (ou le lien de retour sur les sous-pages).
// En haut à droite : le bouton « ? » (concept du club, sur l'accueil seulement) et la cloche.
export default function ClubHeader({ back }) {
  return (
    <div className="row" style={{ alignItems: "center" }}>
      {back ? (
        <Link href={back.href} className="muted">
          ← {back.label}
        </Link>
      ) : (
        <BrandLogo />
      )}
      <span className="head-actions">
        <ConceptButton />
        <BellLink />
      </span>
    </div>
  );
}
