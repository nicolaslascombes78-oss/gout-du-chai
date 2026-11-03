import { notFound } from "next/navigation";
import ClubHeader from "@/components/ClubHeader";
import Gauge from "@/components/Gauge";
import { requireMember } from "@/lib/data";
import { COLOR_LABELS, COLOR_ORDER, displayStatus, euros } from "@/lib/catalogue";

export const dynamic = "force-dynamic";

export default async function Domaine({ params }) {
  const { slug } = await params;
  const { supabase } = await requireMember();

  const { data: domain } = await supabase
    .from("domains")
    .select("id, slug, name, region, appellation, tagline, story, photos, threshold, pack_size, deadline, status")
    .eq("slug", slug)
    .maybeSingle();
  if (!domain) notFound();

  const [{ data: cuvees }, { data: progress }] = await Promise.all([
    supabase
      .from("cuvees")
      .select("id, name, vintage, color, member_price, description, is_favorite")
      .eq("domain_id", domain.id)
      .eq("active", true)
      .order("member_price"),
    supabase.from("domain_progress").select("reserved_bottles, participants").eq("domain_id", domain.id).maybeSingle(),
  ]);

  const reserved = progress?.reserved_bottles || 0;
  const participants = progress?.participants || 0;
  const st = displayStatus(domain, reserved);
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

      {domain.photos?.[0] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={domain.photos[0]} alt={domain.name} className="hero-img" />
      )}

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
                  <p className="price">{euros(c.member_price)}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
        <p className="muted">Prix adhérents TTC, départ domaine.</p>
      </section>

      <section className="section">
        <button className="btn" disabled>
          Réservation bientôt disponible
        </button>
      </section>

      <footer className="foot">
        L&apos;abus d&apos;alcool est dangereux pour la santé, à consommer avec modération.
      </footer>
    </main>
  );
}
