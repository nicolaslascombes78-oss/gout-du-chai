import Link from "next/link";
import ClubHeader from "@/components/ClubHeader";
import MarkSeen from "@/components/MarkSeen";
import NotificationToggle from "@/components/NotificationToggle";
import { requireMember } from "@/lib/data";
import { loadActivity } from "@/lib/activite";

export const dynamic = "force-dynamic";
export const metadata = { title: "Au club — Le Goût du Chai" };

const ICONES = { nouveau: "✦", sceau: "●", resa: "+", lance: "↗", expedie: "→", livre: "✓", membres: "◇", filleul: "★" };

const cleJour = (d) =>
  new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

function libelleJour(iso) {
  const d = new Date(iso);
  if (cleJour(d) === cleJour(new Date())) return "Aujourd'hui";
  if (cleJour(d) === cleJour(new Date(Date.now() - 86400000))) return "Hier";
  const s = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function Activite({ searchParams }) {
  const sp = await searchParams;
  const onglet = sp?.onglet === "membres" ? "membres" : "domaines";
  const { member } = await requireMember();
  const { events: tous, aVenir, latest } = await loadActivity(member?.id);
  const events = tous.filter((e) => e.onglet === onglet);
  const nb = {
    domaines: tous.filter((e) => e.onglet === "domaines").length,
    membres: tous.filter((e) => e.onglet === "membres").length,
  };

  const groupes = [];
  for (const e of events) {
    const titre = libelleJour(e.date);
    const g = groupes[groupes.length - 1];
    if (g && g.titre === titre) g.items.push(e);
    else groupes.push({ titre, items: [e] });
  }

  return (
    <main className="shell">
      <ClubHeader />
      <MarkSeen at={latest} />
      <h1 className="act-title">Au club</h1>
      <p className="act-intro">Ce qui se passe dans le cercle, ces dernières semaines.</p>

      <div className="act-notif">
        <NotificationToggle moment="reservation" />
      </div>

      <nav className="act-tabs" aria-label="Type d'activité">
        <Link
          href="/club/activite"
          className={`act-tab${onglet === "domaines" ? " on" : ""}`}
          aria-current={onglet === "domaines" ? "page" : undefined}
        >
          Domaines <span className="act-count">{nb.domaines}</span>
        </Link>
        <Link
          href="/club/activite?onglet=membres"
          className={`act-tab${onglet === "membres" ? " on" : ""}`}
          aria-current={onglet === "membres" ? "page" : undefined}
        >
          Membres <span className="act-count">{nb.membres}</span>
        </Link>
      </nav>

      {onglet === "domaines" && aVenir.length > 0 && (
        <section>
          <h2 className="act-h2">À ne pas manquer</h2>
          <ul className="act-list">
            {aVenir.map((a) => (
              <li key={a.slug}>
                <Link href={`/club/domaine/${a.slug}`} className="act-item act-urgent">
                  <span className="act-ico" aria-hidden="true">
                    !
                  </span>
                  <span className="act-txt">
                    <strong>
                      {a.jours === 0 ? "Clôture aujourd'hui" : a.jours === 1 ? "Clôture demain" : `Clôture dans ${a.jours} jours`} chez{" "}
                      {a.name}
                    </strong>
                    <span>
                      Il manque {a.manque} bouteille{a.manque > 1 ? "s" : ""} pour lancer la commande.
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {groupes.length === 0 ? (
        <p className="muted act-vide">{onglet === "membres"
            ? "Pas de nouveau membre ces dernières semaines."
            : "Rien de nouveau ces dernières semaines. Les prochaines commandes s’annonceront ici."}</p>
      ) : (
        groupes.map((g) => (
          <section key={g.titre}>
            <h2 className="act-h2">{g.titre}</h2>
            <ul className="act-list">
              {g.items.map((e, i) => {
                const contenu = (
                  <>
                    <span className={`act-ico act-${e.type}`} aria-hidden="true">
                      {ICONES[e.type] || "·"}
                    </span>
                    <span className="act-txt">
                      <strong>{e.titre}</strong>
                      {e.texte && <span>{e.texte}</span>}
                    </span>
                  </>
                );
                return (
                  <li key={`${e.type}-${e.date}-${i}`}>
                    {e.href ? (
                      <Link href={e.href} className="act-item">
                        {contenu}
                      </Link>
                    ) : (
                      <div className="act-item">{contenu}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      <p className="muted" style={{ marginTop: 28, textAlign: "center" }}>
        <Link href="/club/membre#notifications">Réglages des notifications</Link>
      </p>
    </main>
  );
}
