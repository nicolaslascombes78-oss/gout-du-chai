import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

// Tableau de bord admin : ce qui attend une action, du plus urgent au moins urgent.
const ACTIVES = ["en_attente", "confirmee", "payee"];
const JOUR = 86400000;

const jourParis = (d) =>
  new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const ecart = (a, b) => Math.round((new Date(`${a}T12:00:00Z`) - new Date(`${b}T12:00:00Z`)) / JOUR);
const jours = (n) => `${n} jour${n > 1 ? "s" : ""}`;

export default async function AdminAFaire() {
  const db = createAdminClient();
  const [{ data: domains }, { data: cuvees }, { data: resas }, { count: nouvellesIdees }] = await Promise.all([
    db.from("domains").select("id, slug, name, status, threshold, deadline, triggered_at, shipped_at"),
    db.from("cuvees").select("id, domain_id"),
    db.from("reservations").select("cuvee_id, quantity").in("status", ACTIVES),
    db.from("feedbacks").select("id", { count: "exact", head: true }).eq("status", "nouveau"),
  ]);

  const domaineDe = Object.fromEntries((cuvees || []).map((c) => [c.id, c.domain_id]));
  const total = {};
  for (const r of resas || []) {
    const id = domaineDe[r.cuvee_id];
    if (id) total[id] = (total[id] || 0) + (r.quantity || 0);
  }

  const aujourdHui = jourParis(new Date());
  const items = [];
  for (const d of domains || []) {
    const n = total[d.id] || 0;
    const ouvert = ["ouvert", "bientot_atteint"].includes(d.status);
    const href = `/admin/domaine/${d.slug}`;

    if (ouvert && d.threshold && n >= d.threshold) {
      items.push({
        rang: 0,
        href,
        titre: `Commande à déclencher : ${d.name}`,
        texte: `${n} / ${d.threshold} bouteilles, le seuil est atteint.${
          d.deadline && ecart(aujourdHui, d.deadline) > 0 ? ` Date limite dépassée de ${jours(ecart(aujourdHui, d.deadline))}.` : ""
        }`,
      });
      continue;
    }
    if (ouvert && d.deadline) {
      const reste = ecart(d.deadline, aujourdHui);
      if (reste < 0) {
        items.push({
          rang: 1,
          href,
          titre: `Date limite dépassée : ${d.name}`,
          texte: `${n} / ${d.threshold} bouteilles depuis ${jours(-reste)}. À prolonger ou à clôturer.`,
        });
      } else if (reste <= 3) {
        items.push({
          rang: 2,
          href,
          titre: reste === 0 ? `Clôture aujourd'hui : ${d.name}` : `Clôture dans ${jours(reste)} : ${d.name}`,
          texte: `Il manque ${Math.max(0, (d.threshold || 0) - n)} bouteilles. Une relance des membres peut aider.`,
        });
      }
    }
    if (d.status === "declenche" && d.triggered_at && Date.now() - new Date(d.triggered_at) > 10 * JOUR) {
      items.push({
        rang: 3,
        href,
        titre: `Expédition à suivre : ${d.name}`,
        texte: `Commande lancée il y a ${jours(Math.floor((Date.now() - new Date(d.triggered_at)) / JOUR))}, pas encore expédiée.`,
      });
    }
    if (d.status === "expedie" && d.shipped_at && Date.now() - new Date(d.shipped_at) > 10 * JOUR) {
      items.push({
        rang: 4,
        href,
        titre: `Livraison à confirmer : ${d.name}`,
        texte: `Expédiée il y a ${jours(Math.floor((Date.now() - new Date(d.shipped_at)) / JOUR))}.`,
      });
    }
  }
  if (nouvellesIdees > 0) {
    items.push({
      rang: 2,
      href: "/admin/idees?statut=nouveau",
      titre: `${nouvellesIdees} nouveau${nouvellesIdees > 1 ? "x" : ""} message${nouvellesIdees > 1 ? "s" : ""} dans la boîte à idées`,
      texte: "Envies de vin, idées et problèmes signalés par les membres.",
    });
  }
  items.sort((a, b) => a.rang - b.rang);

  return (
    <section className="afaire" aria-label="À faire">
      <h2 className="afaire-titre">À faire</h2>
      {items.length === 0 ? (
        <p className="muted">Rien en attente : toutes les commandes suivent leur cours.</p>
      ) : (
        <ul className="afaire-liste">
          {items.map((it) => (
            <li key={it.titre}>
              <Link href={it.href} className={`afaire-item afaire-r${it.rang}`}>
                <strong>{it.titre}</strong>
                <span>{it.texte}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
