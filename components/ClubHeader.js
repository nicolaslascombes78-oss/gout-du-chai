import Link from "next/link";

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
      <form action="/deconnexion" method="post">
        <button className="link-btn">Déconnexion</button>
      </form>
    </div>
  );
}
