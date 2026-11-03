import { requireAdmin, ACTIVE_RESERVATION } from "@/lib/data";
import { updateMember } from "@/app/admin/actions";

export default async function AdminMembres({ searchParams }) {
  const sp = await searchParams;
  const { supabase, member: me } = await requireAdmin();
  const [{ data: members }, { data: resa }] = await Promise.all([
    supabase
      .from("members")
      .select("id, member_number, first_name, last_name, email, phone, created_at, invites_left, status, is_admin, sponsor_id")
      .order("member_number"),
    supabase.from("reservations").select("member_id, quantity").in("status", ACTIVE_RESERVATION),
  ]);

  const bottles = {};
  (resa || []).forEach((r) => (bottles[r.member_id] = (bottles[r.member_id] || 0) + r.quantity));
  const names = Object.fromEntries((members || []).map((m) => [m.id, `${m.first_name} ${m.last_name}`]));

  return (
    <main className="shell">
      <h1 style={{ fontSize: 30, marginTop: 24 }}>Membres</h1>
      <p className="lead">
        {(members || []).length} membre{(members || []).length > 1 ? "s" : ""}
      </p>
      <div className="ornament" />
      {sp?.ok && <p className="success">Membre mis à jour.</p>}
      {sp?.erreur && <p className="error">La mise à jour a échoué.</p>}

      <section className="stack">
        {(members || []).map((m) => (
          <div className="card stack" key={m.id}>
            <div className="row">
              <h3>
                {m.first_name} {m.last_name}
              </h3>
              <p className="muted nowrap">n° {String(m.member_number).padStart(3, "0")}</p>
            </div>
            <p className="muted">
              {m.email}
              {m.phone ? ` · ${m.phone}` : ""}
            </p>
            <p className="muted">
              Depuis le {new Date(m.created_at).toLocaleDateString("fr-FR")}
              {m.sponsor_id && names[m.sponsor_id] ? ` · invité par ${names[m.sponsor_id]}` : ""}
              {` · ${bottles[m.id] || 0} bouteille(s) réservée(s)`}
              {m.is_admin ? " · administrateur" : ""}
            </p>
            {m.id !== me.id && (
              <form action={updateMember} className="grid-2" style={{ alignItems: "end" }}>
                <input type="hidden" name="id" value={m.id} />
                <div>
                  <label htmlFor={`inv-${m.id}`}>Invitations</label>
                  <input id={`inv-${m.id}`} name="invites_left" type="number" min="0" defaultValue={m.invites_left} />
                </div>
                <div>
                  <label htmlFor={`st-${m.id}`}>Statut</label>
                  <select id={`st-${m.id}`} name="status" className="select" defaultValue={m.status}>
                    <option value="actif">Actif</option>
                    <option value="suspendu">Suspendu</option>
                  </select>
                </div>
                <button className="btn btn-ghost" style={{ gridColumn: "1 / -1" }}>
                  Enregistrer
                </button>
              </form>
            )}
          </div>
        ))}
      </section>
    </main>
  );
}
