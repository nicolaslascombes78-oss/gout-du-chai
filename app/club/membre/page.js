import Link from "next/link";
import Celebration from "@/components/Celebration";
import ClubHeader from "@/components/ClubHeader";
import FeedbackForm from "@/components/FeedbackForm";
import Gauge from "@/components/Gauge";
import CancelDomainButton from "@/components/CancelDomainButton";
import InviteFriend from "@/components/InviteFriend";
import MemberCard from "@/components/MemberCard";
import NotificationToggle from "@/components/NotificationToggle";
import OrderTimeline, { dateLongue } from "@/components/OrderTimeline";
import s from "@/components/Commandes.module.css";
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

const NIVEAU = { declenche: 1, expedie: 3, livre: 4 };

// Statut lisible d'une commande en cours, en une phrase, et position sur la barre (1 à 5).
function statutCommande(d, p, paid, bottles) {
  const niveau = NIVEAU[d.status] || 0;
  const reserved = p.reserved_bottles || 0;
  const atteint = d.threshold ? reserved >= d.threshold : false;
  const membres = p.participants || 0;
  if (niveau === 0 && !atteint) {
    const manque = d.threshold ? Math.max(d.threshold - reserved, 0) : 0;
    return {
      etape: 1,
      texte: d.threshold ? `En attente du seuil · il manque ${manque} bt` : "Réservation enregistrée",
      sous: d.threshold
        ? `${reserved} / ${d.threshold} bouteilles réunies, dont ${bottles} à vous. Aucun débit avant le déclenchement.`
        : "Aucun débit avant le déclenchement.",
      atteint,
    };
  }
  if (niveau === 0) {
    return {
      etape: 2,
      texte: "Seuil atteint · déclenchement en cours",
      sous: `${reserved} / ${d.threshold} bouteilles réunies par ${membres} membre${membres > 1 ? "s" : ""}. Votre carte sera débitée au déclenchement.`,
      atteint,
    };
  }
  if (niveau === 1 && !paid) {
    return { etape: 3, texte: "Déclenchée · paiement en cours", sous: "Le domaine prépare la commande.", atteint: true };
  }
  if (niveau === 1) {
    return { etape: 4, texte: "Payée · expédition à venir", sous: "Le domaine prépare la commande.", atteint: true };
  }
  return { etape: 5, texte: "En route vers vous", sous: null, atteint: true };
}

export default async function Membre({ searchParams }) {
  const { supabase, member } = await requireMember();
  const params = await searchParams;
  const justReserved = params?.reserve === "1";

  const { data: resa } = await supabase
    .from("reservations")
    .select(
      "id, quantity, unit_price, status, created_at, paid_at, archived, group_order_id, group_orders(triggered_at, shipped_at, delivered_at, expected_delivery), cuvees(id, name, vintage, domains(id, name, slug, status, threshold, deadline, triggered_at, shipped_at, delivered_at, expected_delivery))"
    )
    .eq("member_id", member.id)
    .in("status", ["en_attente", "confirmee", "payee"])
    .order("created_at");

  // Regroupe les bouteilles par domaine.
  const byDomain = {};
  for (const r of resa || []) {
    const d0 = r.cuvees?.domains;
    if (!d0) continue;
    // Commande passée d’un domaine rouvert depuis : affichée à part, avec ses propres dates.
    const go = r.archived ? r.group_orders : null;
    const d = go
      ? { ...d0, status: "livre", triggered_at: go.triggered_at, shipped_at: go.shipped_at, delivered_at: go.delivered_at, expected_delivery: go.expected_delivery }
      : d0;
    const cle = go ? `${d0.id}:${r.group_order_id}` : d0.id;
    const g = (byDomain[cle] ||= { cle, archive: !!go, domain: d, lines: [], bottles: 0, total: 0, reservedAt: null, paidAt: null });
    g.lines.push(r);
    g.bottles += r.quantity;
    g.total += r.quantity * Number(r.unit_price);
    // Date de réservation : la première bouteille réservée ; date de paiement : le dernier paiement
    if (r.created_at && (!g.reservedAt || r.created_at < g.reservedAt)) g.reservedAt = r.created_at;
    if (r.paid_at && (!g.paidAt || r.paid_at > g.paidAt)) g.paidAt = r.paid_at;
  }
  // Le débit a lieu au déclenchement : une date de paiement antérieure (paiement saisi à la main,
  // donnée de test) est ramenée à la date de déclenchement pour que la frise reste dans l'ordre.
  for (const g of Object.values(byDomain)) {
    const t = g.domain.triggered_at;
    if (g.paidAt && t && new Date(g.paidAt) < new Date(t)) g.paidAt = t;
  }
  const groups = Object.values(byDomain);

  const ids = groups.map((g) => g.domain.id);
  const { data: prog } = ids.length
    ? await supabase.from("domain_progress").select("domain_id, reserved_bottles, participants").in("domain_id", ids)
    : { data: [] };
  const progress = Object.fromEntries((prog || []).map((p) => [p.domain_id, p]));

  // En cours d'un côté, livrées ou closes de l'autre.
  const estPassee = (g) => g.archive || g.domain.status === "livre" || g.domain.status === "expire";
  const enCours = groups.filter((g) => !estPassee(g));
  const passees = groups
    .filter(estPassee)
    .sort((a, b) => String(b.domain.delivered_at || "").localeCompare(String(a.domain.delivered_at || "")));
  const toutesLivrees = passees.every((g) => g.domain.status === "livre");

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

  // Le membre vient de compléter une commande : on célèbre.
  const lanceGroupe = params?.lance ? groups.find((g) => g.domain.slug === params.lance && !g.archive) : null;
  const lanceProg = lanceGroupe ? progress[lanceGroupe.domain.id] : null;

  const numero = String(member.member_number).padStart(3, "0");
  const since = new Date(member.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const today = new Date().toISOString().slice(0, 10);

  // Résumé d'une commande sur une ligne : « Crémant zéro dosage 2022 · 2 bt » ou « 3 cuvées · 8 bt ».
  const resume = (g) => {
    if (g.lines.length === 1) {
      const c = g.lines[0].cuvees;
      return `${c.name}${c.vintage ? ` ${c.vintage}` : ""} · ${g.bottles} bt`;
    }
    return `${g.lines.length} cuvées · ${g.bottles} bt`;
  };

  return (
    <main className="shell">
      <ClubHeader />
      {lanceGroupe && lanceGroupe.domain.threshold ? (
        <Celebration
          force
          slug={lanceGroupe.domain.slug}
          name={lanceGroupe.domain.name}
          participants={lanceProg?.participants || 0}
          threshold={lanceGroupe.domain.threshold}
          mine={lanceGroupe.bottles}
        />
      ) : null}
      <h1 style={{ fontSize: 32 }}>Votre espace</h1>
      <div className="ornament" />

      <MemberCard>
        <p className="eyebrow">Carte de membre</p>
        <p className="num">N° {numero}</p>
        <div className="row">
          <p>
            {member.first_name} {member.last_name}
          </p>
          <p className="muted">Membre depuis {since}</p>
        </div>
      </MemberCard>

      {(aRegler || []).length > 0 && (
        <Link href="/club/membre/carte" className="card stack" style={{ display: "block", borderColor: "var(--gold)" }}>
          <p className="reserve-ok-t">Un paiement est à régler</p>
          <p className="muted">Une commande est lancée mais son paiement n&apos;a pas abouti. Touchez pour la régler.</p>
        </Link>
      )}

      <section className="section stack">
        <h2>Mes commandes</h2>
        {groups.length > 0 && (
          <p className={s.intro}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            Aucun débit avant le déclenchement du domaine
          </p>
        )}
        {justReserved && (
          <div className="card stack reserve-ok" role="status">
            <p className="reserve-ok-t">C&apos;est réservé !</p>
            <p className="muted">
              Vous ne serez débité que si la commande est lancée. Vous pouvez modifier ou annuler vos bouteilles
              jusque-là. Un ami amateur peut aider à compléter la commande : invitez-le plus bas.
            </p>
            <NotificationToggle moment="reservation" />
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

        {enCours.length > 0 && (
          <div className={s.groupe}>
            <p className={s.titreGroupe}>
              En cours <span>· {enCours.length}</span>
            </p>
            {enCours.map((g) => {
              const d = g.domain;
              const p = progress[d.id] || { reserved_bottles: 0, participants: 0 };
              const editable =
                ["ouvert", "bientot_atteint"].includes(d.status) && (!d.deadline || d.deadline >= today);
              const paid = g.lines.every((r) => r.status === "payee");
              const st = statutCommande(d, p, paid, g.bottles);
              return (
                <details className={s.carte} key={g.cle}>
                  <summary>
                    <div className={s.entete}>
                      <div className={s.identite}>
                        <h3 className={s.domaine}>{d.name}</h3>
                        <span className={s.resume}>{resume(g)}</span>
                      </div>
                      <span className={s.prix}>{euros(g.total)}</span>
                    </div>
                    <div className={s.barre} aria-hidden="true">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span
                          key={n}
                          className={n < st.etape ? s.segFait : n === st.etape ? s.segEnCours : s.seg}
                        />
                      ))}
                    </div>
                    <div className={s.statut}>
                      <span className={s.statutTexte}>{st.texte}</span>
                      <span className={s.etapeNum}>{st.etape} / 5</span>
                    </div>
                    {st.sous && <p className={s.sous}>{st.sous}</p>}
                    <span className={s.voir}>
                      <span>
                        <span className={s.voirOuvrir}>Voir le suivi</span>
                        <span className={s.voirFermer}>Masquer le suivi</span>
                      </span>
                      <svg className={s.chevron} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </span>
                  </summary>

                  <div className={s.corps}>
                    <OrderTimeline
                      status={d.status}
                      paid={paid}
                      prevue={d.expected_delivery}
                      seuil={{
                        atteint: st.atteint,
                        reserved: p.reserved_bottles,
                        threshold: d.threshold,
                        participants: p.participants,
                      }}
                      dates={{
                        reservee: g.reservedAt,
                        declenchee: d.triggered_at,
                        payee: g.paidAt,
                        expediee: d.shipped_at,
                        livree: d.delivered_at,
                      }}
                    />

                    {!st.atteint && d.threshold ? (
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

                    <div className={s.bloc}>
                      <span className={s.etiquette}>Votre réservation</span>
                      {g.lines.map((r) => (
                        <div className={s.ligneCuvee} key={r.id}>
                          <span>
                            {r.quantity} × {r.cuvees.name}
                            {r.cuvees.vintage ? ` ${r.cuvees.vintage}` : ""}
                          </span>
                          <span>{euros(r.quantity * Number(r.unit_price))}</span>
                        </div>
                      ))}
                      {g.lines.length > 1 && (
                        <div className={s.total}>
                          <span>
                            {g.bottles} bouteille{g.bottles > 1 ? "s" : ""}
                          </span>
                          <span>{euros(g.total)}</span>
                        </div>
                      )}
                      {editable ? (
                        <div className={s.actions}>
                          <Link href={`/club/domaine/${d.slug}`}>Modifier</Link>
                          <CancelDomainButton cuveeIds={g.lines.map((r) => r.cuvees.id)} domainName={d.name} />
                        </div>
                      ) : (
                        <p className="muted">Réservations closes, le domaine prépare la commande.</p>
                      )}
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        )}

        {passees.length > 0 && (
          <div className={s.groupe}>
            <p className={s.titreGroupePasse}>
              {toutesLivrees ? "Livrées" : "Terminées"} <span>· {passees.length}</span>
            </p>
            {passees.map((g) => {
              const d = g.domain;
              const livree = d.status === "livre";
              const le = dateLongue(d.delivered_at);
              return (
                <div className={s.passee} key={g.cle}>
                  <div className={s.entete}>
                    <div className={s.identite}>
                      <h3 className={s.domaine}>{d.name}</h3>
                      <span className={s.resume}>
                        {resume(g)} · {euros(g.total)}
                      </span>
                    </div>
                    {livree ? (
                      <span className={s.coche} role="img" aria-label="Livrée">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M5 12.5l4.5 4.5L19 7.5" />
                        </svg>
                      </span>
                    ) : (
                      <span className="badge">Close</span>
                    )}
                  </div>
                  <div className={s.pied}>
                    <span>{livree ? (le ? `Livrée le ${le}` : "Livrée") : "Commande non lancée"}</span>
                    {livree && (
                      <Link href={`/club/domaine/${d.slug}`} className={s.avis}>
                        Donner mon avis
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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

      <section className="section stack" id="idees">
        <h2>Une envie, une idée ?</h2>
        <p className="muted">
          Un domaine que vous aimeriez voir au club, une amélioration, un souci : écrivez-nous.
        </p>
        <div className="card">
          <FeedbackForm />
        </div>
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
