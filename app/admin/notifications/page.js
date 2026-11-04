import { requireAdmin } from "@/lib/data";
import { envoyerNotification } from "./actions";

export const dynamic = "force-dynamic";

const ERREURS = {
  cles: "Les clés des notifications sont absentes des variables Vercel.",
  lecture: "Impossible de lire les abonnements : le script SQL administrateur a-t-il été lancé ?",
  domaine: "Domaine introuvable.",
  seuil: "Ce domaine n'a pas de seuil, ou l'a déjà atteint.",
  reservataires: "Aucun membre n'a de réservation en cours sur ce domaine.",
  type: "Type de message inconnu.",
};

function Confirmation() {
  return (
    <label className="check">
      <input type="checkbox" required /> Je confirme l&apos;envoi
    </label>
  );
}

export default async function Notifications({ searchParams }) {
  const { supabase } = await requireAdmin();
  const params = await searchParams;

  const [{ count }, { data: domains }, { data: progress }] = await Promise.all([
    supabase.from("push_subscriptions").select("id", { count: "exact", head: true }),
    supabase.from("domains").select("id, name, status, threshold").order("name"),
    supabase.from("domain_progress").select("domain_id, reserved_bottles"),
  ]);

  const reserve = Object.fromEntries((progress || []).map((p) => [p.domain_id, p.reserved_bottles]));
  const tous = domains || [];
  const ouverts = tous.filter((d) => ["a_venir", "ouvert", "bientot_atteint"].includes(d.status));
  const aRelancer = tous
    .filter((d) => ["ouvert", "bientot_atteint"].includes(d.status) && d.threshold)
    .map((d) => ({ ...d, reste: Math.max(0, d.threshold - (reserve[d.id] || 0)) }))
    .filter((d) => d.reste > 0)
    .sort((a, b) => a.reste - b.reste);
  const declenches = tous.filter((d) => d.status === "declenche");

  const envoye = params?.envoye;
  const echec = Number(params?.echec || 0);

  return (
    <main className="shell">
      <p className="brand">Le Goût du Chai</p>
      <h1>Notifications</h1>
      <p className="lead">
        {count || 0} appareil{count > 1 ? "s" : ""} abonné{count > 1 ? "s" : ""}.
      </p>
      <div className="ornament" />

      {envoye !== undefined && (
        <p className="success" style={{ textAlign: "center" }}>
          Envoyée à {envoye} appareil{Number(envoye) > 1 ? "s" : ""}
          {echec > 0 ? ` (${echec} non joignable${echec > 1 ? "s" : ""})` : ""}.
        </p>
      )}
      {params?.erreur && (
        <p className="error" style={{ textAlign: "center" }}>
          {ERREURS[params.erreur] || "L'envoi n'a pas abouti."}
        </p>
      )}

      <section className="section stack">
        <h2>Essai</h2>
        <form action={envoyerNotification} className="card stack">
          <input type="hidden" name="type" value="test" />
          <p className="muted">Envoie une notification d&apos;essai sur vos propres appareils uniquement.</p>
          <button className="btn btn-ghost">M&apos;envoyer un essai</button>
        </form>
      </section>

      <section className="section stack">
        <h2>Nouveau domaine</h2>
        <form action={envoyerNotification} className="card stack">
          <input type="hidden" name="type" value="nouveau" />
          <p className="muted">À tous les membres abonnés : « [Domaine] rejoint la Sélection. »</p>
          <select name="domain_id" className="select" required defaultValue="">
            <option value="" disabled>Choisir un domaine</option>
            {ouverts.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <Confirmation />
          <button className="btn">Prévenir tous les membres</button>
        </form>
      </section>

      <section className="section stack">
        <h2>Seuil bientôt atteint</h2>
        <form action={envoyerNotification} className="card stack">
          <input type="hidden" name="type" value="relance" />
          <p className="muted">À tous les membres abonnés : « Plus que [N] bouteilles pour déclencher la commande. »</p>
          {aRelancer.length === 0 ? (
            <p className="muted">Aucun domaine ouvert avec un seuil à atteindre.</p>
          ) : (
            <>
              <select name="domain_id" className="select" required defaultValue="">
                <option value="" disabled>Choisir un domaine</option>
                {aRelancer.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} — plus que {d.reste}
                  </option>
                ))}
              </select>
              <Confirmation />
              <button className="btn">Relancer les membres</button>
            </>
          )}
        </form>
      </section>

      <section className="section stack">
        <h2>Commande déclenchée</h2>
        <form action={envoyerNotification} className="card stack">
          <input type="hidden" name="type" value="declenche" />
          <p className="muted">Uniquement aux membres qui ont réservé sur ce domaine.</p>
          {declenches.length === 0 ? (
            <p className="muted">Aucun domaine au statut « déclenché » pour le moment.</p>
          ) : (
            <>
              <select name="domain_id" className="select" required defaultValue="">
                <option value="" disabled>Choisir un domaine</option>
                {declenches.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <Confirmation />
              <button className="btn">Prévenir les réservataires</button>
            </>
          )}
        </form>
      </section>
    </main>
  );
}
