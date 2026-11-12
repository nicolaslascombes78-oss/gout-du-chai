import Link from "next/link";
import SousPage from "@/components/SousPage";
import CommandesListe from "@/components/CommandesListe";
import { requireMember } from "@/lib/data";
import { chargerCommandes } from "@/lib/commandes";

export const dynamic = "force-dynamic";

export default async function MesCommandes() {
  const { supabase, member } = await requireMember();
  const { groups, progress, enCours, passees } = await chargerCommandes(supabase, member);

  return (
    <SousPage titre="Mes commandes" intro="Aucun débit avant le déclenchement du domaine.">
      {groups.length === 0 ? (
        <div className="card stack">
          <p className="muted">Vous n&apos;avez pas encore de réservation. Choisissez vos bouteilles dans la Sélection.</p>
          <Link href="/club/selection" className="btn btn-ghost">
            Parcourir la Sélection
          </Link>
        </div>
      ) : (
        <CommandesListe enCours={enCours} passees={passees} progress={progress} />
      )}
    </SousPage>
  );
}
