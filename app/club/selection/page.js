import ClubHeader from "@/components/ClubHeader";
import SelectionList from "@/components/SelectionList";
import { requireMember, loadSelection } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Selection({ searchParams }) {
  const { supabase } = await requireMember();
  const domains = await loadSelection(supabase);
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
