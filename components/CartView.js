"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearLines, readCart, reservationError, useCart } from "@/lib/cart";
import { euros } from "@/lib/catalogue";
import { lancerPaillettes } from "@/lib/paillettes";
import CuveeStepper from "@/components/CuveeStepper";
import Gauge from "@/components/Gauge";

export default function CartView({ memberId, hasCard = true }) {
  const router = useRouter();
  const { cart, ready } = useCart();
  const [rows, setRows] = useState(null); // cuvées chargées à l'ouverture
  const [current, setCurrent] = useState({}); // déjà réservé, par cuvée
  const [progress, setProgress] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Cuvées à afficher : les réservations en cours du membre + les lignes modifiées du panier.
  // Chargées à l'ouverture, puis complétées si une nouvelle cuvée arrive dans le panier.
  const manquantes = rows === null ? null : Object.keys(cart).filter((id) => !rows.some((c) => c.id === id));
  const cleManquantes = manquantes === null ? "init" : manquantes.sort().join(",");

  useEffect(() => {
    if (!ready) return;
    if (rows !== null && manquantes.length === 0) return;
    const supabase = createClient();
    (async () => {
      // Réservations en cours (tour actuel, pas encore parties chez le vigneron)
      const { data: resa } = await supabase
        .from("reservations")
        .select("cuvee_id, quantity, group_order_id, archived")
        .eq("member_id", memberId)
        .eq("status", "en_attente");
      const enCours = (resa || []).filter((r) => !r.group_order_id && !r.archived);
      const cur = {};
      enCours.forEach((r) => (cur[r.cuvee_id] = (cur[r.cuvee_id] || 0) + r.quantity));

      const ids = [...new Set([...Object.keys(cur), ...Object.keys(readCart())])];
      if (ids.length === 0) {
        setCurrent({});
        setRows([]);
        return;
      }
      const { data: cuvees } = await supabase
        .from("cuvees")
        .select("id, name, vintage, member_price, pack_size, domains(id, name, slug, threshold, status, deadline)")
        .in("id", ids);
      // Réservations : seulement les domaines encore ouverts (les autres sont dans l'espace Membre)
      const today = new Date().toISOString().slice(0, 10);
      const visibles = (cuvees || []).filter((c) => {
        if (readCart()[c.id]) return true;
        const d = c.domains;
        return ["ouvert", "bientot_atteint"].includes(d.status) && (!d.deadline || d.deadline >= today);
      });
      const domainIds = [...new Set(visibles.map((c) => c.domains.id))];
      const { data: prog } = domainIds.length
        ? await supabase.from("domain_progress").select("domain_id, reserved_bottles, participants").in("domain_id", domainIds)
        : { data: [] };
      setCurrent(cur);
      setProgress(Object.fromEntries((prog || []).map((p) => [p.domain_id, p])));
      setRows(visibles);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, cleManquantes]);

  const groups = useMemo(() => {
    const byDomain = {};
    for (const c of rows || []) {
      const d = c.domains;
      const g = (byDomain[d.id] ||= { domain: d, items: [], subtotal: 0, delta: 0 });
      const before = current[c.id] || 0;
      const qty = cart[c.id] ? cart[c.id].qty : before;
      g.items.push({ ...c, before, qty });
      g.subtotal += qty * Number(c.member_price);
      g.delta += qty - before;
    }
    return Object.values(byDomain);
  }, [rows, cart, current]);

  const changes = Object.keys(cart).length;
  const total = groups.reduce((s, g) => s + g.subtotal, 0);
  const bottles = groups.reduce((s, g) => s + g.items.reduce((n, c) => n + c.qty, 0), 0);

  // Nature des modifications : ajouts, retraits, ou les deux
  const lignes = groups.flatMap((g) => g.items);
  const ajoute = lignes.some((c) => c.qty > c.before);
  const retire = lignes.some((c) => c.qty < c.before);
  const annulationSeule = retire && !ajoute && bottles === 0; // tout le panier repasse à zéro
  const libelleBouton = annulationSeule
    ? "Annuler ces réservations"
    : retire
      ? "Enregistrer les modifications"
      : "Réserver mes bouteilles";

  async function confirm(e) {
    // Position du bouton, d'où partiront les paillettes
    const origine = e?.currentTarget?.getBoundingClientRect?.() || null;
    setError("");
    setSaving(true);
    const items = Object.entries(cart).map(([cuvee_id, l]) => ({ cuvee_id, quantity: l.qty }));
    const supabase = createClient();
    const { error } = await supabase.rpc("save_reservations", { p_items: items });
    if (error) {
      setSaving(false);
      setError(reservationError(error));
      return;
    }
    // Paillettes d'or seulement si le membre ajoute des bouteilles (pas pour un retrait ou une annulation)
    if (ajoute) lancerPaillettes(origine);
    clearLines();
    // Simple retrait : retour à l'espace Membre, sans message de réservation ni demande de carte.
    if (!ajoute) {
      router.push("/club/membre");
      router.refresh();
      return;
    }
    // Sans carte enregistrée, on enchaîne sur son enregistrement (rien n'est débité).
    // La réservation qui fait atteindre le seuil d'un domaine déclenche la célébration.
    const lance = groups.find((g) => {
      const p = progress[g.domain.id] || { reserved_bottles: 0 };
      return g.domain.threshold && p.reserved_bottles < g.domain.threshold && p.reserved_bottles + g.delta >= g.domain.threshold;
    });
    router.push(
      hasCard
        ? `/club/membre?reserve=1${lance ? `&lance=${encodeURIComponent(lance.domain.slug)}` : ""}`
        : "/club/membre/carte?apres=reservation"
    );
    router.refresh();
  }

  if (!ready || rows === null) {
    return (
      <p className="muted" style={{ textAlign: "center" }}>
        Chargement du panier…
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <section className="card stack" style={{ textAlign: "center" }}>
        <h2>Votre panier est vide</h2>
        <p className="muted">
          Choisissez vos bouteilles sur la fiche d&apos;un domaine. Vos commandes déjà lancées se trouvent dans
          votre espace Membre.
        </p>
        <Link href="/club/selection" className="btn">
          Parcourir la Sélection
        </Link>
      </section>
    );
  }

  return (
    <div className="stack">
      {changes === 0 && !saving && (
        <p className="muted" style={{ textAlign: "center" }}>
          Vos réservations en cours. Changez une quantité avec − ou + pour les modifier.
        </p>
      )}

      {retire && (
        <section className="card stack" role="status" style={{ borderColor: "var(--gold)" }}>
          <p>
            <strong>Vos retraits ne sont pas encore pris en compte.</strong>
          </p>
          <p className="muted">
            Les bouteilles marquées « sera annulée » restent réservées tant que vous n&apos;avez pas validé avec le
            bouton « {libelleBouton} », en bas de cette page.
          </p>
        </section>
      )}

      {groups.map((g) => {
        const p = progress[g.domain.id] || { reserved_bottles: 0, participants: 0 };
        return (
          <section className="card stack" key={g.domain.id}>
            <div className="row">
              <h3>
                <Link href={`/club/domaine/${g.domain.slug}`} style={{ color: "var(--ivory)" }}>
                  {g.domain.name}
                </Link>
              </h3>
              <p className="price">{euros(g.subtotal)}</p>
            </div>
            {g.items.map((c) => (
              <div className="cart-line" key={c.id}>
                <div>
                  <p>{c.name}</p>
                  <p className="muted">
                    {c.vintage || "Sans millésime"} · {euros(c.member_price)}
                    {c.qty === 0 && c.before > 0 ? " · sera annulée" : ""}
                    {c.qty === c.before && c.before > 0 ? " · réservée" : ""}
                    {c.qty > 0 && c.qty < c.before ? ` · passera de ${c.before} à ${c.qty}` : ""}
                  </p>
                </div>
                <CuveeStepper cuveeId={c.id} domainSlug={g.domain.slug} step={c.pack_size} reserved={c.before} label={c.name} />
              </div>
            ))}
            {g.domain.threshold ? (
              <Gauge
                reserved={Math.max(0, p.reserved_bottles + g.delta)}
                threshold={g.domain.threshold}
                participants={p.participants}
                deadline={g.domain.deadline}
                showDeadline
                mine={g.items.reduce((n, c) => n + c.qty, 0)}
                size={64}
              />
            ) : null}
          </section>
        );
      })}

      <section className="card stack">
        <div className="row">
          <p>
            {changes === 0 ? "Total réservé" : "Total"} · {bottles} bouteille{bottles > 1 ? "s" : ""}
          </p>
          <p className="price" style={{ fontSize: 22 }}>
            {euros(total)}
          </p>
        </div>
        {changes === 0 && !saving ? (
          <p className="muted">
            Tout est enregistré. Vous ne serez débité que si la commande est lancée.
          </p>
        ) : (
          <>
          {annulationSeule ? (
            <p className="muted">
              Ces bouteilles seront retirées de vos réservations. Rien ne vous a été débité.
            </p>
          ) : (
            <div className="recap">
              <p className="recap-titre">Ce qui se passe ensuite</p>
              <ol className="recap-etapes">
                <li>
                  <strong>Aujourd’hui</strong> : vos bouteilles sont réservées, rien n’est débité.
                  {hasCard ? "" : " Vous enregistrerez ensuite votre carte, toujours sans débit."}
                </li>
                <li>
                  <strong>Jusqu’au lancement</strong> : vous pouvez ajouter, retirer ou annuler, librement et sans frais.
                </li>
                <li>
                  <strong>Seuil atteint</strong> : la commande part chez le vigneron. Vous êtes prévenu, puis débité de vos
                  seules bouteilles de ce domaine{groups.length > 1 ? ", domaine par domaine" : ""}.
                </li>
                <li>
                  <strong>Seuil non atteint à la clôture</strong> : la commande est annulée, vous n’êtes pas débité et vous
                  êtes prévenu.
                </li>
              </ol>
            </div>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="btn" onClick={confirm} disabled={saving}>
            {saving ? "Enregistrement…" : libelleBouton}
          </button>
          {!annulationSeule && (
            <p className="muted sous-btn">
              Vous ne serez débité que si la commande est lancée. Modifiable ou annulable jusque-là.
            </p>
          )}
          <p className="sous-btn">
            <Link href="/regles" className="terms-link">
              Comment fonctionne une commande ?
            </Link>
          </p>
          <button type="button" className="link-btn" onClick={() => clearLines()}>
            Abandonner ces modifications
          </button>
          {retire && (
            <p className="muted sous-btn">Vos réservations actuelles resteront alors inchangées.</p>
          )}
          </>
        )}
      </section>
    </div>
  );
}
