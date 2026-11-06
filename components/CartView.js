"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { clearLines, reservationError, useCart } from "@/lib/cart";
import { euros } from "@/lib/catalogue";
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

  useEffect(() => {
    if (!ready) return;
    const ids = Object.keys(cart);
    if (ids.length === 0) {
      setRows([]);
      return;
    }
    const supabase = createClient();
    (async () => {
      const [{ data: cuvees }, { data: resa }] = await Promise.all([
        supabase
          .from("cuvees")
          .select("id, name, vintage, member_price, pack_size, domains(id, name, slug, threshold, status, deadline)")
          .in("id", ids),
        supabase
          .from("reservations")
          .select("cuvee_id, quantity")
          .eq("member_id", memberId)
          .eq("status", "en_attente")
          .in("cuvee_id", ids),
      ]);
      const cur = {};
      (resa || []).forEach((r) => (cur[r.cuvee_id] = (cur[r.cuvee_id] || 0) + r.quantity));
      const domainIds = [...new Set((cuvees || []).map((c) => c.domains.id))];
      const { data: prog } = domainIds.length
        ? await supabase.from("domain_progress").select("domain_id, reserved_bottles, participants").in("domain_id", domainIds)
        : { data: [] };
      setCurrent(cur);
      setProgress(Object.fromEntries((prog || []).map((p) => [p.domain_id, p])));
      setRows(cuvees || []);
    })();
    // On charge une seule fois : les lignes restent affichées même si on revient à la quantité d'origine.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

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

  async function confirm() {
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
    clearLines();
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

  if (rows.length === 0 || (changes === 0 && !saving)) {
    return (
      <section className="card stack" style={{ textAlign: "center" }}>
        <h2>Votre panier est vide</h2>
        <p className="muted">
          Choisissez vos bouteilles sur la fiche d&apos;un domaine. Vos réservations déjà enregistrées se trouvent
          dans votre espace Membre.
        </p>
        <Link href="/club/selection" className="btn">
          Parcourir la Sélection
        </Link>
      </section>
    );
  }

  return (
    <div className="stack">
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
            Total · {bottles} bouteille{bottles > 1 ? "s" : ""}
          </p>
          <p className="price" style={{ fontSize: 22 }}>
            {euros(total)}
          </p>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="btn" onClick={confirm} disabled={saving}>
          {saving ? "Enregistrement…" : "Réserver mes bouteilles"}
        </button>
        <p className="muted sous-btn">
          Vous ne serez débité que si la commande est lancée. Modifiable ou annulable jusque-là.
        </p>
        <p className="sous-btn">
          <Link href="/regles" className="terms-link">
            Comment fonctionne une commande ?
          </Link>
        </p>
        <button type="button" className="link-btn" onClick={() => clearLines()}>
          Vider le panier
        </button>
      </section>
    </div>
  );
}
