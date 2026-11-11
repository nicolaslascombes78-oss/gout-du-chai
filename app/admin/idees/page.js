import Link from "next/link";
import "@/app/ergonomie.css";
import { requireAdmin } from "@/lib/data";
import { updateIdee } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

const TYPES = { envie: "🍷 Envie", idee: "💡 Idée", probleme: "⚠️ Problème" };
const STATUTS = [
  ["nouveau", "Nouveau"],
  ["lu", "Lu"],
  ["prevu", "Prévu"],
  ["fait", "Fait"],
];

const quand = (iso) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    timeZone: "Europe/Paris",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

// Admin : la boîte à idées des membres, avec statut et note interne.
export default async function IdeesAdmin({ searchParams }) {
  const sp = await searchParams;
  const { supabase } = await requireAdmin();
  const type = Object.keys(TYPES).includes(sp?.type) ? sp.type : "";
  const statut = STATUTS.some(([v]) => v === sp?.statut) ? sp.statut : "";

  let req = supabase
    .from("feedbacks")
    .select("id, member_id, kind, message, sujet, page, status, admin_note, created_at, done_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (type) req = req.eq("kind", type);
  if (statut) req = req.eq("status", statut);

  const [{ data: avis }, { data: tous }] = await Promise.all([req, supabase.from("feedbacks").select("status")]);
  const liste = avis || [];
  const ids = [...new Set(liste.map((a) => a.member_id))];
  const { data: membres } = ids.length
    ? await supabase.from("members").select("id, first_name, last_name").in("id", ids)
    : { data: [] };
  const nom = Object.fromEntries((membres || []).map((m) => [m.id, `${m.first_name} ${m.last_name}`]));
  const total = (tous || []).length;
  const nouveaux = (tous || []).filter((a) => a.status === "nouveau").length;

  const lien = (t, s) => {
    const p = new URLSearchParams();
    if (t) p.set("type", t);
    if (s) p.set("statut", s);
    const qs = p.toString();
    return `/admin/idees${qs ? `?${qs}` : ""}`;
  };

  return (
    <main className="shell">
      <h1 style={{ fontSize: 30, marginTop: 24 }}>Boîte à idées</h1>
      <p className="lead">
        {total} message{total > 1 ? "s" : ""} reçu{total > 1 ? "s" : ""}
        {nouveaux > 0 ? `, dont ${nouveaux} nouveau${nouveaux > 1 ? "x" : ""}` : ""}.
      </p>
      {sp?.ok && (
        <p className="success" role="status">
          Message mis à jour.
        </p>
      )}
      {sp?.erreur && (
        <p className="error" role="alert">
          La mise à jour a échoué. Réessayez.
        </p>
      )}

      <nav className="idee-filtres" aria-label="Filtrer par type">
        <Link href={lien("", statut)} className={!type ? "on" : ""}>
          Tous
        </Link>
        {Object.entries(TYPES).map(([v, t]) => (
          <Link key={v} href={lien(v, statut)} className={type === v ? "on" : ""}>
            {t}
          </Link>
        ))}
      </nav>
      <nav className="idee-filtres" aria-label="Filtrer par statut">
        <Link href={lien(type, "")} className={!statut ? "on" : ""}>
          Tous statuts
        </Link>
        {STATUTS.map(([v, t]) => (
          <Link key={v} href={lien(type, v)} className={statut === v ? "on" : ""}>
            {t}
          </Link>
        ))}
      </nav>

      {liste.length === 0 ? (
        <p className="muted" style={{ marginTop: 20 }}>
          Aucun message ici pour l&apos;instant.
        </p>
      ) : (
        <div className="stack" style={{ marginTop: 16 }}>
          {liste.map((a) => (
            <article key={a.id} id={`a-${a.id}`} className={`card idee-item idee-${a.status}`}>
              <div className="row">
                <strong>{TYPES[a.kind] || a.kind}</strong>
                <span className="muted">{quand(a.created_at)}</span>
              </div>
              <p className="muted">
                <Link href={`/admin/membres/${a.member_id}`}>{nom[a.member_id] || "Membre"}</Link>
                {a.sujet ? ` · ${a.sujet}` : ""}
                {a.page ? ` · depuis ${a.page}` : ""}
              </p>
              <p className="idee-message">{a.message}</p>
              <form action={updateIdee} className="idee-suivi">
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="retour" value={lien(type, statut)} />
                <label>
                  Statut
                  <select name="status" defaultValue={a.status}>
                    {STATUTS.map(([v, t]) => (
                      <option key={v} value={v}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Note interne
                  <textarea
                    name="admin_note"
                    rows={2}
                    defaultValue={a.admin_note || ""}
                    placeholder="Visible seulement par les administrateurs"
                  />
                </label>
                <button className="btn" type="submit">
                  Enregistrer
                </button>
              </form>
              {a.status === "fait" && a.done_at && (
                <p className="muted idee-note">
                  Marqué « Fait » le {quand(a.done_at)} : le membre en est informé sous sa cloche.
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
