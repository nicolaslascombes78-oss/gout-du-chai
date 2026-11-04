"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Seal from "@/components/Seal";
import DomainImage from "@/components/DomainImage";
import { COLOR_LABELS, COLOR_ORDER, cardBadge, closingLabel, daysLeft, displayStatus, euros } from "@/lib/catalogue";

const QUICK = [
  { key: "bientot", label: "Bientôt atteint" },
  { key: "coeur", label: "Coups de cœur" },
  { key: "a_venir", label: "À venir" },
];
const SORTS = [
  { key: "avancees", label: "Plus avancées" },
  { key: "cloture", label: "Clôture proche" },
  { key: "nouveautes", label: "Nouveautés" },
  { key: "prix", label: "Prix croissant" },
];
const NEW_DAYS = 14;

const norm = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

function Dots({ colors, labels = false }) {
  const list = COLOR_ORDER.filter((c) => colors.includes(c));
  if (!list.length) return null;
  return (
    <span className={labels ? "cdots cdots-labels" : "cdots"}>
      {list.map((c) => (
        <span key={c} className="cdot-item">
          <i className={`cdot cdot-${c}`} aria-hidden="true" />
          {labels && COLOR_LABELS[c]}
        </span>
      ))}
    </span>
  );
}

function metaLine(d) {
  const close = closingLabel(d.deadline);
  const j = daysLeft(d.deadline);
  const urgent = j != null && j >= 0 && j <= 5;
  const parts =
    d.reserved === 0
      ? [<span key="p" className="gauge-first">Soyez le premier</span>, `seuil de ${d.threshold} bouteilles`]
      : [
          `${d.reserved} / ${d.threshold} bouteilles`,
          d.participants > 0 ? `${d.participants} membre${d.participants > 1 ? "s" : ""}` : null,
        ];
  return (
    <p className={`dcard-meta${urgent ? " is-urgent" : ""}`}>
      {parts.filter(Boolean).map((p, i) => (
        <span key={i}>
          {i > 0 && " · "}
          {p}
        </span>
      ))}
      {close && <span>{` · ${close.charAt(0).toLowerCase()}${close.slice(1)}`}</span>}
    </p>
  );
}

function DomainCard({ d }) {
  const badge = cardBadge(d, d.st);
  const hasImage = Boolean(d.photos?.[0]);
  const showSeal = d.st.key !== "a_venir" && d.threshold;
  return (
    <Link href={`/club/domaine/${d.slug}`} className="dcard">
      {hasImage && (
        <div className="dcard-media">
          <DomainImage domain={d} variant="card" />
          {showSeal && (
            <span className="dcard-seal">
              <Seal reserved={d.reserved} threshold={d.threshold} size={72} />
            </span>
          )}
        </div>
      )}
      <div className={`dcard-body${hasImage ? "" : " no-media"}`}>
        {!hasImage && showSeal && (
          <span className="dcard-seal-inline">
            <Seal reserved={d.reserved} threshold={d.threshold} size={72} />
          </span>
        )}
        <div className="dcard-top">
          <span className="dcard-region">
            {d.region}
            {d.appellation ? ` · ${d.appellation}` : ""}
          </span>
          {badge && <span className={`badge badge-${badge.key}`}>{badge.label}</span>}
        </div>
        <h3 className="dcard-name">{d.name}</h3>
        {d.tagline && <p className="dcard-tag">{d.tagline}</p>}
        <div className="dcard-row">
          <Dots colors={d.colors} labels />
          {d.minPrice != null && <span className="dcard-price">dès {euros(d.minPrice)}</span>}
        </div>
        {showSeal ? metaLine(d) : <p className="dcard-meta">Les réservations ouvriront prochainement.</p>}
      </div>
    </Link>
  );
}

function NewCard({ d }) {
  return (
    <Link href={`/club/domaine/${d.slug}`} className="ncard">
      <div className="ncard-media">
        <DomainImage domain={d} variant="cover" />
        <span className="ncard-fade" aria-hidden="true" />
        <span className="badge badge-new ncard-badge">Nouveau</span>
        <span className="ncard-title">
          <span className="ncard-region">{d.region}</span>
          <span className="ncard-name">{d.name}</span>
        </span>
        {d.threshold ? (
          <span className="ncard-seal">
            <Seal reserved={d.reserved} threshold={d.threshold} size={76} />
          </span>
        ) : null}
      </div>
      <div className="ncard-body">
        {d.tagline && <p className="dcard-tag">{d.tagline}</p>}
        {d.threshold ? metaLine(d) : null}
      </div>
    </Link>
  );
}

function Chevron() {
  return (
    <svg className="region-chevron" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 10l5 5 5-5" />
    </svg>
  );
}

export default function SelectionList({ domains, initialFilter }) {
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const [color, setColor] = useState("");
  const [quick, setQuick] = useState(QUICK.some((x) => x.key === initialFilter) ? initialFilter : "");
  const [sort, setSort] = useState("avancees");
  const [open, setOpen] = useState({});

  const regions = useMemo(
    () => [...new Set(domains.map((d) => d.region))].sort((a, b) => a.localeCompare(b, "fr")),
    [domains]
  );

  const all = useMemo(() => domains.map((d) => ({ ...d, st: displayStatus(d, d.reserved) })), [domains]);

  const fresh = useMemo(() => {
    const limit = Date.now() - NEW_DAYS * 864e5;
    return all
      .filter((d) => d.st.key !== "a_venir" && d.created_at && new Date(d.created_at).getTime() >= limit)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 6);
  }, [all]);

  const needle = norm(q.trim());
  const list = all
    .filter((d) => (quick === "a_venir" ? d.st.key === "a_venir" : d.st.key !== "a_venir"))
    .filter((d) => !region || d.region === region)
    .filter((d) => !color || d.colors.includes(color))
    .filter((d) => quick !== "bientot" || d.st.key === "bientot")
    .filter((d) => quick !== "coeur" || d.favorite)
    .filter((d) => !needle || norm([d.name, d.region, d.appellation, d.tagline].join(" ")).includes(needle));

  const pct = (d) => (d.threshold ? d.reserved / d.threshold : -1);
  const sorted = [...list].sort((a, b) => {
    if (sort === "cloture") return (daysLeft(a.deadline) ?? 9999) - (daysLeft(b.deadline) ?? 9999);
    if (sort === "nouveautes") return new Date(b.created_at) - new Date(a.created_at);
    if (sort === "prix") return (a.minPrice ?? 9999) - (b.minPrice ?? 9999);
    return pct(b) - pct(a);
  });

  // Sans recherche ni filtre, la page se lit par régions (chapitres repliés).
  const libre = !needle && !region && !color && !quick && sort === "avancees";
  const groups = regions
    .map((r) => ({ region: r, items: sorted.filter((d) => d.region === r) }))
    .filter((g) => g.items.length);

  const reset = () => {
    setQ("");
    setRegion("");
    setColor("");
    setQuick("");
    setSort("avancees");
  };
  const toggle = (setter, current, value) => setter(current === value ? "" : value);

  return (
    <div className="sel">
      <label className="sel-search">
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="10.5" cy="10.5" r="6" />
          <path d="M15 15l5 5" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Domaine, appellation, région…"
          aria-label="Rechercher un domaine, une appellation ou une région"
          enterKeyHint="search"
        />
      </label>

      <div className="sel-chips" role="group" aria-label="Filtres">
        <button
          type="button"
          className={`chip ${!color && !quick ? "on" : ""}`}
          aria-pressed={!color && !quick}
          onClick={() => {
            setColor("");
            setQuick("");
          }}
        >
          Toutes
        </button>
        {COLOR_ORDER.filter((c) => c !== "autre").map((c) => (
          <button
            key={c}
            type="button"
            className={`chip ${color === c ? "on" : ""}`}
            aria-pressed={color === c}
            onClick={() => toggle(setColor, color, c)}
          >
            <i className={`cdot cdot-${c}`} aria-hidden="true" />
            {COLOR_LABELS[c]}
          </button>
        ))}
        {QUICK.map((x) => (
          <button
            key={x.key}
            type="button"
            className={`chip ${quick === x.key ? "on" : ""}`}
            aria-pressed={quick === x.key}
            onClick={() => toggle(setQuick, quick, x.key)}
          >
            {x.label}
          </button>
        ))}
      </div>

      <div className="sel-menus">
        <label className="sel-menu">
          <span className="sel-menu-l">Région</span>
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="">Toutes</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="sel-menu">
          <span className="sel-menu-l">Trier</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {libre && fresh.length > 0 && (
        <section className="sel-section">
          <div className="sel-head">
            <h2 className="home-h2">Nouvelles maisons</h2>
            <span className="muted">Arrivées ces deux dernières semaines</span>
          </div>
          <div className="ncards">
            {fresh.map((d) => (
              <NewCard key={d.id} d={d} />
            ))}
          </div>
        </section>
      )}

      <section className="sel-section">
        <div className="sel-head sel-head-line">
          <h2 className="home-h2">{libre ? "Toutes les maisons" : "Résultats"}</h2>
          <span className="muted">{list.length}</span>
        </div>

        {libre ? (
          <div>
            {groups.map((g) => {
              const isOpen = !!open[g.region];
              const soon = g.items.filter((d) => d.st.key === "bientot").length;
              const last = g.items.filter((d) => {
                const j = daysLeft(d.deadline);
                return j != null && j >= 0 && j <= 5;
              }).length;
              const colors = [...new Set(g.items.flatMap((d) => d.colors))];
              const id = `region-${norm(g.region).replace(/[^a-z0-9]+/g, "-")}`;
              return (
                <section key={g.region} className={`chapter${isOpen ? " is-open" : ""}`}>
                  <button
                    type="button"
                    className="chapter-toggle"
                    aria-expanded={isOpen}
                    aria-controls={id}
                    onClick={() => setOpen((cur) => ({ ...cur, [g.region]: !cur[g.region] }))}
                  >
                    <span className="chapter-txt">
                      <span className="chapter-name">{g.region}</span>
                      <span className="chapter-meta">
                        <Dots colors={colors} />
                        {g.items.length} maison{g.items.length > 1 ? "s" : ""}
                        {soon > 0 && ` · ${soon} bientôt complète${soon > 1 ? "s" : ""}`}
                        {last > 0 && <span className="is-urgent">{` · derniers jours pour ${last}`}</span>}
                      </span>
                    </span>
                    <Chevron />
                  </button>
                  {isOpen && (
                    <div className="chapter-body" id={id}>
                      {g.items.map((d) => (
                        <DomainCard key={d.id} d={d} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="chapter-body">
            {sorted.map((d) => (
              <DomainCard key={d.id} d={d} />
            ))}
          </div>
        )}

        {list.length === 0 && (
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <p className="muted">Aucun domaine ne correspond à votre recherche.</p>
            <button type="button" className="link-btn story-more" onClick={reset}>
              Retirer les filtres
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
