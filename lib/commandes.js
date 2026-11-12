// Chargement et mise en forme des commandes d'un membre (accueil de l'espace et page « Mes commandes »).

const NIVEAU = { declenche: 1, expedie: 3, livre: 4 };

export async function chargerCommandes(supabase, member) {
  const { data: resa } = await supabase
    .from("reservations")
    .select(
      "id, quantity, unit_price, status, created_at, paid_at, archived, group_order_id, group_orders(triggered_at, shipped_at, delivered_at, expected_delivery), cuvees(id, name, vintage, domains(id, name, slug, status, threshold, deadline, triggered_at, shipped_at, delivered_at, expected_delivery))"
    )
    .eq("member_id", member.id)
    .in("status", ["en_attente", "confirmee", "payee"])
    .order("created_at");

  // Regroupe les bouteilles par domaine.
  const byDomain = {};
  for (const r of resa || []) {
    const d0 = r.cuvees?.domains;
    if (!d0) continue;
    // Commande passée d’un domaine rouvert depuis : affichée à part, avec ses propres dates.
    const go = r.archived ? r.group_orders : null;
    const d = go
      ? { ...d0, status: "livre", triggered_at: go.triggered_at, shipped_at: go.shipped_at, delivered_at: go.delivered_at, expected_delivery: go.expected_delivery }
      : d0;
    const cle = go ? `${d0.id}:${r.group_order_id}` : d0.id;
    const g = (byDomain[cle] ||= { cle, archive: !!go, domain: d, lines: [], bottles: 0, total: 0, reservedAt: null, paidAt: null });
    g.lines.push(r);
    g.bottles += r.quantity;
    g.total += r.quantity * Number(r.unit_price);
    if (r.created_at && (!g.reservedAt || r.created_at < g.reservedAt)) g.reservedAt = r.created_at;
    if (r.paid_at && (!g.paidAt || r.paid_at > g.paidAt)) g.paidAt = r.paid_at;
  }
  // Le débit a lieu au déclenchement : une date de paiement antérieure est ramenée à celle du déclenchement.
  for (const g of Object.values(byDomain)) {
    const t = g.domain.triggered_at;
    if (g.paidAt && t && new Date(g.paidAt) < new Date(t)) g.paidAt = t;
  }
  const groups = Object.values(byDomain);

  const ids = groups.map((g) => g.domain.id);
  const { data: prog } = ids.length
    ? await supabase.from("domain_progress").select("domain_id, reserved_bottles, participants").in("domain_id", ids)
    : { data: [] };
  const progress = Object.fromEntries((prog || []).map((p) => [p.domain_id, p]));

  const estPassee = (g) => g.archive || g.domain.status === "livre" || g.domain.status === "expire";
  const enCours = groups.filter((g) => !estPassee(g));
  const passees = groups
    .filter(estPassee)
    .sort((a, b) => String(b.domain.delivered_at || "").localeCompare(String(a.domain.delivered_at || "")));

  return { groups, progress, enCours, passees };
}

// Statut lisible d'une commande en cours, en une phrase, et position sur la barre (1 à 5).
export function statutCommande(d, p = {}, paid, bottles) {
  const niveau = NIVEAU[d.status] || 0;
  const reserved = p.reserved_bottles || 0;
  const atteint = d.threshold ? reserved >= d.threshold : false;
  const membres = p.participants || 0;
  if (niveau === 0 && !atteint) {
    const manque = d.threshold ? Math.max(d.threshold - reserved, 0) : 0;
    return {
      etape: 1,
      texte: d.threshold ? `En attente du seuil · il manque ${manque} bt` : "Réservation enregistrée",
      sous: d.threshold
        ? `${reserved} / ${d.threshold} bouteilles réunies, dont ${bottles} à vous. Aucun débit avant le déclenchement.`
        : "Aucun débit avant le déclenchement.",
      atteint,
    };
  }
  if (niveau === 0) {
    return {
      etape: 2,
      texte: "Seuil atteint · déclenchement en cours",
      sous: `${reserved} / ${d.threshold} bouteilles réunies par ${membres} membre${membres > 1 ? "s" : ""}. Votre carte sera débitée au déclenchement.`,
      atteint,
    };
  }
  if (niveau === 1 && !paid) {
    return { etape: 3, texte: "Déclenchée · paiement en cours", sous: "Le domaine prépare la commande.", atteint: true };
  }
  if (niveau === 1) {
    return { etape: 4, texte: "Payée · expédition à venir", sous: "Le domaine prépare la commande.", atteint: true };
  }
  return { etape: 5, texte: "En route vers vous", sous: null, atteint: true };
}

// Résumé d'une commande sur une ligne : « Crémant zéro dosage 2022 · 2 bt » ou « 3 cuvées · 8 bt ».
export function resumeCommande(g) {
  if (g.lines.length === 1) {
    const c = g.lines[0].cuvees;
    return `${c.name}${c.vintage ? ` ${c.vintage}` : ""} · ${g.bottles} bt`;
  }
  return `${g.lines.length} cuvées · ${g.bottles} bt`;
}

// Commande la plus avancée d'abord : c'est celle qu'on montre sur l'accueil.
export function plusAvancee(enCours, progress) {
  return [...enCours].sort((a, b) => {
    const pa = a.lines.every((r) => r.status === "payee");
    const pb = b.lines.every((r) => r.status === "payee");
    return (
      statutCommande(b.domain, progress[b.domain.id], pb, b.bottles).etape -
      statutCommande(a.domain, progress[a.domain.id], pa, a.bottles).etape
    );
  })[0];
}
