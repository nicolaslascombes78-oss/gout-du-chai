import Link from "next/link";
import SousPage from "@/components/SousPage";
import { requireMember } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function Aide() {
  await requireMember();
  return (
    <SousPage titre="Aide et règles">
      <nav className="card help-links" aria-label="Aide et règles">
        <Link href="/regles">Les règles du club</Link>
        <Link href="/mentions-legales">Mentions légales</Link>
        <Link href="/confidentialite">Confidentialité</Link>
      </nav>
    </SousPage>
  );
}
