import { notFound } from "next/navigation";
import ClubHeader from "@/components/ClubHeader";
import Gauge from "@/components/Gauge";
import CuveeStepper from "@/components/CuveeStepper";
import DomainCartLink from "@/components/DomainCartLink";
import DomainImage from "@/components/DomainImage";
import { requireMember } from "@/lib/data";
import { COLOR_LABELS, COLOR_ORDER, displayStatus, euros } from "@/lib/catalogue";

export const dynamic = "force-dynamic";

const CLOSED = {
  a_venir: "Réservations bientôt ouvertes",
  declenche: "Commande déclenchée",
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

  const [{ data: cuvees }, { data: progress }] = await Promise.all([
    supabase
      .from("cuvees")
      .select("id, name, vintage, color, member_price, description, is_favorite, pack_size")
      .eq("domain_id", domain.id)
      .eq("active", true)
      .order("member_price"),
    supabase.from("domain_progress").select("reserved_bottles, participants").eq("domain_id", domain.id).maybeSingle(),
  ]);

  // Ce que ce membre a déjà réservé dans ce domaine.
  const ids = (cuvees || []).map((c) => c.id);
  const { data: mine } = ids.length
    ? await supabase
        .from("reservations")
        .select("cuvee_id, quantity")
        .eq("member_id", member.id)
        .eq("status", "en_attente")
        .in("cuvee_id", ids)
    : { data: [] };
  const reservedByCuvee = {};
  (mine || []).forEach((r) => (reservedByCuvee[r.cuvee_id] = (reservedByCuvee[r.cuvee_id] || 0) + r.quantity));

  const reserved = progress?.reserved_bottles || 0;
  const participants = progress?.participants || 0;
  const st = displayStatus(domain, reserved);
  const today = new Date().toISOString().slice(0, 10);
  const pastDeadline = domain.deadline && domain.deadline < today;
  const editable = ["ouvert", "bientot_atteint"].includes(domain.status) && !pastDeadline;
  const closedLabel = pastDeadline ? "Réservations closes" : CLOSED[domain.status] || "Réservations closes";

  const groups = COLOR_ORDER.map((c) => ({ color: c, items: (cuvees || []).filter((x) => x.color === c) })).filter(
    (g) => g.items.length
  );
  const favorites = (cuvees || []).filter((c) => c.is_favorite);
  const deadline = domain.deadline
    ? new Date(domain.deadline).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
    : null;

  return (
    <main className="shell">
      <ClubHeader back={{ href: "/club/selection", label: "La Sélection" }} />

      <DomainImage domain={domain} variant="hero" />

      <p className="eyebrow" style={{ textAlign: "center", marginTop: 28 }}>
        {domain.region}
        {domain.appellation ? ` · ${domain.appellation}` : ""}
      </p>
      <h1 style={{ fontSize: 34, marginTop: 10 }}>{domain.name}</h1>
      {domain.tagline && <p className="lead">{domain.tagline}</p>}
      <div className="ornament" />

      <section className="card stack">
        <div className="row">
          <p className="eyebrow">Commande groupée</p>
          <span className={`badge badge-${st.key}`}>{st.label}</span>
        </div>
        {st.key === "a_venir" ? (
          <p className="muted">Les réservations ouvriront prochainement.</p>
        ) : (
          <Gauge reserved={reserved} threshold={domain.threshold} participants={participants} />
        )}
        {deadline && <p className="muted">Date limite : {deadline}</p>}
      </section>

      {domain.story && (
        <section className="section stack">
          <h2>Pourquoi on l&apos;aime</h2>
          <p style={{ whiteSpace: "pre-line" }}>{domain.story}</p>
        </section>
      )}

      {favorites.length > 0 && (
        <section className="section stack">
          <p className="eyebrow">Coup de cœur du club</p>
          {favorites.slice(0, 2).map((c) => (
            <div className="card fav" key={c.id}>
              <div className="row">
                <h3>{c.name}</h3>
                <p className="price">{euros(c.member_price)}</p>
              </div>
              <p className="muted">
                {COLOR_LABELS[c.color]}
                {c.vintage ? ` · ${c.vintage}` : ""}
              </p>
            </div>
          ))}
        </section>
      )}

      <section className="section stack">
        <h2>Les cuvées</h2>
        {groups.length === 0 && <p className="muted">Les cuvées de ce domaine arrivent bientôt.</p>}
        {groups.map((g) => (
          <div key={g.color} className="stack">
            <p className="eyebrow">{COLOR_LABELS[g.color]}</p>
            <div className="cuvee-list">
              {g.items.map((c) => (
                <div className="cuvee" key={c.id}>
                  <div>
                    <p>
                      {c.name}
                      {c.is_favorite && <span className="heart"> ♥</span>}
                    </p>
                    <p className="muted">
                      {c.vintage || "Sans millésime"}
                      {c.description ? ` · ${c.description}` : ""}
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
              ))}
            </div>
          </div>
        ))}
        <p className="muted">Prix adhérents TTC, départ domaine.</p>
      </section>

      <section className="section">
        <DomainCartLink editable={editable && groups.length > 0} closedLabel={groups.length === 0 ? "Cuvées bientôt disponibles" : closedLabel} />
      </section>

      <footer className="foot">
        L&apos;abus d&apos;alcool est dangereux pour la santé, à consommer avec modération.
      </footer>
    </main>
  );
}
