import Link from "next/link";
import { notFound } from "next/navigation";
import "@/app/ergonomie.css";
import { requireAdmin } from "@/lib/data";
import { euros } from "@/lib/catalogue";
import ConfirmSubmit from "@/components/ConfirmSubmit";
import { cancelReservations } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

const ETAT_RESA = { en_attente: "En attente", confirmee: "Confirmée", payee: "Payée", annulee: "Annulée" };
const ETAT_DOMAINE = {
  a_venir: "À venir",
  ouvert: "Ouvert",
  bientot_atteint: "Seuil atteint",
  declenche: "Commande lancée",
  expedie: "Expédiée",
  livre: "Livrée",
  expire: "Expirée",
};
const ACTIVES = ["en_attente", "confirmee", "payee"];
const ANNULABLES = ["en_attente", "confirmee"];

const dateCourte = (iso) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short" }) : "";

// Admin : tout ce qu'un membre a réservé, regroupé par domaine.
export default async function DetailMembre({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireAdmin();

  const { data: m } = await supabase
    .from("members")
    .select("id, member_number, first_name, last_name, email, phone, address, postal_code, city, sponsor_id, invites_left, is_admin, status, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!m) notFound();

  const [{ data: resas }, { data: parrain }, { data: filleuls }] = await Promise.all([
    supabase
      .from("reservations")
      .select("id, cuvee_id, quantity, unit_price, status, created_at, paid_at")
      .eq("member_id", id)
      .order("created_at", { ascending: false }),
    m.sponsor_id
      ? supabase.from("members").select("id, first_name, last_name").eq("id", m.sponsor_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("members").select("id, first_name, last_name").eq("sponsor_id", id).order("member_number"),
  ]);

  const liste = resas || [];
  const cuveeIds = [...new Set(liste.map((r) => r.cuvee_id))];
  const { data: cuvees } = cuveeIds.length
    ? await supabase.from("cuvees").select("id, name, vintage, domain_id").in("id", cuveeIds)
    : { data: [] };
  const parCuvee = Object.fromEntries((cuvees || []).map((c) => [c.id, c]));
  const domaineIds = [...new Set((cuvees || []).map((c) => c.domain_id))];
  const { data: domaines } = domaineIds.length
    ? await supabase.from("domains").select("id, slug, name, region, status, threshold, deadline").in("id", domaineIds)
    : { data: [] };
  const parDomaine = Object.fromEntries((domaines || []).map((d) => [d.id, d]));

  // Regroupement par domaine (réservations actives), annulées à part
  const groupes = {};
  const annulees = [];
  for (const r of liste) {
    const c = parCuvee[r.cuvee_id];
    const d = c && parDomaine[c.domain_id];
    const ligne = { ...r, cuvee: c, total: (r.quantity || 0) * Number(r.unit_price || 0) };
    if (!ACTIVES.includes(r.status)) {
      annulees.push({ ...ligne, domaine: d });
      continue;
    }
    const cle = d?.id || "inconnu";
    const g = (groupes[cle] ||= { d, lignes: [], bouteilles: 0, montant: 0 });
    g.lignes.push(ligne);
    g.bouteilles += r.quantity || 0;
    g.montant += ligne.total;
  }
  const commandes = Object.values(groupes).sort((a, b) => b.montant - a.montant);
  const totalBouteilles = commandes.reduce((s, g) => s + g.bouteilles, 0);
  const totalMontant = commandes.reduce((s, g) => s + g.montant, 0);

  const nom = `${m.first_name} ${m.last_name}`;
  const adresse = [m.address, [m.postal_code, m.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  return (
    <main className="shell mdet">
      <Link href="/admin/membres" className="muted">
        ← Membres
      </Link>
      <h1 style={{ fontSize: 30, marginTop: 16 }}>{nom}</h1>
      <p className="muted">
        n° {String(m.member_number).padStart(3, "0")} · membre depuis le {new Date(m.created_at).toLocaleDateString("fr-FR")}
        {m.is_admin ? " · administrateur" : ""}
        {m.status && m.status !== "actif" ? ` · ${m.status}` : ""}
      </p>
      {sp?.annule && (
        <p className="success" role="status">
          {Number(sp.annule) > 0
            ? `${sp.annule} réservation${Number(sp.annule) > 1 ? "s" : ""} annulée${Number(sp.annule) > 1 ? "s" : ""}.`
            : "Rien à annuler : ces lignes étaient déjà payées ou annulées."}
        </p>
      )}
      {sp?.erreur && (
        <p className="error" role="alert">
          L&apos;annulation a échoué. Réessayez.
        </p>
      )}

      <section className="card stack mdet-infos">
        <p>
          <a href={`mailto:${m.email}`}>{m.email}</a>
          {m.phone ? (
            <>
              {" · "}
              <a href={`tel:${m.phone.replace(/\s/g, "")}`}>{m.phone}</a>
            </>
          ) : null}
        </p>
        {adresse && <p className="muted">{adresse}</p>}
        <p className="muted">
          {parrain ? `Invité par ${parrain.first_name} ${parrain.last_name}` : "Membre fondateur"}
          {(filleuls || []).length > 0 &&
            ` · a invité ${(filleuls || []).map((f) => `${f.first_name} ${f.last_name}`).join(", ")}`}
        </p>
      </section>

      <div className="mdet-chiffres">
        <div>
          <strong>{totalBouteilles}</strong>
          <span>bouteille{totalBouteilles > 1 ? "s" : ""} en cours</span>
        </div>
        <div>
          <strong>{euros(totalMontant)}</strong>
          <span>montant total</span>
        </div>
        <div>
          <strong>{commandes.length}</strong>
          <span>commande{commandes.length > 1 ? "s" : ""}</span>
        </div>
      </div>

      {commandes.length === 0 ? (
        <p className="muted" style={{ marginTop: 20 }}>
          Ce membre n&apos;a encore rien réservé.
        </p>
      ) : (
        commandes.map((g) => (
          <section key={g.d?.id || "inconnu"} className="card mdet-commande">
            <div className="row">
              <h2 className="mdet-domaine">
                {g.d ? <Link href={`/admin/domaine/${g.d.slug}`}>{g.d.name}</Link> : "Domaine inconnu"}
              </h2>
              {g.d && <span className="mdet-badge">{ETAT_DOMAINE[g.d.status] || g.d.status}</span>}
            </div>
            {g.d?.region && <p className="muted">{g.d.region}</p>}
            <div className="mdet-scroll">
              <table className="mdet-table">
                <thead>
                  <tr>
                    <th>Cuvée</th>
                    <th>Qté</th>
                    <th>Prix</th>
                    <th>Total</th>
                    <th>État</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {g.lignes.map((l) => (
                    <tr key={l.id}>
                      <td>
                        {l.cuvee ? `${l.cuvee.name}${l.cuvee.vintage ? ` ${l.cuvee.vintage}` : ""}` : "Cuvée supprimée"}
                        <span className="mdet-date">réservé le {dateCourte(l.created_at)}</span>
                      </td>
                      <td>{l.quantity}</td>
                      <td className="nowrap">{euros(l.unit_price)}</td>
                      <td className="nowrap">{euros(l.total)}</td>
                      <td className="nowrap">
                        {ETAT_RESA[l.status] || l.status}
                        {l.paid_at ? <span className="mdet-date">le {dateCourte(l.paid_at)}</span> : null}
                      </td>
                      <td>
                        {ANNULABLES.includes(l.status) ? (
                          <form action={cancelReservations}>
                            <input type="hidden" name="id" value={l.id} />
                            <input type="hidden" name="retour" value={`/admin/membres/${m.id}`} />
                            <ConfirmSubmit message={`Annuler ${l.quantity} × ${l.cuvee?.name || "cette cuvée"} pour ${nom} ?`}>
                              Annuler
                            </ConfirmSubmit>
                          </form>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td>Sous-total</td>
                    <td>{g.bouteilles}</td>
                    <td />
                    <td className="nowrap">{euros(g.montant)}</td>
                    <td />
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            {(() => {
              const annulables = g.lignes.filter((l) => ANNULABLES.includes(l.status));
              const payees = g.lignes.some((l) => l.status === "payee");
              const nb = annulables.reduce((s, l) => s + (l.quantity || 0), 0);
              return (
                <>
                  {annulables.length > 1 && (
                    <form action={cancelReservations} className="mdet-annuler-tout">
                      {annulables.map((l) => (
                        <input key={l.id} type="hidden" name="id" value={l.id} />
                      ))}
                      <input type="hidden" name="retour" value={`/admin/membres/${m.id}`} />
                      <ConfirmSubmit
                        message={`Annuler toute la commande de ${nom} chez ${g.d?.name || "ce domaine"} (${nb} bouteille${nb > 1 ? "s" : ""}) ?`}
                      >
                        Annuler toute la commande chez {g.d?.name || "ce domaine"}
                      </ConfirmSubmit>
                    </form>
                  )}
                  {payees && (
                    <p className="muted mdet-note">
                      Les lignes payées ne s&apos;annulent pas ici : remboursez d&apos;abord le membre dans Stripe.
                    </p>
                  )}
                </>
              );
            })()}
          </section>
        ))
      )}

      {annulees.length > 0 && (
        <section className="mdet-annulees">
          <h2 className="mdet-domaine">Réservations annulées</h2>
          <ul>
            {annulees.map((l) => (
              <li key={l.id} className="muted">
                {l.quantity} × {l.cuvee?.name || "cuvée supprimée"}
                {l.domaine ? ` (${l.domaine.name})` : ""} · {dateCourte(l.created_at)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
