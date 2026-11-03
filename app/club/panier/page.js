import Link from "next/link";
import ClubHeader from "@/components/ClubHeader";
import { requireMember } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Panier() {
  await requireMember();
  return (
    <main className="shell">
      <ClubHeader />
      <h1 style={{ fontSize: 32 }}>Votre panier</h1>
      <div className="ornament" />
      <section className="card stack" style={{ textAlign: "center" }}>
        <h2>Votre panier est vide</h2>
        <p className="muted">
          Les réservations ouvrent très bientôt. Vous pourrez réserver vos cuvées
          dans plusieurs domaines à la fois et suivre l&apos;avancement de chaque
          commande groupée.
        </p>
        <Link href="/club/selection" className="btn">
          Parcourir la Sélection
        </Link>
      </section>
    </main>
  );
}
