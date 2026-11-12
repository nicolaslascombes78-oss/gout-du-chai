import Link from "next/link";
import Celebration from "@/components/Celebration";
import ClubHeader from "@/components/ClubHeader";
import MemberCard from "@/components/MemberCard";
import NotificationToggle from "@/components/NotificationToggle";
import c from "@/components/Commandes.module.css";
import e from "@/components/Espace.module.css";
import { requireMember } from "@/lib/data";
import { euros } from "@/lib/catalogue";
import { chargerCommandes, statutCommande, plusAvancee } from "@/lib/commandes";

export const dynamic = "force-dynamic";

// Icônes de la liste « Mon compte » (trait fin, couleur or)
const ICONES = {
  paiement: "M3 7h18v10H3zM3 11h18",
  suivis: "M12 4l2.4 5 5.4.6-4 3.7 1.1 5.3L12 16l-4.9 2.6 1.1-5.3-4-3.7 5.4-.6z",
  notifications: "M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0",
  invitations: "M15 19a6 6 0 0 0-12 0M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M19 8v6M16 11h6",
};

export default async function Membre({ searchParams }) {
  const { supabase, member } = await requireMember();
  const params = await searchParams;
  const justReserved = params?.reserve === "1";

  const [{ groups, progress, enCours, passees }, { count: nbSuivis }, { data: carte }, { data: aRegler }, { data: invites }] =
    await Promise.all([
      chargerCommandes(supabase, member),
      supabase.from("domain_follows").select("domain_id", { count: "exact", head: true }).eq("member_id", member.id),
      supabase.from("member_cards").select("brand, last4, payment_method").eq("member_id", member.id).maybeSingle(),
      supabase
        .from("payments")
        .select("id")
        .eq("member_id", member.id)
        .in("status", ["action_requise", "refusee", "sans_carte"]),
      supabase.rpc("my_invitations"),
    ]);
  const aUneCarte = Boolean(carte?.payment_method);
  const enAttente = (invites || []).filter((i) => !i.used && new Date(i.expires_at) >= new Date()).length;

  // Le membre vient de compléter une commande : on célèbre.
  const lanceGroupe = params?.lance ? groups.find((g) => g.domain.slug === params.lance && !g.archive) : null;
  const lanceProg = lanceGroupe ? progress[lanceGroupe.domain.id] : null;

  const numero = String(member.member_number).padStart(3, "0");
  const since = new Date(member.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  // Aperçu : la commande en cours la plus avancée, puis le nombre des autres.
  const premiere = plusAvancee(enCours, progress);
  const st = premiere
    ? statutCommande(premiere.domain, progress[premiere.domain.id], premiere.lines.every((r) => r.status === "payee"), premiere.bottles)
    : null;
  const autresEnCours = enCours.length - (premiere ? 1 : 0);
  const autres = [
    autresEnCours > 0 ? `${autresEnCours} autre${autresEnCours > 1 ? "s" : ""} en cours` : null,
    passees.length > 0 ? `${passees.length} livrée${passees.length > 1 ? "s" : ""}` : null,
  ].filter(Boolean);

  const lignes = [
    {
      cle: "paiement",
      href: "/club/membre/carte",
      nom: "Paiement",
      valeur: aUneCarte ? `Carte •••• ${carte.last4}` : "À enregistrer",
    },
    { cle: "suivis", href: "/club/membre/suivis", nom: "Domaines suivis", valeur: nbSuivis ? String(nbSuivis) : "" },
    { cle: "notifications", href: "/club/membre/notifications", nom: "Notifications", valeur: "" },
    {
      cle: "invitations",
      href: "/club/membre/invitations",
      nom: "Inviter un ami",
      valeur: enAttente ? `${enAttente} en attente` : "",
    },
  ];

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
      <h1 style={{ fontSize: 30 }}>Votre espace</h1>
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
        <div className={e.titreBloc}>
          <p>Mes commandes</p>
          {groups.length > 0 && (
            <Link href="/club/membre/commandes" className={e.toutVoir}>
              Tout voir ›
            </Link>
          )}
        </div>

        {justReserved && (
          <div className="card stack reserve-ok" role="status">
            <p className="reserve-ok-t">C&apos;est réservé !</p>
            <p className="muted">
              Vous ne serez débité que si la commande est lancée. Vous pouvez modifier ou annuler vos bouteilles
              jusque-là. Un ami amateur peut aider à compléter la commande : invitez-le depuis « Inviter un ami ».
            </p>
            <NotificationToggle moment="reservation" />
          </div>
        )}

        {groups.length === 0 && (
          <div className={e.vide}>
            <p className="muted">Vous n&apos;avez pas encore de réservation. Choisissez vos bouteilles dans la Sélection.</p>
            <Link href="/club/selection" className="btn btn-ghost">
              Parcourir la Sélection
            </Link>
          </div>
        )}

        {premiere && (
          <Link href={`/club/membre/commandes#commande-${premiere.domain.slug}`} className={e.apercu}>
            <span className={e.apercuHaut}>
              <span className={e.apercuNom}>{premiere.domain.name}</span>
              <span className={e.apercuPrix}>{euros(premiere.total)}</span>
            </span>
            <span className={c.barre} aria-hidden="true">
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={n < st.etape ? c.segFait : n === st.etape ? c.segEnCours : c.seg} />
              ))}
            </span>
            <span className={e.apercuStatut}>{st.texte}</span>
          </Link>
        )}

        {!premiere && passees.length > 0 && (
          <Link href="/club/membre/commandes" className={e.apercu}>
            <span className={e.apercuStatut}>
              {passees.length} commande{passees.length > 1 ? "s" : ""} livrée{passees.length > 1 ? "s" : ""} · Voir et donner mon avis
            </span>
          </Link>
        )}

        {premiere && autres.length > 0 && <p className={e.autres}>+ {autres.join(" · ")}</p>}
      </section>

      <section className="section stack">
        <div className={e.titreBlocDiscret}>
          <p>Mon compte</p>
        </div>
        <nav className={e.liste} aria-label="Mon compte">
          {lignes.map((l) => (
            <Link key={l.cle} href={l.href} className={e.ligne}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={ICONES[l.cle]} />
              </svg>
              <span className={e.ligneNom}>{l.nom}</span>
              {l.valeur && <span className={e.ligneValeur}>{l.valeur}</span>}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ivory-dim)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </Link>
          ))}
        </nav>
      </section>

      <footer className={e.pied}>
        <nav className={e.liens} aria-label="Aide">
          <Link href="/club/membre/idee">Une idée, un souci ?</Link>
          <span aria-hidden="true">·</span>
          <Link href="/club/membre/aide">Aide et règles</Link>
          {member.is_admin && (
            <>
              <span aria-hidden="true">·</span>
              <Link href="/admin">Admin</Link>
            </>
          )}
        </nav>
        <div className={e.session}>
          {member.email && <span>{member.email}</span>}
          {member.email && <span aria-hidden="true">·</span>}
          <form action="/deconnexion" method="post">
            <button className={e.deconnexion}>Se déconnecter</button>
          </form>
        </div>
      </footer>
    </main>
  );
}
