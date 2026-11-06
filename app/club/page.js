import Link from "next/link";
import ClubHeader from "@/components/ClubHeader";
import Gauge from "@/components/Gauge";
import Seal from "@/components/Seal";
import ShareOrder from "@/components/ShareOrder";
import DomainImage from "@/components/DomainImage";
import { requireMember, loadSelection } from "@/lib/data";
import { COLOR_LABELS, cardBadge, closingLabel, daysLeft, displayStatus, euros } from "@/lib/catalogue";

export const dynamic = "force-dynamic";

const OPEN = ["ouvert", "bientot_atteint"];

function hello() {
  // Heure de Paris, en chiffres seuls (« 00 » à « 23 »).
  const h = parseInt(
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: "Europe/Paris" }).format(new Date()),
    10
  );
  return h >= 18 || h < 5 ? "Bonsoir" : "Bonjour";
}

export default async function Club() {
  const { supabase, member } = await requireMember();
  const domains = await loadSelection(supabase);

  const [{ data: favs }, { data: resa }] = await Promise.all([
    supabase
      .from("cuvees")
      .select("id, name, vintage, color, member_price, domains(name, slug, photos, photo_logo, photo_bg)")
      .eq("is_favorite", true)
      .eq("active", true)
      .limit(60),
    supabase
      .from("reservations")
      .select("quantity, cuvees(domains(id))")
      .eq("member_id", member.id)
      .eq("status", "en_attente"),
  ]);

  // Un coup de cœur par domaine et par couleur, 6 au maximum.
  const seen = new Set();
  const coups = (favs || [])
    .filter((c) => {
      const k = `${c.domains?.slug}-${c.color}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 6);

  const withStatus = domains.map((d) => ({ ...d, st: displayStatus(d, d.reserved) }));
  const open = withStatus.filter((d) => d.st.key !== "a_venir");

  // Les bouteilles du membre, par domaine encore ouvert.
  const mineByDomain = {};
  (resa || []).forEach((r) => {
    const id = r.cuvees?.domains?.id;
    if (id) mineByDomain[id] = (mineByDomain[id] || 0) + r.quantity;
  });
  const mesCommandes = withStatus.filter(
    (d) => mineByDomain[d.id] && OPEN.includes(d.status) && d.threshold && (daysLeft(d.deadline) ?? 0) >= 0
  );
  const manqueTotal = mesCommandes.reduce((s, d) => s + Math.max(0, d.threshold - d.reserved), 0);

  // La commande à mettre en avant, puis les suivantes : les plus avancées, hors commandes du membre.
  const pct = (d) => d.reserved / d.threshold;
  const candidates = open
    .filter((d) => OPEN.includes(d.status) && d.threshold && d.reserved < d.threshold && !mineByDomain[d.id])
    .filter((d) => (daysLeft(d.deadline) ?? 0) >= 0)
    .sort((a, b) => pct(b) - pct(a));
  const une = candidates[0];
  // « Bientôt complètes » seulement au-delà de la moitié du seuil ; sinon, « Les plus avancées ».
  const avancees = candidates.slice(1).filter((d) => pct(d) >= 0.5);
  const presque = avancees.length > 0;
  const suivantes = (presque ? avancees : candidates.slice(1)).slice(0, 3);

  const numero = String(member.member_number).padStart(3, "0");
  const nouveau = mesCommandes.length === 0;

  return (
    <main className="shell home">
      <ClubHeader />

      <h1 className="home-hello">
        {hello()} {member.first_name}.
      </h1>
      <p className="home-sub">
        {nouveau
          ? "Bienvenue au club. Voici comment ça marche."
          : `${mesCommandes.length > 1 ? `${mesCommandes.length} de vos commandes avancent` : "Votre commande avance"}. Il manque ${manqueTotal} bouteille${manqueTotal > 1 ? "s" : ""} en tout pour ${mesCommandes.length > 1 ? "les" : "la"} lancer.`}
      </p>

      <Link href="/club/membre" className="mc-compact">
        <span className="mc-num">N° {numero}</span>
        <span className="muted">
          {member.invites_left} invitation{member.invites_left > 1 ? "s" : ""}
        </span>
      </Link>

      {nouveau ? (
        <section className="section card stack">
          <h2 className="home-h2">Comment ça marche</h2>
          <ol className="howto">
            <li>
              <Seal reserved={2} mine={2} threshold={6} size={52} bare />
              <span>
                <strong>Vous réservez.</strong>
                <span className="muted">Vos bouteilles au prix adhérent. Rien n&apos;est débité.</span>
              </span>
            </li>
            <li>
              <Seal reserved={6} threshold={6} size={52} />
              <span>
                <strong>Le sceau se referme.</strong>
                <span className="muted">
                  Quand le seuil est atteint, la commande part chez le vigneron et vous êtes débité.
                </span>
              </span>
            </li>
            <li>
              <span className="howto-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7l9-4 9 4-9 4-9-4z" />
                  <path d="M3 7v10l9 4 9-4V7" />
                  <path d="M12 11v10" />
                </svg>
              </span>
              <span>
                <strong>Vous dégustez.</strong>
                <span className="muted">Vos bouteilles vous sont livrées une fois la commande arrivée.</span>
              </span>
            </li>
          </ol>
        </section>
      ) : (
        <section className="section stack">
          <div className="row">
            <h2 className="home-h2">Vos commandes en cours</h2>
            <Link href="/club/membre" className="muted">
              Tout voir
            </Link>
          </div>
          {mesCommandes.map((d) => {
            const missing = Math.max(0, d.threshold - d.reserved);
            const badge = cardBadge(d, d.st);
            return (
              <article className="card order-card" key={d.id}>
                <div className="dc-grid">
                  <div style={{ minWidth: 0 }}>
                    <div className="dc-top">
                      <span className="muted">{d.region}</span>
                      {badge && <span className={`badge badge-${badge.key}`}>{badge.label}</span>}
                    </div>
                    <h3>{d.name}</h3>
                    <Gauge
                      variant="lines"
                      reserved={d.reserved}
                      threshold={d.threshold}
                      mine={mineByDomain[d.id]}
                      deadline={d.deadline}
                      showDeadline
                    />
                  </div>
                  <Seal reserved={d.reserved} mine={mineByDomain[d.id]} threshold={d.threshold} size={88} />
                </div>
                <div className="order-actions">
                  <ShareOrder name={d.name} region={d.region} missing={missing} slug={d.slug} />
                  <Link href={`/club/domaine/${d.slug}`} className="btn btn-ghost order-btn order-edit">
                    Modifier
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {une && (
        <section className="section stack">
          <h2 className="home-h2">{nouveau ? "Pour commencer" : "La commande à compléter"}</h2>
          <Link href={`/club/domaine/${une.slug}`} className="card une">
            <DomainImage domain={une} variant="hero" />
            <p className="muted" style={{ marginTop: 14 }}>
              {une.region}
              {une.appellation ? ` · ${une.appellation}` : ""}
            </p>
            <h3 className="une-name">{une.name}</h3>
            {une.tagline && <p className="muted">{une.tagline}</p>}
            <div style={{ marginTop: 16 }}>
              <Gauge
                reserved={une.reserved}
                threshold={une.threshold}
                participants={une.participants}
                deadline={une.deadline}
                showDeadline
                size={112}
              />
            </div>
            <span className="btn" style={{ marginTop: 18 }}>
              {nouveau ? "Choisir mes premières bouteilles" : "Découvrir les cuvées"}
            </span>
          </Link>
        </section>
      )}

      {suivantes.length > 0 && (
        <section className="section stack">
          <div className="row">
            <h2 className="home-h2">{presque ? "Bientôt complètes" : "Les plus avancées"}</h2>
            <Link href="/club/selection" className="muted">
              Tout voir
            </Link>
          </div>
          <div className="card hot-list">
            {suivantes.map((d) => {
              const missing = Math.max(0, d.threshold - d.reserved);
              const j = daysLeft(d.deadline);
              const urgent = j != null && j >= 0 && j <= 5;
              return (
                <Link href={`/club/domaine/${d.slug}`} className="hot-row" key={d.id}>
                  <Seal reserved={d.reserved} threshold={d.threshold} size={46} />
                  <span className="hot-txt">
                    <span className="hot-name">{d.name}</span>
                    <span className={`muted${urgent ? " is-urgent" : ""}`}>
                      {d.region} · {urgent ? closingLabel(d.deadline).toLowerCase() : `plus que ${missing}`}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {coups.length > 0 && (
        <section className="section stack">
          <h2 className="home-h2">Les coups de cœur du club</h2>
          <div className="scroller">
            {coups.map((c) => (
              <Link href={`/club/domaine/${c.domains.slug}`} className="card mini" key={c.id}>
                <DomainImage domain={c.domains} variant="thumb" />
                <p className="muted">
                  {COLOR_LABELS[c.color]} · {c.domains.name}
                </p>
                <h3>{c.name}</h3>
                <p className="price" style={{ marginTop: 8 }}>
                  {euros(c.member_price)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="section card stack invite-block">
        <h2 className="home-h2">Faites entrer un ami</h2>
        <p className="muted">
          Il vous reste {member.invites_left} invitation{member.invites_left > 1 ? "s" : ""}. Chaque nouveau membre aide
          les commandes à partir.
        </p>
        <Link href="/club/membre#invitations" className="btn btn-ghost">
          Inviter un ami
        </Link>
      </section>

      <section className="section">
        <Link href="/club/selection" className="btn btn-ghost">
          Toute la Sélection · {open.length} domaines
        </Link>
      </section>

      <footer className="foot">
        L&apos;abus d&apos;alcool est dangereux pour la santé, à consommer avec modération.
      </footer>
    </main>
  );
}
