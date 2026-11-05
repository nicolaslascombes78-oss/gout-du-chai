import Link from "next/link";
import BellLink from "@/components/BellLink";

// En-tête des écrans du club. La déconnexion se trouve en bas de l'espace Membre.
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
      <BellLink />
    </div>
  );
}
