import { requireAdmin, ACTIVE_RESERVATION } from "@/lib/data";

// Export CSV (séparateur « ; » et BOM pour une ouverture directe dans Excel).
function csv(rows) {
  const esc = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "\uFEFF" + rows.map((r) => r.map(esc).join(";")).join("\r\n");
}

const num = (n) => Number(n).toFixed(2).replace(".", ",");

export async function GET(request, { params }) {
  const { slug } = await params;
  const vue = new URL(request.url).searchParams.get("vue");
  const { supabase } = await requireAdmin();

  const { data: domain } = await supabase.from("domains").select("id, name, slug").eq("slug", slug).maybeSingle();
  if (!domain) return new Response("Domaine introuvable", { status: 404 });

  const { data: resa } = await supabase
    .from("reservations")
    .select("quantity, unit_price, created_at, members(member_number, first_name, last_name, email, phone), cuvees!inner(id, name, vintage, domain_id)")
    .eq("cuvees.domain_id", domain.id)
    .in("status", ACTIVE_RESERVATION)
    .eq("archived", false)
    .order("created_at");
  const lines = resa || [];

  let rows;
  if (vue === "cuvees") {
    const by = {};
    for (const r of lines) {
      const c = (by[r.cuvees.id] ||= { name: r.cuvees.name, vintage: r.cuvees.vintage, qty: 0, price: r.unit_price });
      c.qty += r.quantity;
    }
    rows = [["Cuvée", "Millésime", "Bouteilles", "Prix adhérent", "Total"]];
    Object.values(by).forEach((c) => rows.push([c.name, c.vintage || "", c.qty, num(c.price), num(c.qty * c.price)]));
  } else {
    rows = [["N° membre", "Prénom", "Nom", "E-mail", "Téléphone", "Cuvée", "Millésime", "Quantité", "Prix unitaire", "Total"]];
    lines.forEach((r) =>
      rows.push([
        r.members?.member_number,
        r.members?.first_name,
        r.members?.last_name,
        r.members?.email,
        r.members?.phone,
        r.cuvees.name,
        r.cuvees.vintage || "",
        r.quantity,
        num(r.unit_price),
        num(r.quantity * r.unit_price),
      ])
    );
  }

  const file = `${domain.slug}-${vue === "cuvees" ? "cuvees" : "membres"}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(csv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file}"`,
    },
  });
}
