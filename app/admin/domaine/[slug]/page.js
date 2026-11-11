import Link from "next/link";
import { notFound } from "next/navigation";
import Gauge from "@/components/Gauge";
import { requireAdmin, ACTIVE_RESERVATION } from "@/lib/data";
import { euros } from "@/lib/catalogue";
import "@/app/ergonomie.css";
import { updateDomain, updateDomaineInfos } from "@/app/admin/actions";
import { avancerSuivi, marquerPaye, fixerLivraison, debiterCartes } from "./suivi-actions";

// État du paiement Stripe de chaque membre
const PAIEMENT = {
  payee: "Payé par carte",
  en_cours: "Débit en cours",
  action_requise: "Validation bancaire demandée au membre",
  refusee: "Refusé, membre prévenu",
  sans_carte: "Pas de carte, membre prévenu",
};

function bilanDebit(v) {
  const [payee, valider, refus, sansCarte, enCours] = String(v || "").split("-").map((n) => Number(n) || 0);
  const parts = [
    payee && `${payee} payé${payee > 1 ? "s" : ""}`,
    valider && `${valider} à valider par le membre`,
    refus && `${refus} refusé${refus > 1 ? "s" : ""}`,
    sansCarte && `${sansCarte} sans carte`,
    enCours && `${enCours} en cours`,
  ].filter(Boolean);
  return parts.length ? `Débit lancé : ${parts.join(", ")}.` : "Aucun membre à débiter.";
}

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
  livre: { vers: "ouvert", label: "Rouvrir pour une nouvelle commande" },
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

function leJour(v) {
  if (!v) return null;
  const d = typeof v === "string" && v.length === 10 ? new Date(`${v}T12:00:00Z`) : new Date(v);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" });
}

export default async function AdminDomaine({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const { supabase } = await requireAdmin();

  const { data: domain } = await supabase
    .from("domains")
    .select(
      "id, slug, name, region, appellation, tagline, threshold, deadline, status, pack_size, triggered_at, shipped_at, delivered_at, expected_delivery"
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!domain) notFound();
  const { data: lesRegions } = await supabase.from("domains").select("region");
  const regions = [...new Set((lesRegions || []).map((r) => r.region).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));

  const [{ data: resa }, { data: progress }, { count: abonnes }, { data: paiements }, { data: cartes }] = await Promise.all([
    supabase
      .from("reservations")
      .select(
        "id, member_id, quantity, unit_price, status, created_at, members(member_number, first_name, last_name, email, phone), cuvees!inner(id, name, vintage, domain_id)"
      )
      .eq("cuvees.domain_id", domain.id)
      .in("status", ACTIVE_RESERVATION)
      .eq("archived", false)
      .order("created_at"),
    supabase.from("domain_progress").select("reserved_bottles, participants").eq("domain_id", domain.id).maybeSingle(),
    supabase.from("domain_follows").select("member_id", { count: "exact", head: true }).eq("domain_id", domain.id),
    supabase.from("payments").select("member_id, status").eq("domain_id", domain.id),
    supabase.from("member_cards").select("member_id, last4, payment_method"),
  ]);
  const paiementDe = Object.fromEntries((paiements || []).map((p) => [p.member_id, p.status]));
  const carteDe = Object.fromEntries((cartes || []).filter((c) => c.payment_method).map((c) => [c.member_id, c.last4]));

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
  const aDebiter = membres.filter((m) => !m.paid).length;
  const suivant = SUIVANT[domain.status];
  const apresDeclenchement = ["declenche", "expedie", "livre"].includes(domain.status);
  const avantLivraison = ["declenche", "expedie"].includes(domain.status);
  const jalons = [
    ["Déclenchée le", leJour(domain.triggered_at)],
    ["Expédiée le", leJour(domain.shipped_at)],
    ["Livrée le", leJour(domain.delivered_at)],
  ].filter(([, v]) => v);

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
      <p style={{ marginTop: 8 }}>
        <Link href={`/admin/domaine/${slug}/cuvees`} className="link-btn">
          Cuvées : prix, vente et fiches →
        </Link>
      </p>
      {sp?.infos && (
        <p className={sp.infos === "1" ? "success" : "error"} role={sp.infos === "1" ? "status" : "alert"}>
          {sp.infos === "1"
            ? "Nom et présentation enregistrés."
            : "L’enregistrement a échoué : le nom et la région sont obligatoires."}
        </p>
      )}
      <details className="card fiche-edit" style={{ marginTop: 12 }} open={Boolean(sp?.infos && sp.infos !== "1")}>
        <summary>
          <span className="fiche-nom">Modifier le nom et la présentation</span>
          <span className="muted fiche-meta">Nom, région, appellation, accroche sous le nom</span>
        </summary>
        <form action={updateDomaineInfos} className="stack fiche-form">
          <input type="hidden" name="id" value={domain.id} />
          <input type="hidden" name="slug" value={slug} />
          <label>
            Nom du domaine
            <input name="name" required maxLength={120} defaultValue={domain.name} />
          </label>
          <div className="fiche-row">
            <label>
              Région
              <input name="region" required maxLength={60} list="regions-club" defaultValue={domain.region || ""} />
            </label>
            <label>
              Appellation
              <input name="appellation" maxLength={120} defaultValue={domain.appellation || ""} />
            </label>
          </div>
          <datalist id="regions-club">
            {regions.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
          <label>
            Accroche (phrase affichée sous le nom)
            <textarea name="tagline" rows={2} maxLength={300} defaultValue={domain.tagline || ""} />
          </label>
          <p className="muted fiche-note">
            Choisissez la région dans la liste pour que le domaine reste regroupé avec les autres dans la Sélection.
            L’adresse de la fiche (/club/domaine/{slug}) ne change pas : les liens déjà partagés continuent de fonctionner.
          </p>
          <button className="btn" type="submit">
            Enregistrer
          </button>
        </form>
      </details>
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
        {sp?.livraison === "1" && (
          <p className="success">
            Date de livraison enregistrée
            {Number(sp.envoye) > 0 ? ` — notification envoyée à ${sp.envoye} appareil${Number(sp.envoye) > 1 ? "s" : ""}` : ""}.
          </p>
        )}
        {sp?.livraison === "0" && <p className="success">Date de livraison retirée.</p>}
        {sp?.paye === "1" && <p className="success">Paiement enregistré, le membre est prévenu.</p>}
        {sp?.paye === "0" && <p className="success">Paiement retiré.</p>}
        {sp?.debit && <p className="success">{bilanDebit(sp.debit)}</p>}
        {sp?.erreurDebit && (
          <p className="error">
            {sp.erreurDebit === "cles"
              ? "Le paiement n'est pas encore configuré : clés Stripe ou Supabase manquantes dans Vercel."
              : sp.erreurDebit === "statut"
                ? "La commande doit d'abord être déclenchée."
                : "Le débit n'a pas abouti. Rechargez la page et réessayez."}
          </p>
        )}
        {sp?.erreurSuivi && <p className="error">L&apos;opération n&apos;a pas abouti. Rechargez la page et réessayez.</p>}

        <div className="card stack">
          <div className="row">
            <p>Étape actuelle</p>
            <span className="badge">{ETAPE_ACTUELLE[domain.status] || domain.status}</span>
          </div>
          {jalons.length > 0 && (
            <p className="muted">{jalons.map(([label, v]) => `${label} ${v}`).join(" · ")}</p>
          )}
          {suivant ? (
            <form action={avancerSuivi} className="stack">
              <input type="hidden" name="id" value={domain.id} />
              <input type="hidden" name="slug" value={domain.slug} />
              <input type="hidden" name="vers" value={suivant.vers} />
              {domain.status === "livre" && (
                <p className="muted">
                  La commande livrée sera archivée : les membres gardent leur historique et peuvent toujours laisser un avis. Le sceau repart à zéro et l’ancienne date limite est effacée, pensez à en fixer une nouvelle.
                </p>
              )}
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

        {avantLivraison && (
          <form action={fixerLivraison} className="card stack">
            <input type="hidden" name="id" value={domain.id} />
            <input type="hidden" name="slug" value={domain.slug} />
            <div>
              <label htmlFor="expected_delivery">Livraison prévue</label>
              <input
                id="expected_delivery"
                name="expected_delivery"
                type="date"
                defaultValue={domain.expected_delivery ?? ""}
              />
            </div>
            <label className="check">
              <input type="checkbox" name="notifier" value="1" defaultChecked /> Prévenir les réservataires par notification
            </label>
            <button className="btn btn-ghost">Enregistrer la date</button>
            <p className="muted">
              Les membres voient cette date sous la frise de leur commande. Laissez vide si elle n&apos;est pas encore connue.
            </p>
          </form>
        )}

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
                  <p className="muted">
                    {PAIEMENT[paiementDe[m.id]] || (carteDe[m.id] ? `Carte •••• ${carteDe[m.id]}` : "Pas de carte enregistrée")}
                  </p>
                </div>
                <button className={m.paid ? "btn btn-ghost" : "btn"} style={{ width: "auto", padding: "8px 16px" }}>
                  {m.paid ? "Payé ✓" : "Marquer payé"}
                </button>
              </form>
            ))}
            <p className="muted">
              Le membre reçoit une notification quand son paiement est marqué. Toucher « Payé ✓ » annule le marquage.
              Utilisez « Marquer payé » seulement pour un règlement hors carte.
            </p>
            {aDebiter > 0 && (
              <form action={debiterCartes} className="stack">
                <input type="hidden" name="id" value={domain.id} />
                <input type="hidden" name="slug" value={domain.slug} />
                <label className="check">
                  <input type="checkbox" required /> Je confirme le débit de {aDebiter} membre{aDebiter > 1 ? "s" : ""}
                </label>
                <button className="btn">Débiter les cartes</button>
                <p className="muted">
                  Chaque membre pas encore payé est débité du montant exact de ses bouteilles. Ceux dont la banque demande
                  une validation, ou sans carte, sont prévenus et règlent depuis leur espace.
                </p>
              </form>
            )}
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
