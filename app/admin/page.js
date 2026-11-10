import Link from "next/link";
import "@/app/ergonomie.css";
import AdminAFaire from "@/components/AdminAFaire";
import { requireAdmin, loadSelection, ACTIVE_RESERVATION } from "@/lib/data";
import { displayStatus, euros, percent } from "@/lib/catalogue";

export default async function AdminHome() {
  const { supabase } = await requireAdmin();
  const [domains, { data: resa }, { count: members }] = await Promise.all([
    loadSelection(supabase),
    supabase.from("reservations").select("quantity, unit_price").in("status", ACTIVE_RESERVATION),
    supabase.from("members").select("id", { count: "exact", head: true }),
  ]);

  const bottles = (resa || []).reduce((s, r) => s + r.quantity, 0);
  const amount = (resa || []).reduce((s, r) => s + r.quantity * Number(r.unit_price), 0);
  const rows = domains
    .map((d) => ({ ...d, st: displayStatus(d, d.reserved), pct: percent(d.reserved, d.threshold) }))
    .sort((a, b) => b.reserved - a.reserved || b.pct - a.pct || a.name.localeCompare(b.name));
  const active = rows.filter((d) => d.reserved > 0);
  const others = rows.filter((d) => d.reserved === 0);

  return (
    <main className="shell">
      <h1 style={{ fontSize: 30, marginTop: 24 }}>Tableau de bord</h1>
      <div className="ornament" />

      <AdminAFaire />

      <section className="kpis">
        <div className="card">
          <p className="num-big">{members ?? 0}</p>
          <p className="muted">membres</p>
        </div>
        <div className="card">
          <p className="num-big">{bottles}</p>
          <p className="muted">bouteilles réservées</p>
        </div>
        <div className="card">
          <p className="num-big">{euros(amount)}</p>
          <p className="muted">réservations en cours</p>
        </div>
      </section>

      <section className="section stack">
        <h2>Commandes en cours</h2>
        {active.length === 0 && <p className="muted">Aucune réservation pour l&apos;instant.</p>}
        <DomainTable rows={active} />
      </section>

      <section className="section stack">
        <details>
          <summary className="summary">Tous les autres domaines ({others.length})</summary>
          <div style={{ marginTop: 14 }}>
            <DomainTable rows={others} />
          </div>
        </details>
      </section>
    </main>
  );
}

function DomainTable({ rows }) {
  if (rows.length === 0) return null;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Domaine</th>
            <th>Avancement</th>
            <th>Membres</th>
            <th>Statut</th>
            <th>Limite</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.id}>
              <td>
                <Link href={`/admin/domaine/${d.slug}`}>{d.name}</Link>
                <div className="muted">{d.region}</div>
              </td>
              <td className="nowrap">
                {d.reserved} / {d.threshold ?? "?"}
                {d.threshold ? <span className="muted"> · {d.pct} %</span> : null}
              </td>
              <td>{d.participants}</td>
              <td>
                <span className={`badge badge-${d.st.key}`}>{d.st.label}</span>
              </td>
              <td className="nowrap muted">
                {d.deadline ? new Date(d.deadline).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
