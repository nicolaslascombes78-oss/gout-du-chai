import ClubHeader from "@/components/ClubHeader";
import SelectionList from "@/components/SelectionList";
import { requireMember, loadSelection } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Selection({ searchParams }) {
  const { supabase } = await requireMember();
  const domains = await loadSelection(supabase);
  const params = await searchParams;

  return (
    <main className="shell">
      <ClubHeader back={{ href: "/club", label: "Accueil" }} />
      <h1 style={{ fontSize: 34, marginTop: 28 }}>La Sélection</h1>
      <p className="lead">Des domaines choisis un à un, au prix adhérent.</p>
      <div className="ornament" />
      <SelectionList domains={domains} initialFilter={params?.filtre || null} />
    </main>
  );
}
