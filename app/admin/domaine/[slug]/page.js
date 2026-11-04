import Link from "next/link";
import { notFound } from "next/navigation";
import Gauge from "@/components/Gauge";
import { requireAdmin, ACTIVE_RESERVATION } from "@/lib/data";
import { euros } from "@/lib/catalogue";
import { updateDomain } from "@/app/admin/actions";
import { avancerSuivi, marquerPaye } from "./suivi-actions";

const STATUS_LABELS = {
  a_venir: "À venir",
  ouvert: "Ouvert",
  bientot_atteint: "Bientôt atteint",
  declenche: "Déclenché (réservations figées)",
  expedie: "Expédié",
  livre: "Livré",
  expire: "Expiré",
};

// Suivi de commande : étape suivante et libellé du bouton
const SUIVANT = {
  a_venir: { vers: "ouvert", label: "Ouvrir les réservations" },
  ouvert: { vers: "declenche", label: "Déclencher la commande" },
  bientot_atteint: { vers: "declenche", label: "Déclencher la commande" },
  declenche: { vers: "expedie", label: "Marquer comme expédiée" },
  expedie: { vers: "livre", label: "Marquer comme livrée" },
};
const ETAPE_ACTUELLE = {
  a_venir: "À venir",
  ouvert: "Réservations ouvertes",
  bientot_atteint: "Réservations ouvertes",
  declenche: "Déclenchée",
  expedie: "Expédiée",
  livre: "Livrée",
  expire: "Expirée",
};
const SUIVI_OK = {
  ouvert: "Réservations ouvertes",
  declenche: "Commande déclenchée",
  expedie: "Commande marquée comme expédiée",
  livre: "Commande marquée comme livrée",
};

export default async function AdminDomaine({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const { supabase } = await requireAdmin();

  const { data: domain } = await supabase
    .from("domains")
    .select("id, slug, name, region, appellation, threshold, deadline, status, pack_size")
    .eq("slug", slug)
    .maybeSingle();
  if (!domain) notFound();

  const [{ data: resa }, { data: progress }, { count: abonnes }] = await Promise.all([
    supabase
      .from("reservations")
      .select(
        "id, member_id, quantity, unit_price, status, created_at, members(member_number, first_name, last_name, email, phone), cuvees!inner(id, name, vintage, domain_id)"
      )
      .eq("cuvees.domain_id", domain.id)
      .in("status", ACTIVE_RESERVATION)
      .order("created_at"),
    supabase.from("domain_progress").select("reserved_bottles, participants").eq("domain_id", domain.id).maybeSingle(),
    supabase.from("domain_follows").select("member_id", { count: "exact", head: true }).eq("domain_id", domain.id),
  ]);

  const lines = resa || [];
  const byCuvee = {};
  for (const r of lines) {
    const k = r.cuvees.id;
    const c = (byCuvee[k] ||= { name: r.cuvees.name, vintage: r.cuvees.vintage, qty: 0, amount: 0 });
    c.qty += r.quantity;
    c.amount += r.quantity * Number(r.unit_price);
  }
  const cuvees = Object.values(byCuvee).sort((a, b) => b.qty - a.qty);
  const total = cuvees.reduce((s, c) => s + c.amount, 0);
  const bottles = cuvees.reduce((s, c) => s + c.qty, 0);

  // Paiements : un total par membre
  const byMember = {};
  for (const r of lines) {
    const m = (byMember[r.member_id] ||= {
      id: r.member_id,
      name: `${r.members?.first_name || ""} ${r.members?.last_name || ""}`.trim(),
      number: r.members?.member_number,
      bottles: 0,
      total: 0,
      paid: true,
    });
    m.bottles += r.quantity;
    m.total += r.quantity * Number(r.unit_price);
    if (r.status !== "payee") m.paid = false;
  }
  const membres = Object.values(byMember);
  const payes = membres.filter((m) => m.paid).length;
  const suivant = SUIVANT[domain.status];
  const apresDeclenchement = ["declenche", "expedie", "livre"].includes(domain.status);

  return (
    <main className="shell">
      <p className="muted" style={{ marginTop: 16 }}>
        <Link href="/admin">← Tableau de bord</Link>
      </p>
      <h1 style={{ fontSize: 30, marginTop: 16 }}>{domain.name}</h1>
      <p className="lead">
        {domain.region}
        {domain.appellation ? ` · ${domain.appellation}` : ""}
      </p>
      <div className="ornament" />

      <section className="card stack">
        <Gauge reserved={progress?.reserved_bottles || 0} threshold={domain.threshold} participants={progress?.participants || 0} />
        <div className="row">
          <p>
            {bottles} bouteille{bottles > 1 ? "s" : ""}
          </p>
          <p className="price">{euros(total)}</p>
        </div>
        <p className="muted">
          {abonnes || 0} membre{abonnes > 1 ? "s" : ""} suit{abonnes > 1 ? "vent" : ""} ce domaine ·{" "}
          <Link href={`/club/domaine/${domain.slug}`}>Voir la fiche membre</Link>
        </p>
      </section>

      <section className="section stack">
        <h2>Suivi de commande</h2>
        {sp?.suivi && (
          <p className="success">
            {SUIVI_OK[sp.suivi] || "Étape enregistrée"}
            {Number(sp.envoye) > 0 ? ` — notification envoyée à ${sp.envoye} appareil${Number(sp.envoye) > 1 ? "s" : ""}` : ""}.
          </p>
        )}
        {sp?.paye === "1" && <p className="success">Paiement enregistré, le membre est prévenu.</p>}
        {sp?.paye === "0" && <p className="success">Paiement retiré.</p>}
        {sp?.erreurSuivi && <p className="error">L&apos;opération n&apos;a pas abouti. Rechargez la page et réessayez.</p>}

        <div className="card stack">
          <div className="row">
            <p>Étape actuelle</p>
            <span className="badge">{ETAPE_ACTUELLE[domain.status] || domain.status}</span>
          </div>
          {suivant ? (
            <form action={avancerSuivi} className="stack">
              <input type="hidden" name="id" value={domain.id} />
              <input type="hidden" name="slug" value={domain.slug} />
              <input type="hidden" name="vers" value={suivant.vers} />
              <label className="check">
                <input type="checkbox" name="notifier" value="1" defaultChecked />{" "}
                {suivant.vers === "ouvert"
                  ? `Prévenir les membres qui suivent ce domaine (${abonnes || 0})`
                  : "Prévenir les réservataires par notification"}
              </label>
              <label className="check">
                <input type="checkbox" required /> Je confirme
              </label>
              <button className="btn">{suivant.label}</button>
            </form>
          ) : (
            <p className="muted">
              {domain.status === "livre" ? "Commande terminée." : "Aucune étape suivante pour ce statut."}
            </p>
          )}
        </div>

        {apresDeclenchement && membres.length > 0 && (
          <div className="card stack">
            <div className="row">
              <p>Paiements</p>
              <span className="badge">
                {payes} / {membres.length}
              </span>
            </div>
            {membres.map((m) => (
              <form action={marquerPaye} className="row" key={m.id} style={{ alignItems: "center" }}>
                <input type="hidden" name="domain_id" value={domain.id} />
                <input type="hidden" name="slug" value={domain.slug} />
                <input type="hidden" name="member_id" value={m.id} />
                <input type="hidden" name="paye" value={m.paid ? "0" : "1"} />
                <div>
                  <p>{m.name || "Membre"}</p>
                  <p className="muted">
                    n° {m.number} · {euros(m.total)}
                  </p>
                </div>
                <button className={m.paid ? "btn btn-ghost" : "btn"} style={{ width: "auto", padding: "8px 16px" }}>
                  {m.paid ? "Payé ✓" : "Marquer payé"}
                </button>
              </form>
            ))}
            <p className="muted">
              Le membre reçoit une notification quand son paiement est marqué. Toucher « Payé ✓ » annule le marquage.
            </p>
          </div>
        )}
      </section>

      <section className="section stack">
        <h2>Réglages</h2>
        {sp?.ok && <p className="success">Modifications enregistrées.</p>}
        {sp?.erreur && <p className="error">L&apos;enregistrement a échoué. Vérifiez les valeurs.</p>}
        <form action={updateDomain} className="card stack">
          <input type="hidden" name="id" value={domain.id} />
          <input type="hidden" name="slug" value={domain.slug} />
          <div>
            <label htmlFor="status">Statut</label>
            <select id="status" name="status" className="select" defaultValue={domain.status}>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div className="grid-2">
            <div>
              <label htmlFor="threshold">Seuil (bouteilles)</label>
              <input id="threshold" name="threshold" type="number" min="1" inputMode="numeric" defaultValue={domain.threshold ?? ""} />
            </div>
            <div>
              <label htmlFor="deadline">Date limite</label>
              <input id="deadline" name="deadline" type="date" defaultValue={domain.deadline ?? ""} />
            </div>
          </div>
          <button className="btn">Enregistrer</button>
          <p className="muted">
            Changer le statut ici ne prévient personne. Pour faire avancer une commande en prévenant les membres,
            utilisez le Suivi de commande.
          </p>
        </form>
      </section>

      <section className="section stack">
        <div className="row">
          <h2>Par cuvée</h2>
          {lines.length > 0 && <a href={`/admin/domaine/${domain.slug}/export?vue=cuvees`}>Export CSV</a>}
        </div>
        {cuvees.length === 0 ? (
          <p className="muted">Aucune réservation.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Cuvée</th>
                  <th>Bouteilles</th>
                  <th>Montant</th>
                </tr>
              </thead>
              <tbody>
                {cuvees.map((c) => (
                  <tr key={`${c.name}-${c.vintage}`}>
                    <td>
                      {c.name} <span className="muted">{c.vintage || ""}</span>
                    </td>
                    <td>{c.qty}</td>
                    <td className="nowrap">{euros(c.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="section stack">
        <div className="row">
          <h2>Par membre</h2>
          {lines.length > 0 && <a href={`/admin/domaine/${domain.slug}/export`}>Export CSV</a>}
        </div>
        {lines.length === 0 ? (
          <p className="muted">Aucune réservation.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Membre</th>
                  <th>Cuvée</th>
                  <th>Qté</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.members?.first_name} {r.members?.last_name}
                      <div className="muted">n° {r.members?.member_number}</div>
                    </td>
                    <td>
                      {r.cuvees.name} <span className="muted">{r.cuvees.vintage || ""}</span>
                    </td>
                    <td>{r.quantity}</td>
                    <td className="nowrap">{euros(r.quantity * Number(r.unit_price))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
