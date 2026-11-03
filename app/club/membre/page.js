import ClubHeader from "@/components/ClubHeader";
import { requireMember } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Membre() {
  const { member } = await requireMember();
  const numero = String(member.member_number).padStart(3, "0");
  const since = new Date(member.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <main className="shell">
      <ClubHeader />
      <h1 style={{ fontSize: 32 }}>Votre espace</h1>
      <div className="ornament" />

      <section className="member-card stack">
        <p className="eyebrow">Carte de membre</p>
        <p className="num">N° {numero}</p>
        <div className="row">
          <p>
            {member.first_name} {member.last_name}
          </p>
          <p className="muted">Membre depuis {since}</p>
        </div>
        <p className="muted">{member.email}</p>
      </section>

      <section className="section stack">
        <h2>Mes commandes</h2>
        <div className="card">
          <p className="muted">
            Vous n&apos;avez pas encore de réservation. Vos commandes en attente,
            déclenchées et livrées apparaîtront ici.
          </p>
        </div>
      </section>

      <section className="section stack">
        <h2>Mes invitations</h2>
        <div className="card stack">
          <p>
            Il vous reste <strong className="price">{member.invites_left}</strong>{" "}
            invitation{member.invites_left > 1 ? "s" : ""} à offrir.
          </p>
          <p className="muted">
            Bientôt, vous pourrez envoyer une invitation à un ami directement
            depuis cette page.
          </p>
        </div>
      </section>

      <section className="section">
        <form action="/deconnexion" method="post">
          <button className="btn btn-ghost">Se déconnecter</button>
        </form>
      </section>
    </main>
  );
}
