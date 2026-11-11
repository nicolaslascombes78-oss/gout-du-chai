import { createAdminClient } from "@/lib/supabase/admin";

// Fil « Au club » : ce qui se passe dans le cercle, calculé à partir des données existantes.
// Aucun nom de membre n'apparaît : seulement des domaines, des quantités et des nombres.
const ACTIVES = ["en_attente", "confirmee", "payee"];
const JOUR = 86400000;

const jourParis = (d) =>
  new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

export async function loadActivity(memberId = null) {
  const db = createAdminClient();
  const maintenant = Date.now();
  const depuis = new Date(maintenant - 30 * JOUR);

  const [{ data: domains }, { data: cuvees }, { data: resas }, { data: membres }, { data: avis }] = await Promise.all([
    db
      .from("domains")
      .select("id, slug, name, region, threshold, deadline, status, created_at, triggered_at, shipped_at, delivered_at"),
    db.from("cuvees").select("id, domain_id, name"),
    db.from("reservations").select("cuvee_id, quantity, created_at").in("status", ACTIVES).order("created_at"),
    db.from("members").select("id, created_at, first_name, sponsor_id").gte("created_at", depuis.toISOString()),
    db
      .from("cuvee_reviews")
      .select("cuvee_id, rating, created_at")
      .eq("hidden", false)
      .gte("created_at", depuis.toISOString()),
  ]);

  const parId = Object.fromEntries((domains || []).map((d) => [d.id, d]));
  const domaineDe = Object.fromEntries((cuvees || []).map((c) => [c.id, c.domain_id]));
  const cuveeDe = Object.fromEntries((cuvees || []).map((c) => [c.id, c]));
  const events = [];
  const recent = (iso) => iso && new Date(iso) >= depuis;
  const lien = (d) => `/club/domaine/${d.slug}`;

  // Domaines : arrivée (regroupée par jour), lancement, expédition, livraison
  const nouveaux = {};
  for (const d of domains || []) {
    if (recent(d.created_at)) {
      const cle = jourParis(new Date(d.created_at));
      const g = (nouveaux[cle] ||= { date: d.created_at, liste: [] });
      g.liste.push(d);
      if (d.created_at > g.date) g.date = d.created_at;
    }
    if (recent(d.triggered_at))
      events.push({ date: d.triggered_at, type: "lance", titre: `Commande lancée chez ${d.name}`, texte: "Elle part chez le vigneron.", href: lien(d) });
    if (recent(d.shipped_at))
      events.push({ date: d.shipped_at, type: "expedie", titre: `Commande ${d.name} expédiée`, texte: "Les bouteilles sont en route.", href: lien(d) });
    if (recent(d.delivered_at))
      events.push({ date: d.delivered_at, type: "livre", titre: `Commande ${d.name} livrée`, texte: "Belles dégustations !", href: lien(d) });
  }

  // Un seul domaine ce jour-là : sa propre ligne ; plusieurs : une ligne qui les résume
  for (const g of Object.values(nouveaux)) {
    if (g.liste.length === 1) {
      const d = g.liste[0];
      events.push({ date: g.date, type: "nouveau", titre: `Nouveau au club : ${d.name}`, texte: d.region || "", href: lien(d) });
    } else {
      const noms = g.liste.slice(0, 3).map((d) => d.name).join(", ");
      const reste = g.liste.length - 3;
      events.push({
        date: g.date,
        type: "nouveau",
        titre: `${g.liste.length} nouveaux domaines en ligne`,
        texte: reste > 0 ? `${noms} et ${reste} autre${reste > 1 ? "s" : ""}. Voir la Sélection.` : `${noms}. Voir la Sélection.`,
        href: "/club/selection",
      });
    }
  }

  // Réservations : cumul par domaine (pour repérer le sceau qui se referme) et regroupement par jour
  const cumul = {};
  const parJour = {};
  for (const r of resas || []) {
    const id = domaineDe[r.cuvee_id];
    const d = parId[id];
    if (!d) continue;
    const avant = cumul[id] || 0;
    cumul[id] = avant + (r.quantity || 0);
    if (d.threshold && avant < d.threshold && cumul[id] >= d.threshold && recent(r.created_at)) {
      events.push({
        date: r.created_at,
        type: "sceau",
        titre: `Le sceau se referme chez ${d.name}`,
        texte: `Les ${d.threshold} bouteilles sont réunies.`,
        href: lien(d),
      });
    }
    if (new Date(r.created_at) >= new Date(maintenant - 14 * JOUR)) {
      const cle = `${id}|${jourParis(new Date(r.created_at))}`;
      const g = (parJour[cle] ||= { d, n: 0, date: r.created_at });
      g.n += r.quantity || 0;
      g.cum = cumul[id];
      if (r.created_at > g.date) g.date = r.created_at;
    }
  }
  for (const g of Object.values(parJour)) {
    if (g.n <= 0) continue;
    const seuil = g.d.threshold || 0;
    events.push({
      date: g.date,
      type: "resa",
      titre: `${g.n} bouteille${g.n > 1 ? "s" : ""} réservée${g.n > 1 ? "s" : ""} chez ${g.d.name}`,
      texte: seuil ? `${g.cum} / ${seuil} bouteilles${g.cum >= seuil ? " : le seuil est atteint" : ""}.` : "",
      href: lien(g.d),
    });
  }

  // Avis des membres : un événement par cuvée et par jour (sans nom), avec la note moyenne du jour
  const avisParJour = {};
  for (const a of avis || []) {
    const c = cuveeDe[a.cuvee_id];
    const d = c && parId[c.domain_id];
    if (!d) continue;
    const cle = `${a.cuvee_id}|${jourParis(new Date(a.created_at))}`;
    const g = (avisParJour[cle] ||= { c, d, n: 0, somme: 0, date: a.created_at });
    g.n += 1;
    g.somme += a.rating || 0;
    if (a.created_at > g.date) g.date = a.created_at;
  }
  for (const g of Object.values(avisParJour)) {
    const note = String(Math.round((g.somme / g.n) * 10) / 10).replace(".", ",");
    events.push({
      date: g.date,
      type: "avis",
      titre: g.n > 1 ? `${g.n} nouveaux avis sur ${g.c.name}` : `Nouvel avis sur ${g.c.name}`,
      texte: `${g.d.name} · ${note} / 5`,
      href: lien(g.d),
    });
  }

  // Nouveaux membres, regroupés par jour (sans nom)
  const arrivees = {};
  for (const m of membres || []) {
    // Un membre que vous avez invité : événement personnel, avec son prénom
    if (memberId && m.sponsor_id === memberId) {
      events.push({
        date: m.created_at,
        type: "filleul",
        titre: `${m.first_name} a rejoint le cercle grâce à votre invitation`,
        texte: "Merci de faire grandir le club !",
        href: null,
      });
      continue;
    }
    const cle = jourParis(new Date(m.created_at));
    const g = (arrivees[cle] ||= { n: 0, date: m.created_at });
    g.n += 1;
    if (m.created_at > g.date) g.date = m.created_at;
  }
  for (const g of Object.values(arrivees)) {
    events.push({
      date: g.date,
      type: "membres",
      titre: g.n > 1 ? `${g.n} nouveaux membres ont rejoint le cercle` : "Un nouveau membre a rejoint le cercle",
      texte: "Bienvenue !",
      href: null,
    });
  }

  // Boîte à idées : les messages de ce membre passés « Fait » par un administrateur
  if (memberId) {
    const { data: faits } = await db
      .from("feedbacks")
      .select("kind, message, done_at")
      .eq("member_id", memberId)
      .eq("status", "fait")
      .gte("done_at", depuis.toISOString());
    const TITRES = {
      envie: "Votre envie est exaucée",
      idee: "Votre idée a été réalisée",
      probleme: "Le problème que vous avez signalé est réglé",
    };
    for (const f of faits || []) {
      const extrait = f.message.length > 90 ? `${f.message.slice(0, 90).trim()}…` : f.message;
      events.push({ date: f.done_at, type: "idee", titre: TITRES[f.kind] || "Votre message a été pris en compte", texte: `« ${extrait} »`, href: null });
    }
  }

  // Deux onglets : Membres (arrivées, invités, boîte à idées) et Domaines (tout le reste)
  for (const e of events) e.onglet = ["membres", "filleul", "idee"].includes(e.type) ? "membres" : "domaines";

  // Plus récent d'abord ; à moment égal, l'événement le plus marquant en premier
  const ORDRE = { livre: 0, expedie: 1, lance: 2, sceau: 3, resa: 4, avis: 5, nouveau: 6, membres: 7 };
  events.sort((a, b) => (a.date === b.date ? (ORDRE[a.type] ?? 9) - (ORDRE[b.type] ?? 9) : a.date < b.date ? 1 : -1));

  // À ne pas manquer : commandes ouvertes qui ferment dans 5 jours ou moins
  const aujourdHui = jourParis(new Date(maintenant));
  const aVenir = [];
  for (const d of domains || []) {
    if (!["ouvert", "bientot_atteint"].includes(d.status) || !d.deadline || !d.threshold) continue;
    const jours = Math.round((new Date(`${d.deadline}T12:00:00Z`) - new Date(`${aujourdHui}T12:00:00Z`)) / JOUR);
    const manque = Math.max(0, d.threshold - (cumul[d.id] || 0));
    if (jours >= 0 && jours <= 5 && manque > 0) aVenir.push({ slug: d.slug, name: d.name, jours, manque });
  }
  aVenir.sort((a, b) => a.jours - b.jours || a.manque - b.manque);

  return { events: events.slice(0, 80), aVenir, latest: events[0]?.date || null };
}
