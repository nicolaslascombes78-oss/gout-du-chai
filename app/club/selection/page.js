import ClubHeader from "@/components/ClubHeader";
import SelectionList from "@/components/SelectionList";
import { requireMember, loadSelection } from "@/lib/data";
import { texteRecommandation } from "@/lib/avis";

export const dynamic = "force-dynamic";

// « Recommandé par 9 membres sur 10 » pour chaque domaine qui a assez de réponses.
async function recommandations(supabase) {
  const { data } = await supabase
    .from("domain_reviews")
    .select("domain_id, verdict")
    .neq("verdict", "ignore")
    .eq("hidden", false);
  const parDomaine = {};
  for (const r of data || []) {
    const c = (parDomaine[r.domain_id] ||= { oui: 0, total: 0 });
    c.total += 1;
    if (r.verdict === "oui") c.oui += 1;
  }
  return Object.fromEntries(
    Object.entries(parDomaine).map(([id, c]) => [id, texteRecommandation(c.oui, c.total)])
  );
}

export default async function Selection({ searchParams }) {
  const { supabase } = await requireMember();
  const [liste, recos] = await Promise.all([loadSelection(supabase), recommandations(supabase)]);
  const domains = liste.map((d) => ({ ...d, recommandation: recos[d.id] || null }));
  const params = await searchParams;
  const ouverts = domains.filter((d) => d.status !== "a_venir").length;

  return (
    <main className="shell sel-page">
      <ClubHeader back={{ href: "/club", label: "Accueil" }} />
      <h1 className="sel-title">La Sélection</h1>
      <p className="sel-intro">
        {ouverts > 1 ? `${ouverts} maisons, choisies une à une.` : "Des maisons choisies une à une."} Chaque commande part
        quand son sceau se referme.
      </p>
      <SelectionList domains={domains} initialFilter={params?.filtre || null} />
    </main>
  );
}
