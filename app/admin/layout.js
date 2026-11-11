import Link from "next/link";
import { requireAdmin } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
  await requireAdmin();
  return (
    <div className="admin">
      <nav className="admin-nav" aria-label="Administration">
        <Link href="/admin">Domaines</Link>
        <Link href="/admin/invitations">Invitations</Link>
        <Link href="/admin/membres">Membres</Link>
        <Link href="/admin/idees">Idées</Link>
        <Link href="/admin/avis">Avis</Link>
        <Link href="/admin/notifications">Notifications</Link>
        <Link href="/club" className="muted">
          Retour au club
        </Link>
      </nav>
      {children}
    </div>
  );
}
