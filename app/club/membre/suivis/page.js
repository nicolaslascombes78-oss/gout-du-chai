import Link from "next/link";
import SousPage from "@/components/SousPage";
import { requireMember } from "@/lib/data";

export const dynamic = "force-dynamic";

const STATUT_SUIVI = {
  a_venir: "Bientôt",
  ouvert: "Ouvert",
  bientot_atteint: "Ouvert",
  declenche: "Déclenché",
  expedie: "Expédié",
  livre: "Livré",
  expire: "Clos",
};

export default async function DomainesSuivis() {
  const { supabase, member } = await requireMember();
  const { data: suivis } = await supabase
    .from("domain_follows")
    .select("created_at, domains(id, name, slug, status)")
    .eq("member_id", member.id)
    .order("created_at", { ascending: false });
  const domaines = (suivis || []).map((f) => f.domains).filter(Boolean);

  return (
    <SousPage titre="Domaines suivis" intro="Vous êtes prévenu dès qu'un de ces domaines ouvre une nouvelle commande.">
      {domaines.length === 0 ? (
        <div className="card stack">
          <p className="muted">
            Touchez « Suivre ce domaine » sur la fiche d&apos;un domaine pour être prévenu de sa prochaine commande.
          </p>
          <Link href="/club/selection" className="btn btn-ghost">
            Parcourir la Sélection
          </Link>
        </div>
      ) : (
        <div className="card stack">
          {domaines.map((d) => (
            <div className="row" key={d.id}>
              <Link href={`/club/domaine/${d.slug}`}>★ {d.name}</Link>
              <span className="muted">{STATUT_SUIVI[d.status] || ""}</span>
            </div>
          ))}
        </div>
      )}
    </SousPage>
  );
}
