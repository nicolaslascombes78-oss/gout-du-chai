import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

// Tableau de bord admin : les domaines à venir, classés par nombre de membres intéressés.
export default async function AdminInterets() {
  const db = createAdminClient();
  const [{ data: domaines }, { data: suivis }] = await Promise.all([
    db.from("domains").select("id, slug, name, region").eq("status", "a_venir").eq("is_allocation", false),
    db.from("domain_follows").select("domain_id"),
  ]);

  const nb = {};
  for (const f of suivis || []) nb[f.domain_id] = (nb[f.domain_id] || 0) + 1;
  const liste = (domaines || [])
    .map((d) => ({ ...d, n: nb[d.id] || 0 }))
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, "fr"));
  if (liste.length === 0) return null;

  return (
    <section className="interets" aria-label="Domaines à venir">
      <h2 className="afaire-titre">Domaines à venir : intérêt des membres</h2>
      <ul className="interets-liste">
        {liste.map((d) => (
          <li key={d.id}>
            <Link href={`/admin/domaine/${d.slug}`}>
              <span>
                {d.name} <span className="muted">· {d.region}</span>
              </span>
              <strong className={d.n > 0 ? "interets-n on" : "interets-n"}>
                {d.n} intéressé{d.n > 1 ? "s" : ""}
              </strong>
            </Link>
          </li>
        ))}
      </ul>
      <p className="muted interets-note">
        Quand vous passez un domaine de « À venir » à « Ouvert », ses intéressés reçoivent une notification.
      </p>
    </section>
  );
}
