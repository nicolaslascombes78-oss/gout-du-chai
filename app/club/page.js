import Link from "next/link";
import ClubHeader from "@/components/ClubHeader";
import Gauge from "@/components/Gauge";
import { requireMember, loadSelection } from "@/lib/data";
import { COLOR_LABELS, displayStatus, euros } from "@/lib/catalogue";

export const dynamic = "force-dynamic";

export default async function Club() {
  const { supabase, member } = await requireMember();
  const domains = await loadSelection(supabase);

  const { data: favs } = await supabase
    .from("cuvees")
    .select("id, name, vintage, color, member_price, domains(name, slug)")
    .eq("is_favorite", true)
    .eq("active", true)
    .limit(60);

  // Un coup de cœur par domaine et par couleur, 6 au maximum.
  const seen = new Set();
  const coups = (favs || []).filter((c) => {
    const k = `${c.domains?.slug}-${c.color}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 6);

  const withStatus = domains.map((d) => ({ ...d, st: displayStatus(d, d.reserved) }));
  const open = withStatus.filter((d) => d.st.key !== "a_venir");
  const hot = [...open].filter((d) => d.threshold).sort((a, b) => b.reserved / b.threshold - a.reserved / a.threshold).slice(0, 3);

  const numero = String(member.member_number).padStart(3, "0");
  const since = new Date(member.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <main className="shell">
      <ClubHeader />

      <h1 style={{ fontSize: 32 }}>Bienvenue {member.first_name}</h1>
      <div className="ornament" />

      <section className="member-card stack">
        <p className="eyebrow">Carte de membre</p>
        <p className="num">N° {numero}</p>
        <div className="row">
          <p>
            {member.first_name} {member.last_name}
          </p>
          <p className="muted">Membre depuis {since}</p>
        </div>
        <p className="muted">
          {member.invites_left} invitation{member.invites_left > 1 ? "s" : ""} à offrir
        </p>
      </section>

      <section className="section">
        <Link href="/club/selection" className="btn">
          Découvrir la Sélection · {open.length} domaines
        </Link>
      </section>

      {coups.length > 0 && (
        <section className="section stack">
          <p className="eyebrow">Les coups de cœur du club</p>
          <div className="scroller">
            {coups.map((c) => (
              <Link href={`/club/domaine/${c.domains.slug}`} className="card mini" key={c.id}>
                <p className="muted">{COLOR_LABELS[c.color]}</p>
                <h3>{c.name}</h3>
                <p className="muted">{c.domains.name}</p>
                <p className="price" style={{ marginTop: 8 }}>
                  {euros(c.member_price)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="section stack">
        <div className="row">
          <p className="eyebrow">Les commandes les plus avancées</p>
          <Link href="/club/selection?filtre=bientot" className="muted">
            Tout voir
          </Link>
        </div>
        {hot.map((d) => (
          <Link href={`/club/domaine/${d.slug}`} className="card domain-card" key={d.id}>
            <p className="muted">{d.region}</p>
            <h3>{d.name}</h3>
            <Gauge reserved={d.reserved} threshold={d.threshold} participants={d.participants} />
          </Link>
        ))}
      </section>

      <footer className="foot">
        L&apos;abus d&apos;alcool est dangereux pour la santé, à consommer avec modération.
      </footer>
    </main>
  );
}
