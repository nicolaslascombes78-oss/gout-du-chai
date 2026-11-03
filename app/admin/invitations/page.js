import { requireAdmin } from "@/lib/data";
import { createInvitation, disableInvitation } from "@/app/admin/actions";

const ERREURS = {
  format: "Le code ne peut contenir que des lettres, des chiffres et des tirets (4 à 30 caractères).",
  doublon: "Ce code existe déjà. Choisissez-en un autre.",
  enregistrement: "L'invitation n'a pas pu être créée.",
};

export default async function AdminInvitations({ searchParams }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const [{ data: invitations }, { data: members }] = await Promise.all([
    supabase
      .from("invitations")
      .select("id, code, max_uses, uses, expires_at, invited_email, status, created_at, issuer_id")
      .order("created_at", { ascending: false }),
    supabase.from("members").select("id, first_name"),
  ]);
  const firstNames = Object.fromEntries((members || []).map((m) => [m.id, m.first_name]));

  const now = new Date();

  return (
    <main className="shell">
      <h1 style={{ fontSize: 30, marginTop: 24 }}>Invitations</h1>
      <div className="ornament" />

      <section className="stack">
        {sp?.nouveau && (
          <div className="card stack" style={{ textAlign: "center", borderColor: "var(--gold)" }}>
            <p className="muted">Invitation créée</p>
            <p className="num-big">{sp.nouveau}</p>
            <p className="muted">À transmettre avec l&apos;adresse du club : gout-du-chai.vercel.app</p>
          </div>
        )}
        {sp?.erreur && <p className="error">{ERREURS[sp.erreur] || ERREURS.enregistrement}</p>}

        <form action={createInvitation} className="card stack">
          <h2>Nouvelle invitation</h2>
          <div>
            <label htmlFor="code">Code (laisser vide pour en générer un)</label>
            <input id="code" name="code" type="text" className="code" placeholder="CHAI-XXXXX" autoCapitalize="characters" />
          </div>
          <div className="grid-2">
            <div>
              <label htmlFor="max_uses">Utilisations</label>
              <input id="max_uses" name="max_uses" type="number" min="1" defaultValue="1" inputMode="numeric" />
            </div>
            <div>
              <label htmlFor="expires_at">Valable jusqu&apos;au</label>
              <input id="expires_at" name="expires_at" type="date" />
            </div>
          </div>
          <div>
            <label htmlFor="invited_email">Pour qui ? (e-mail, facultatif)</label>
            <input id="invited_email" name="invited_email" type="email" inputMode="email" />
          </div>
          <button className="btn">Créer l&apos;invitation</button>
        </form>
      </section>

      <section className="section stack">
        <h2>Toutes les invitations</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Utilisée</th>
                <th>État</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(invitations || []).map((i) => {
                const expired = i.expires_at && new Date(i.expires_at) < now;
                const full = i.uses >= i.max_uses;
                const state = i.status === "desactivee" ? "Désactivée" : expired ? "Expirée" : full ? "Épuisée" : "Valable";
                return (
                  <tr key={i.id}>
                    <td>
                      <strong>{i.code}</strong>
                      <div className="muted">
                        {i.invited_email || (firstNames[i.issuer_id] ? `par ${firstNames[i.issuer_id]}` : "")}
                      </div>
                    </td>
                    <td className="nowrap">
                      {i.uses} / {i.max_uses}
                    </td>
                    <td className="nowrap">
                      {state}
                      {i.expires_at && state === "Valable" ? (
                        <div className="muted">
                          jusqu&apos;au {new Date(i.expires_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      {state === "Valable" && (
                        <form action={disableInvitation}>
                          <input type="hidden" name="id" value={i.id} />
                          <button className="link-btn">Désactiver</button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
