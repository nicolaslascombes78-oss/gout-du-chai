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
    .select(
      "id, quantity, unit_price, status, created_at, paid_at, cuvees(id, name, vintage, domains(id, name, slug, status, threshold, deadline, triggered_at, shipped_at, delivered_at, expected_delivery))"
    )
    .eq("member_id", member.id)
    .in("status", ["en_attente", "confirmee", "payee"])
    .order("created_at");

  // Regroupe les bouteilles par domaine.
  const byDomain = {};
  for (const r of resa || []) {
    const d = r.cuvees?.domains;
    if (!d) continue;
    const g = (byDomain[d.id] ||= { domain: d, lines: [], bottles: 0, total: 0, reservedAt: null, paidAt: null });
    g.lines.push(r);
    g.bottles += r.quantity;
    g.total += r.quantity * Number(r.unit_price);
    // Date de réservation : la première bouteille réservée ; date de paiement : le dernier paiement
    if (r.created_at && (!g.reservedAt || r.created_at < g.reservedAt)) g.reservedAt = r.created_at;
    if (r.paid_at && (!g.paidAt || r.paid_at > g.paidAt)) g.paidAt = r.paid_at;
  }
  const groups = Object.values(byDomain);

  const ids = groups.map((g) => g.domain.id);
  const { data: prog } = ids.length
    ? await supabase.from("domain_progress").select("domain_id, reserved_bottles, participants").in("domain_id", ids)
    : { data: [] };
  const progress = Object.fromEntries((prog || []).map((p) => [p.domain_id, p]));

  const [{ data: invites }, { data: suivis }, { data: carte }, { data: aRegler }] = await Promise.all([
    supabase.rpc("my_invitations"),
    supabase
      .from("domain_follows")
      .select("created_at, domains(id, name, slug, status)")
      .eq("member_id", member.id)
      .order("created_at", { ascending: false }),
    supabase.from("member_cards").select("brand, last4, payment_method").eq("member_id", member.id).maybeSingle(),
    supabase
      .from("payments")
      .select("id")
      .eq("member_id", member.id)
      .in("status", ["action_requise", "refusee", "sans_carte"]),
  ]);
  const aUneCarte = Boolean(carte?.payment_method);
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
      </section>

      {(aRegler || []).length > 0 && (
        <Link href="/club/membre/carte" className="card stack" style={{ display: "block", borderColor: "var(--gold)" }}>
          <p className="reserve-ok-t">Un paiement est à régler</p>
          <p className="muted">Une commande est lancée mais son paiement n&apos;a pas abouti. Touchez pour la régler.</p>
        </Link>
      )}

      <section className="section stack">
        <h2>Mes commandes</h2>
        {justReserved && (
          <div className="card stack reserve-ok" role="status">
            <p className="reserve-ok-t">C&apos;est réservé !</p>
            <p className="muted">
              Vous ne serez débité que si la commande est lancée. Vous pouvez modifier ou annuler vos bouteilles
              jusque-là. Un ami amateur peut aider à compléter la commande : invitez-le plus bas.
            </p>
          </div>
        )}
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
              {d.status !== "expire" && (
                <OrderTimeline
                  status={d.status}
                  paid={paid}
                  prevue={d.expected_delivery}
                  dates={{
                    reservee: g.reservedAt,
                    declenchee: d.triggered_at,
                    payee: g.paidAt,
                    expediee: d.shipped_at,
                    livree: d.delivered_at,
                  }}
                />
              )}
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
                <Gauge
                  reserved={p.reserved_bottles}
                  threshold={d.threshold}
                  participants={p.participants}
                  deadline={d.deadline}
                  showDeadline
                  mine={g.bottles}
                  size={64}
                />
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
          <p className="muted">Aucun débit tant que le seuil d&apos;un domaine n&apos;est pas atteint.</p>
        )}
      </section>

      <section className="section stack" id="paiement">
        <h2>Paiement</h2>
        <Link href="/club/membre/carte" className="card row" style={{ color: "var(--ivory)", alignItems: "center" }}>
          <span>{aUneCarte ? `Carte •••• ${carte.last4}` : "Enregistrer ma carte"}</span>
          <span className="muted">{aUneCarte ? "Gérer" : "Nécessaire pour commander"} ›</span>
        </Link>
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

      <section className="section stack" id="notifications">
        <h2>Notifications</h2>
        <NotificationToggle />
      </section>

      <section className="section stack" id="invitations">
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
                    {i.invited_email && <p className="muted">{masquer(i.invited_email)}</p>}
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

      <section className="section stack">
        <h2>Aide et règles</h2>
        <nav className="card help-links" aria-label="Aide et règles">
          <Link href="/regles">Les règles du club</Link>
          <Link href="/mentions-legales">Mentions légales</Link>
          <Link href="/confidentialite">Confidentialité</Link>
        </nav>
      </section>

      {member.is_admin && (
        <section className="section">
          <Link href="/admin" className="btn btn-ghost">
            Espace administrateur
          </Link>
        </section>
      )}

      <section className="section">
        {member.email && (
          <p className="muted" style={{ textAlign: "center", marginBottom: 10 }}>
            Connecté avec {member.email}
          </p>
        )}
        <form action="/deconnexion" method="post">
          <button className="btn btn-ghost">Se déconnecter</button>
        </form>
      </section>
    </main>
  );
}

// Adresse d'un invité affichée en partie : « philippe.martin@gmail.com » devient « phi…@gmail.com ».
function masquer(email) {
  const [nom, domaine] = String(email).split("@");
  if (!domaine) return "…";
  return `${nom.slice(0, 3)}…@${domaine}`;
}
