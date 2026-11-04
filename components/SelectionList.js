"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Gauge from "@/components/Gauge";
import DomainImage from "@/components/DomainImage";
import { COLOR_LABELS, COLOR_ORDER, cardBadge, displayStatus, euros } from "@/lib/catalogue";

const QUICK = [
  { key: "bientot", label: "Bientôt atteint" },
  { key: "coeur", label: "Coups de cœur" },
  { key: "nouveau", label: "Nouveautés" },
  { key: "a_venir", label: "À venir" },
];

function DomainCard({ d }) {
  const badge = cardBadge(d, d.st);
  return (
    <Link href={`/club/domaine/${d.slug}`} className="card domain-card">
      <DomainImage domain={d} variant="thumb" />
      <div className="row">
        <p className="muted">
          {d.region}
          {d.appellation ? ` · ${d.appellation}` : ""}
        </p>
        {badge && <span className={`badge badge-${badge.key}`}>{badge.label}</span>}
      </div>
      <h3>{d.name}</h3>
      {d.tagline && <p className="muted">{d.tagline}</p>}
      <div className="row" style={{ marginTop: 6 }}>
        <p className="muted">{d.colors.map((c) => COLOR_LABELS[c]).join(" · ")}</p>
        {d.minPrice != null && <p className="price">dès {euros(d.minPrice)}</p>}
      </div>
      {d.st.key !== "a_venir" && (
        <Gauge
          reserved={d.reserved}
          threshold={d.threshold}
          participants={d.participants}
          deadline={d.deadline}
          showDeadline
        />
      )}
    </Link>
  );
}

function Chevron() {
  return (
    <svg
      className="region-chevron"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 10l5 5 5-5" />
    </svg>
  );
}

export default function SelectionList({ domains, initialFilter }) {
  const [region, setRegion] = useState("");
  const [color, setColor] = useState("");
  const [quick, setQuick] = useState(QUICK.some((q) => q.key === initialFilter) ? initialFilter : "");
  const [open, setOpen] = useState({});

  const regions = useMemo(
    () => [...new Set(domains.map((d) => d.region))].sort((a, b) => a.localeCompare(b, "fr")),
    [domains]
  );

  const newest = useMemo(() => {
    const sorted = [...domains].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return new Set(sorted.slice(0, 6).map((d) => d.id));
  }, [domains]);

  const list = domains
    .map((d) => ({ ...d, st: displayStatus(d, d.reserved) }))
    .filter((d) => (quick === "a_venir" ? d.st.key === "a_venir" : d.st.key !== "a_venir"))
    .filter((d) => !region || d.region === region)
    .filter((d) => !color || d.colors.includes(color))
    .filter((d) => quick !== "bientot" || d.st.key === "bientot")
    .filter((d) => quick !== "coeur" || d.favorite)
    .filter((d) => quick !== "nouveau" || newest.has(d.id));

  // Sans aucun filtre, les régions sont repliées : la page reste courte.
  const libre = !region && !color && !quick;
  const groups = regions
    .map((r) => ({ region: r, items: list.filter((d) => d.region === r) }))
    .filter((g) => g.items.length);

  const toggle = (setter, current, value) => setter(current === value ? "" : value);
  const reset = () => {
    setRegion("");
    setColor("");
    setQuick("");
  };

  return (
    <div className="stack">
      <select className="select" value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Région">
        <option value="">Toutes les régions</option>
        {regions.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      <div className="chips">
        {COLOR_ORDER.filter((c) => c !== "autre").map((c) => (
          <button
            key={c}
            type="button"
            className={`chip ${color === c ? "on" : ""}`}
            aria-pressed={color === c}
            onClick={() => toggle(setColor, color, c)}
          >
            {COLOR_LABELS[c]}
          </button>
        ))}
      </div>
      <div className="chips">
        {QUICK.map((q) => (
          <button
            key={q.key}
            type="button"
            className={`chip ${quick === q.key ? "on" : ""}`}
            aria-pressed={quick === q.key}
            onClick={() => toggle(setQuick, quick, q.key)}
          >
            {q.label}
          </button>
        ))}
      </div>

      <p className="muted">
        {list.length} domaine{list.length > 1 ? "s" : ""}
      </p>

      {libre ? (
        <div className="regions">
          {groups.map((g) => {
            const isOpen = !!open[g.region];
            const soon = g.items.filter((d) => d.st.key === "bientot").length;
            const id = `region-${g.region.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
            return (
              <section key={g.region} className={`region-group${isOpen ? " is-open" : ""}`}>
                <button
                  type="button"
                  className="region-toggle"
                  aria-expanded={isOpen}
                  aria-controls={id}
                  onClick={() => setOpen({ ...open, [g.region]: !isOpen })}
                >
                  <span className="region-name">{g.region}</span>
                  <span className="region-meta">
                    {g.items.length} domaine{g.items.length > 1 ? "s" : ""}
                    {soon > 0 && (
                      <>
                        {" · "}
                        <strong>
                          {soon} bientôt atteint{soon > 1 ? "s" : ""}
                        </strong>
                      </>
                    )}
                  </span>
                  <Chevron />
                </button>
                {isOpen && (
                  <div className="region-body" id={id}>
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
        list.map((d) => <DomainCard key={d.id} d={d} />)
      )}

      {list.length === 0 && (
        <div style={{ textAlign: "center" }}>
          <p className="muted">Aucun domaine ne correspond à ces filtres.</p>
          <button type="button" className="link-btn story-more" onClick={reset}>
            Retirer les filtres
          </button>
        </div>
      )}
    </div>
  );
}
