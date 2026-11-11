import Link from "next/link";
import Seals from "@/components/Seals";
import { requireAdmin, ACTIVE_RESERVATION } from "@/lib/data";
import { moyenne, noteTexte, VERDICTS } from "@/lib/avis";
import { basculerAvis, basculerReco, inviterAvis } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Avis — Administration" };

const leJour = (v) =>
  v ? new Date(v).toLocaleDateString("fr-FR", { day: "numeric", month: "long", timeZone: "Europe/Paris" }) : null;

export default async function AdminAvis({ searchParams }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();

  const [{ data: avis }, { data: livres }, { data: resas }, { data: recos }] = await Promise.all([
    supabase
      .from("cuvee_reviews")
      .select("id, member_id, rating, tags, comment, author_name, hidden, created_at, updated_at, cuvees(id, name, vintage, domain_id, domains(name, slug))")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("domains").select("id, slug, name, delivered_at").eq("status", "livre").order("delivered_at", { ascending: false }),
    supabase
      .from("reservations")
      .select("member_id, cuvees!inner(domain_id)")
      .in("status", ACTIVE_RESERVATION),
    supabase
      .from("domain_reviews")
      .select("id, domain_id, member_id, verdict, comment, author_name, hidden, updated_at")
      .order("updated_at", { ascending: false }),
  ]);

  const lignes = avis || [];
  const visibles = lignes.filter((a) => !a.hidden);
  const moy = moyenne(visibles);

  // Domaines livrés : combien de réservataires ont déjà donné un avis
  const reservataires = {};
  for (const r of resas || []) (reservataires[r.cuvees.domain_id] ||= new Set()).add(r.member_id);
  const notants = {};
  for (const a of lignes) if (a.cuvees) (notants[a.cuvees.domain_id] ||= new Set()).add(a.member_id);
  for (const r of recos || []) (notants[r.domain_id] ||= new Set()).add(r.member_id);

  // Recommandations par domaine livré
  const recosDe = {};
  for (const r of recos || []) (recosDe[r.domain_id] ||= []).push(r);

  return (
    <main className="shell">
      <h1 style={{ fontSize: 30, marginTop: 24 }}>Avis des membres</h1>
      <p className="lead">
        {visibles.length} avis publié{visibles.length > 1 ? "s" : ""}
        {moy != null ? `, moyenne ${noteTexte(moy)} / 5` : ""}
      </p>
      <div className="ornament" />

      {sp?.invite != null && (
        <p className="success">
          {Number(sp.invite) === 0
            ? "Tous les réservataires de ce domaine ont déjà donné leur avis."
            : `Invitation envoyée à ${sp.envoye || 0} appareil${Number(sp.envoye) > 1 ? "s" : ""} (${sp.invite} membre${Number(sp.invite) > 1 ? "s" : ""} sans avis).`}
        </p>
      )}
      {sp?.masque === "1" && <p className="success">Avis masqué. Seul son auteur le voit encore.</p>}
      {sp?.masque === "0" && <p className="success">Avis de nouveau visible par tous les membres.</p>}
      {sp?.erreur && <p className="error">L&apos;opération n&apos;a pas abouti. Rechargez la page et réessayez.</p>}

      <section className="section stack">
        <h2>Inviter à donner un avis</h2>
        <p className="muted">
          Le bon moment : une dizaine de jours après la livraison, le temps d&apos;ouvrir une bouteille. Seuls les
          réservataires qui n&apos;ont encore rien répondu reçoivent la notification.
        </p>
        {(livres || []).length === 0 ? (
          <p className="muted">Aucune commande livrée pour l&apos;instant.</p>
        ) : (
          (livres || []).map((d) => {
            const total = reservataires[d.id]?.size || 0;
            const ont = notants[d.id]?.size || 0;
            return (
              <form action={inviterAvis} className="card stack" key={d.id}>
                <input type="hidden" name="domain_id" value={d.id} />
                <div className="row">
                  <p>
                    <Link href={`/club/domaine/${d.slug}`}>{d.name}</Link>
                  </p>
                  <span className="badge">
                    {ont} / {total} ont répondu
                  </span>
                </div>
                {d.delivered_at && <p className="muted">Livrée le {leJour(d.delivered_at)}</p>}
                {(() => {
                  const rs = recosDe[d.id] || [];
                  const n = (v) => rs.filter((r) => r.verdict === v).length;
                  return rs.length > 0 ? (
                    <p className="muted">
                      Recommandation : {n("oui")} oui, {n("peut_etre")} peut-être, {n("non")} non
                      {n("ignore") ? `, ${n("ignore")} « plus tard »` : ""}
                    </p>
                  ) : null;
                })()}
                {total > ont && (
                  <>
                    <label className="check">
                      <input type="checkbox" required /> Je confirme l&apos;envoi à {total - ont} membre
                      {total - ont > 1 ? "s" : ""}
                    </label>
                    <button className="btn btn-ghost">Envoyer l&apos;invitation</button>
                  </>
                )}
              </form>
            );
          })
        )}
      </section>

      <section className="section stack">
        <h2>Mots sur les domaines</h2>
        {(recos || []).filter((r) => r.comment).length === 0 ? (
          <p className="muted">Aucun mot pour l&apos;instant.</p>
        ) : (
          <div className="card stack">
            {(recos || [])
              .filter((r) => r.comment)
              .map((r) => (
                <div key={r.id} className={`avis-admin-item${r.hidden ? " is-hidden" : ""}`}>
                  <div>
                    <p>
                      {r.author_name || "Membre"} · {VERDICTS[r.verdict] || r.verdict}
                    </p>
                    <p className="muted">
                      {(livres || []).find((d) => d.id === r.domain_id)?.name || "Domaine"} · {leJour(r.updated_at)}
                    </p>
                    <p className="avis-texte">{r.comment}</p>
                    {r.hidden && <p className="avis-note-masque">Masqué</p>}
                  </div>
                  <form action={basculerReco}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="masquer" value={r.hidden ? "0" : "1"} />
                    <button className="btn btn-ghost" style={{ width: "auto", padding: "8px 16px" }}>
                      {r.hidden ? "Afficher" : "Masquer"}
                    </button>
                  </form>
                </div>
              ))}
          </div>
        )}
      </section>

      <section className="section stack">
        <h2>Derniers avis sur les cuvées</h2>
        {lignes.length === 0 ? (
          <p className="muted">Aucun avis pour l&apos;instant.</p>
        ) : (
          <div className="card stack">
            {lignes.map((a) => (
              <div key={a.id} className={`avis-admin-item${a.hidden ? " is-hidden" : ""}`}>
                <div>
                  <p>
                    {a.author_name || "Membre"} <Seals value={a.rating} />
                  </p>
                  <p className="muted">
                    {a.cuvees?.name}
                    {a.cuvees?.vintage ? ` ${a.cuvees.vintage}` : ""} — {a.cuvees?.domains?.name} · {leJour(a.updated_at || a.created_at)}
                  </p>
                  {a.tags?.length > 0 && <p className="muted">{a.tags.join(", ")}</p>}
                  {a.comment && <p className="avis-texte">{a.comment}</p>}
                  {a.hidden && <p className="avis-note-masque">Masqué</p>}
                </div>
                <form action={basculerAvis}>
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="masquer" value={a.hidden ? "0" : "1"} />
                  <button className="btn btn-ghost" style={{ width: "auto", padding: "8px 16px" }}>
                    {a.hidden ? "Afficher" : "Masquer"}
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
        <p className="muted">
          Masquez un avis hors sujet ou irrespectueux. Un avis simplement sévère fait partie de la crédibilité du club.
        </p>
      </section>
    </main>
  );
}
