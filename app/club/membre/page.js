import Link from "next/link";
import ClubHeader from "@/components/ClubHeader";
import Gauge from "@/components/Gauge";
import CancelDomainButton from "@/components/CancelDomainButton";
import InviteFriend from "@/components/InviteFriend";
import { requireMember } from "@/lib/data";
import { euros } from "@/lib/catalogue";

export const dynamic = "force-dynamic";

const ETAT = {
  ouvert: "En attente du seuil",
  bientot_atteint: "En attente du seuil",
  declenche: "Commande déclenchée",
  livre: "Livrée",
  expire: "Close",
  a_venir: "À venir",
};

export default async function Membre({ searchParams }) {
  const { supabase, member } = await requireMember();
  const params = await searchParams;
  const justReserved = params?.reserve === "1";

  const { data: resa } = await supabase
    .from("reservations")
    .select("id, quantity, unit_price, status, cuvees(id, name, vintage, domains(id, name, slug, status, threshold, deadline))")
    .eq("member_id", member.id)
    .in("status", ["en_attente", "confirmee", "payee"])
    .order("created_at");

  // Regroupe les bouteilles par domaine.
  const byDomain = {};
  for (const r of resa || []) {
    const d = r.cuvees?.domains;
    if (!d) continue;
    const g = (byDomain[d.id] ||= { domain: d, lines: [], bottles: 0, total: 0 });
    g.lines.push(r);
    g.bottles += r.quantity;
    g.total += r.quantity * Number(r.unit_price);
  }
  const groups = Object.values(byDomain);

  const ids = groups.map((g) => g.domain.id);
  const { data: prog } = ids.length
    ? await supabase.from("domain_progress").select("domain_id, reserved_bottles, participants").in("domain_id", ids)
    : { data: [] };
  const progress = Object.fromEntries((prog || []).map((p) => [p.domain_id, p]));

  const { data: invites } = await supabase.rpc("my_invitations");

  const numero = String(member.member_number).padStart(3, "0");
  const since = new Date(member.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const today = new Date().toISOString().slice(0, 10);

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
        {member.email && <p className="muted">{member.email}</p>}
      </section>

      <section className="section stack">
        <h2>Mes commandes</h2>
        {justReserved && <p className="success">Vos réservations sont enregistrées.</p>}
        {groups.length === 0 && (
          <div className="card stack">
            <p className="muted">
              Vous n&apos;avez pas encore de réservation. Choisissez vos bouteilles dans la Sélection.
            </p>
            <Link href="/club/selection" className="btn btn-ghost">
              Parcourir la Sélection
            </Link>
          </div>
        )}
        {groups.map((g) => {
          const d = g.domain;
          const p = progress[d.id] || { reserved_bottles: 0, participants: 0 };
          const editable =
            ["ouvert", "bientot_atteint"].includes(d.status) && (!d.deadline || d.deadline >= today);
          return (
            <div className="card stack" key={d.id}>
              <div className="row">
                <h3>{d.name}</h3>
                <span className="badge">{ETAT[d.status] || d.status}</span>
              </div>
              {g.lines.map((r) => (
                <div className="row" key={r.id}>
                  <p className="muted">
                    {r.quantity} × {r.cuvees.name}
                    {r.cuvees.vintage ? ` ${r.cuvees.vintage}` : ""}
                  </p>
                  <p className="muted">{euros(r.quantity * Number(r.unit_price))}</p>
                </div>
              ))}
              <div className="row">
                <p>
                  {g.bottles} bouteille{g.bottles > 1 ? "s" : ""}
                </p>
                <p className="price">{euros(g.total)}</p>
              </div>
              {d.threshold ? (
                <Gauge reserved={p.reserved_bottles} threshold={d.threshold} participants={p.participants} />
              ) : null}
              {editable && (
                <div className="row" style={{ alignItems: "center" }}>
                  <Link href={`/club/domaine/${d.slug}`}>Modifier</Link>
                  <CancelDomainButton cuveeIds={g.lines.map((r) => r.cuvees.id)} domainName={d.name} />
                </div>
              )}
            </div>
          );
        })}
        {groups.length > 0 && (
          <p className="muted">
            Aucun débit tant que le seuil d&apos;un domaine n&apos;est pas atteint. L&apos;enregistrement de votre carte
            bancaire arrive très prochainement.
          </p>
        )}
      </section>

      <section className="section stack">
        <h2>Mes invitations</h2>
        <InviteFriend invitesLeft={member.invites_left} isAdmin={member.is_admin} firstName={member.first_name} />
        {(invites || []).length > 0 && (
          <div className="card stack">
            {(invites || []).map((i) => {
              const expired = !i.used && new Date(i.expires_at) < new Date();
              return (
                <div className="row" key={i.code}>
                  <div>
                    <p>{i.code}</p>
                    {i.invited_email && <p className="muted">{i.invited_email}</p>}
                  </div>
                  <span className={`badge ${i.used ? "badge-ouvert" : ""}`}>
                    {i.used ? `Inscrit·e : ${i.used_by_name || "oui"}` : expired ? "Expirée" : "En attente"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {member.is_admin && (
        <section className="section">
          <Link href="/admin" className="btn btn-ghost">
            Espace administrateur
          </Link>
        </section>
      )}

      <section className="section">
        <form action="/deconnexion" method="post">
          <button className="btn btn-ghost">Se déconnecter</button>
        </form>
      </section>
    </main>
  );
}
