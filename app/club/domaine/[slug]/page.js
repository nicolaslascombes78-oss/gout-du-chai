import { notFound } from "next/navigation";
import "@/app/commande-carte.css";
import Celebration from "@/components/Celebration";
import ClubHeader from "@/components/ClubHeader";
import Gauge from "@/components/Gauge";
import CuveeSheet from "@/components/CuveeSheet";
import CuveeStepper from "@/components/CuveeStepper";
import CuveeTabs from "@/components/CuveeTabs";
import DomainCartLink from "@/components/DomainCartLink";
import DomainImage from "@/components/DomainImage";
import DomainRecommend from "@/components/DomainRecommend";
import FollowButton from "@/components/FollowButton";
import ShareOrder from "@/components/ShareOrder";
import StickyProgress from "@/components/StickyProgress";
import ShowMore from "@/components/ShowMore";
import StoryClamp from "@/components/StoryClamp";
import { requireMember, ACTIVE_RESERVATION } from "@/lib/data";
import { moyenne, texteRecommandation } from "@/lib/avis";
import { COLOR_LABELS, COLOR_ORDER, cardBadge, daysLeft, displayStatus, euros } from "@/lib/catalogue";

export const dynamic = "force-dynamic";

const CLOSED = {
  a_venir: "Réservations bientôt ouvertes",
  declenche: "Commande déclenchée",
  expedie: "Commande expédiée",
  livre: "Commande livrée",
  expire: "Réservations closes",
};

export default async function Domaine({ params }) {
  const { slug } = await params;
  const { supabase, member } = await requireMember();

  const { data: domain } = await supabase
    .from("domains")
    .select("id, slug, name, region, appellation, tagline, story, photos, photo_logo, photo_bg, threshold, pack_size, deadline, status")
    .eq("slug", slug)
    .maybeSingle();
  if (!domain) notFound();

  const [{ data: cuvees }, { data: progress }, { data: follow }, { data: recos }] = await Promise.all([
    supabase
      .from("cuvees")
      .select("id, name, vintage, color, member_price, description, is_favorite, pack_size, cepages, elevage, accords, service, garde, degre, labels, source_fiche")
      .eq("domain_id", domain.id)
      .eq("active", true)
      .order("member_price"),
    supabase.from("domain_progress").select("reserved_bottles, participants").eq("domain_id", domain.id).maybeSingle(),
    supabase
      .from("domain_follows")
      .select("domain_id")
      .eq("member_id", member.id)
      .eq("domain_id", domain.id)
      .maybeSingle(),
    supabase
      .from("domain_reviews")
      .select("id, member_id, verdict, comment, author_name, hidden, updated_at")
      .eq("domain_id", domain.id)
      .order("updated_at", { ascending: false }),
  ]);

  // Ce que ce membre a déjà réservé dans ce domaine, les avis des membres,
  // et (commande livrée) les cuvées qu'il a reçues et peut donc noter.
  const ids = (cuvees || []).map((c) => c.id);
  const vide = { data: [] };
  const [{ data: mine }, { data: avisLignes }, { data: recues }] = ids.length
    ? await Promise.all([
        supabase
          .from("reservations")
          .select("cuvee_id, quantity, unit_price")
          .eq("member_id", member.id)
          .eq("status", "en_attente")
          .in("cuvee_id", ids),
        supabase
          .from("cuvee_reviews")
          .select("id, cuvee_id, member_id, rating, tags, comment, author_name, hidden, created_at, updated_at")
          .in("cuvee_id", ids)
          .order("updated_at", { ascending: false }),
        domain.status === "livre"
          ? supabase
              .from("reservations")
              .select("cuvee_id")
              .eq("member_id", member.id)
              .in("status", ACTIVE_RESERVATION)
              .in("cuvee_id", ids)
          : vide,
      ])
    : [vide, vide, vide];
  const reservedByCuvee = {};
  (mine || []).forEach((r) => (reservedByCuvee[r.cuvee_id] = (reservedByCuvee[r.cuvee_id] || 0) + r.quantity));
  const myBottles = Object.values(reservedByCuvee).reduce((s, n) => s + n, 0);
  // Ma réservation chez ce domaine, résumée dans la carte de commande
  const monMontant = (mine || []).reduce((t, r) => t + (r.quantity || 0) * Number(r.unit_price || 0), 0);
  // Listes de cuvées raccourcies : les 6 premières de chaque couleur (coups de cœur en tête),
  // plus toutes celles déjà réservées par le membre ; le reste derrière « Voir les autres ».
  const LIMITE = 6;
  const partage = (items) => {
    if (items.length <= LIMITE + 2) return { visibles: items, caches: [] };
    const visibles = [];
    const caches = [];
    items.forEach((c, i) => (i < LIMITE || reservedByCuvee[c.id] ? visibles : caches).push(c));
    return { visibles, caches };
  };
  const mesLignes = (cuvees || [])
    .filter((c) => reservedByCuvee[c.id])
    .map((c) => ({ id: c.id, nom: c.vintage ? `${c.name} ${c.vintage}` : c.name, qte: reservedByCuvee[c.id] }));

  const recuesIds = new Set((recues || []).map((r) => r.cuvee_id));
  const avisParCuvee = {};
  for (const id of ids) {
    const lignes = (avisLignes || []).filter((a) => a.cuvee_id === id);
    const visibles = lignes.filter((a) => !a.hidden);
    avisParCuvee[id] = {
      liste: visibles,
      nb: visibles.length,
      moyenne: moyenne(visibles),
      mien: lignes.find((a) => a.member_id === member.id) || null,
      peutDonner: recuesIds.has(id),
    };
  }

  const reserved = progress?.reserved_bottles || 0;
  const participants = progress?.participants || 0;
  const st = displayStatus(domain, reserved);
  const badge = cardBadge(domain, st);
  const today = new Date().toISOString().slice(0, 10);
  const pastDeadline = domain.deadline && domain.deadline < today;
  const editable = ["ouvert", "bientot_atteint"].includes(domain.status) && !pastDeadline;
  const closedLabel = pastDeadline ? "Réservations closes" : CLOSED[domain.status] || "Réservations closes";

  const groups = COLOR_ORDER.map((c) => ({
    color: c,
    items: (cuvees || [])
      .filter((x) => x.color === c)
      .sort((a, b) => Number(Boolean(b.is_favorite)) - Number(Boolean(a.is_favorite))),
  })).filter((g) => g.items.length);
  const tabs = groups.map((g) => ({ color: g.color, label: COLOR_LABELS[g.color], count: g.items.length }));
  const favorites = (cuvees || []).filter((c) => c.is_favorite);

  // Bloc commande : quand on peut encore réserver, le partage en bouton principal
  // (les cuvées à choisir sont juste en dessous).
  const missing = domain.threshold ? Math.max(0, domain.threshold - reserved) : 0;
  const jours = daysLeft(domain.deadline);
  const canAct = editable && groups.length > 0 && st.key !== "a_venir" && missing > 0;
  const forBar = (cuvees || []).map((c) => ({
    id: c.id,
    price: Number(c.member_price),
    reserved: reservedByCuvee[c.id] || 0,
  }));

  // Commande livrée : le membre qui a reçu des bouteilles peut recommander le domaine.
  const aNoter = ids.filter((id) => avisParCuvee[id].peutDonner && !avisParCuvee[id].mien).length;
  const peutRecommander = recuesIds.size > 0;
  const maReco = (recos || []).find((r) => r.member_id === member.id) || null;
  const reponses = (recos || []).filter((r) => !r.hidden && r.verdict !== "ignore");
  const recommandation = texteRecommandation(reponses.filter((r) => r.verdict === "oui").length, reponses.length);
  const motsMembres = reponses.filter((r) => r.comment).slice(0, 3);

  // Une ligne de cuvée : nom (+ cépage et labels, via CuveeSheet), puis coup de cœur et millésime.
  // La description complète se lit dans la fiche du vin.
  const ligneCuvee = (c) => (
    <div className="cuvee" key={c.id} id={`cuvee-${c.id}`}>
      <div>
        <p>
          <CuveeSheet c={c} domainName={domain.name} slug={domain.slug} avis={avisParCuvee[c.id]} />
        </p>
        <p className="muted">
          {c.is_favorite && <span className="cuvee-fav">♥ Coup de cœur · </span>}
          {c.vintage || "Sans millésime"}
        </p>
      </div>
      <div className="cuvee-side">
        <p className="price">{euros(c.member_price)}</p>
        <CuveeStepper
          cuveeId={c.id}
          domainSlug={domain.slug}
          step={c.pack_size}
          reserved={reservedByCuvee[c.id] || 0}
          editable={editable}
          label={c.name}
        />
      </div>
    </div>
  );

  return (
    <main className="shell">
      <ClubHeader back={{ href: "/club/selection", label: "La Sélection" }} />

      {domain.threshold && reserved >= domain.threshold ? (
        <Celebration
          slug={domain.slug}
          name={domain.name}
          participants={participants}
          threshold={domain.threshold}
          mine={myBottles}
        />
      ) : null}

      <DomainImage domain={domain} variant="hero" />

      <p className="eyebrow" style={{ textAlign: "center", marginTop: 28 }}>
        {domain.region}
        {domain.appellation ? ` · ${domain.appellation}` : ""}
      </p>
      <h1 style={{ fontSize: 34, marginTop: 10 }}>{domain.name}</h1>
      {domain.tagline && <p className="lead">{domain.tagline}</p>}
      <div className="ornament" />

      <section className="card stack carte-commande" id="commande">
        <div className="cmd-tete">
          <div className="cmd-tete-g">
            <p className="eyebrow">Commande groupée</p>
            {badge && <span className={`badge badge-${badge.key}`}>{badge.label}</span>}
          </div>
          <FollowButton domainId={domain.id} initial={Boolean(follow)} interet={st.key === "a_venir"} compact />
        </div>
        {st.key === "a_venir" ? (
          <p className="muted">Les réservations ouvriront prochainement.</p>
        ) : (
          <Gauge
            reserved={reserved}
            threshold={domain.threshold}
            participants={participants}
            deadline={domain.deadline}
            showDeadline
            mine={myBottles}
            size={104}
          />
        )}
        {mesLignes.length > 0 && (
          <div className="ma-resa">
            <p className="ma-resa-titre">
              Vous avez réservé {myBottles} bouteille{myBottles > 1 ? "s" : ""}
              {monMontant > 0 ? ` · ${euros(monMontant)}` : ""}
            </p>
            <ul className="ma-resa-liste">
              {mesLignes.map((l) => (
                <li key={l.id}>
                  {l.qte} × {l.nom}
                </li>
              ))}
            </ul>
            {editable ? (
              <a href={`#cuvee-${mesLignes[0].id}`} className="link-btn">
                Modifier ma réservation
              </a>
            ) : (
              <p className="muted">La commande est close : votre réservation ne peut plus être modifiée.</p>
            )}
          </div>
        )}
        {canAct ? (
          <div className="cta-commande">
            <ShareOrder
              name={domain.name}
              region={domain.region}
              missing={missing}
              slug={domain.slug}
              canInvite={member.is_admin || member.invites_left > 0}
              invitesLeft={member.is_admin ? null : member.invites_left}
            />
          </div>
        ) : (
          groups.length > 0 && (
            <a href="#cuvees" className="link-btn story-more jump-cuvees">
              Voir les {(cuvees || []).length} cuvées
            </a>
          )
        )}
        {recommandation && <p className="reco-ligne">{recommandation}</p>}
      </section>

      {st.key !== "a_venir" && (
        <StickyProgress
          name={domain.name}
          reserved={reserved}
          threshold={domain.threshold}
          echeance={jours != null && jours >= 0 ? (jours === 0 ? "clôture aujourd’hui" : `clôture dans ${jours} j`) : null}
        />
      )}

      {peutRecommander && (
        <DomainRecommend domainId={domain.id} slug={domain.slug} domainName={domain.name} mienne={maReco} aNoter={aNoter} />
      )}

      <section className="section stack" id="cuvees">
        <h2>Les cuvées</h2>
        {groups.length === 0 && <p className="muted">Les cuvées de ce domaine arrivent bientôt.</p>}
        <CuveeTabs tabs={tabs}>
          {groups.map((g) => (
            <div key={g.color} className="stack cuvee-group" data-c={g.color}>
              <p className="eyebrow">{COLOR_LABELS[g.color]}</p>
              <div className="cuvee-list">
                {partage(g.items).visibles.map(ligneCuvee)}
                {partage(g.items).caches.length > 0 && (
                  <ShowMore count={partage(g.items).caches.length}>{partage(g.items).caches.map(ligneCuvee)}</ShowMore>
                )}
              </div>
            </div>
          ))}
        </CuveeTabs>
        <p className="muted">Prix adhérents TTC, départ domaine.</p>
      </section>

      {domain.story && (
        <section className="section stack" id="histoire">
          <h2>Pourquoi on l&apos;aime</h2>
          <StoryClamp text={domain.story} />
        </section>
      )}

      {motsMembres.length > 0 && (
        <section className="section stack">
          <h2>Ce qu&apos;en disent les membres</h2>
          <ul className="reco-mots">
            {motsMembres.map((r) => (
              <li key={r.id}>
                <blockquote>« {r.comment} »</blockquote>
                <cite>{r.author_name || "Un membre"}</cite>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="section">
        <DomainCartLink
          editable={editable && groups.length > 0}
          closedLabel={groups.length === 0 ? "Cuvées bientôt disponibles" : closedLabel}
          cuvees={forBar}
        />
      </section>

      <footer className="foot">
        L&apos;abus d&apos;alcool est dangereux pour la santé, à consommer avec modération.
      </footer>
    </main>
  );
}
