import Link from "next/link";
import ClubHeader from "@/components/ClubHeader";
import Gauge from "@/components/Gauge";
import CancelDomainButton from "@/components/CancelDomainButton";
import InviteFriend from "@/components/InviteFriend";
import NotificationToggle from "@/components/NotificationToggle";
import OrderTimeline from "@/components/OrderTimeline";
import { requireMember } from "@/lib/data";
import { euros } from "@/lib/catalogue";

export const dynamic = "force-dynamic";

const STATUT_SUIVI = {
  a_venir: "Bientôt",
  ouvert: "Ouvert",
  bientot_atteint: "Ouvert",
  declenche: "Déclenché",
  expedie: "Expédié",
  livre: "Livré",
  expire: "Clos",
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

  const [{ data: invites }, { data: suivis }] = await Promise.all([
    supabase.rpc("my_invitations"),
    supabase
      .from("domain_follows")
      .select("created_at, domains(id, name, slug, status)")
      .eq("member_id", member.id)
      .order("created_at", { ascending: false }),
  ]);
  const domainesSuivis = (suivis || []).map((f) => f.domains).filter(Boolean);

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
          const paid = g.lines.every((r) => r.status === "payee");
          const enAttente = ["ouvert", "bientot_atteint", "a_venir"].includes(d.status);
          return (
            <div className="card stack" key={d.id}>
              <div className="row">
                <h3>{d.name}</h3>
                {d.status === "expire" && <span className="badge">Close</span>}
              </div>
              {d.status !== "expire" && <OrderTimeline status={d.status} paid={paid} />}
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
              {enAttente && d.threshold ? (
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
        <h2>Domaines suivis</h2>
        {domainesSuivis.length === 0 ? (
          <div className="card stack">
            <p className="muted">
              Touchez « Suivre ce domaine » sur la fiche d&apos;un domaine pour être prévenu de sa prochaine commande.
            </p>
          </div>
        ) : (
          <div className="card stack">
            {domainesSuivis.map((d) => (
              <div className="row" key={d.id}>
                <Link href={`/club/domaine/${d.slug}`}>★ {d.name}</Link>
                <span className="muted">{STATUT_SUIVI[d.status] || ""}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="section stack">
        <h2>Notifications</h2>
        <NotificationToggle />
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
