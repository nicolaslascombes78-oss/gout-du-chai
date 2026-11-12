import Link from "next/link";
import BellLink from "@/components/BellLink";
import ConceptButton from "@/components/ConceptButton";

// En-tête des écrans du club. La déconnexion se trouve en bas de l'espace Membre.
// En haut à droite : le bouton « ? » (concept du club, sur l'accueil seulement) et la cloche.
export default function ClubHeader({ back }) {
  return (
    <div className="row" style={{ alignItems: "center" }}>
      {back ? (
        <Link href={back.href} className="muted">
          ← {back.label}
        </Link>
      ) : (
        <Link href="/club" className="brand">
          Le Goût du Chai
        </Link>
      )}
      <span className="head-actions">
        <ConceptButton />
        <BellLink />
      </span>
    </div>
  );
}
