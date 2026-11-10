import Link from "next/link";
import { notFound } from "next/navigation";
import "@/app/ergonomie.css";
import { requireAdmin } from "@/lib/data";
import { COLOR_LABELS, euros } from "@/lib/catalogue";
import { updateCuveeFiche, updateCuveeVente } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

const LABELS = [
  ["bio", "Bio"],
  ["biodynamie", "Biodynamie"],
  ["nature", "Nature"],
];

const COULEURS = [
  ["rouge", "Rouge"],
  ["blanc", "Blanc"],
  ["rose", "Rosé"],
  ["bulles", "Bulles"],
  ["autre", "Autre"],
];

// Admin : compléter la fiche de chaque cuvée (cépages, élevage, accords, service, garde, degré, labels).
export default async function FichesCuvees({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const { supabase } = await requireAdmin();

  const { data: domain } = await supabase.from("domains").select("id, name, slug").eq("slug", slug).maybeSingle();
  if (!domain) notFound();

  const { data: cuvees } = await supabase
    .from("cuvees")
    .select(
      "id, name, vintage, color, member_price, pack_size, is_favorite, active, description, cepages, elevage, accords, service, garde, degre, labels, source_fiche"
    )
    .eq("domain_id", domain.id)
    .order("active", { ascending: false })
    .order("name");

  const list = cuvees || [];
  const remplie = (c) => c.cepages || c.elevage || c.accords || c.service || c.garde || c.degre || (c.labels || []).length;
  const nb = list.filter(remplie).length;

  return (
    <main className="shell admin-fiches">
      <Link href={`/admin/domaine/${slug}`} className="muted">
        ← {domain.name}
      </Link>
      <h1 style={{ fontSize: 28, marginTop: 16 }}>Cuvées : prix et fiches</h1>
      <p className="lead">
        {nb} cuvée{nb > 1 ? "s" : ""} renseignée{nb > 1 ? "s" : ""} sur {list.length}. Seules les informations remplies
        apparaissent aux membres : laissez vide ce qui n&apos;est pas sûr.
      </p>
      {sp?.ok && (
        <p className="success" role="status">
          Fiche enregistrée.
        </p>
      )}
      {sp?.erreur && (
        <p className="error" role="alert">
          L&apos;enregistrement a échoué. Réessayez.
        </p>
      )}

      <div className="stack" style={{ marginTop: 16 }}>
        {list.map((c) => (
          <details key={c.id} id={`c-${c.id}`} className="card fiche-edit" open={sp?.ok === c.id}>
            <summary>
              <span className="fiche-nom">
                {c.name}
                {c.vintage ? ` ${c.vintage}` : ""}
              </span>
              <span className="muted fiche-meta">
                {COLOR_LABELS[c.color] || c.color} · {euros(c.member_price)}
                {c.active ? "" : " · inactive"}
                {remplie(c) ? " · fiche renseignée" : " · fiche vide"}
              </span>
            </summary>
            <form action={updateCuveeVente} className="stack fiche-form fiche-vente">
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="slug" value={slug} />
              <p className="fiche-section">Vente</p>
              <label>
                Nom de la cuvée
                <input name="name" required defaultValue={c.name} />
              </label>
              <div className="fiche-row">
                <label>
                  Prix membre (€)
                  <input name="member_price" required inputMode="decimal" defaultValue={String(c.member_price).replace(".", ",")} />
                </label>
                <label>
                  Vendu par (bouteilles)
                  <input name="pack_size" required inputMode="numeric" defaultValue={c.pack_size} />
                </label>
              </div>
              <div className="fiche-row">
                <label>
                  Millésime
                  <input name="vintage" inputMode="numeric" defaultValue={c.vintage ?? ""} placeholder="vide = sans millésime" />
                </label>
                <label>
                  Couleur
                  <select name="color" defaultValue={c.color}>
                    {COULEURS.map(([v, t]) => (
                      <option key={v} value={v}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="fiche-labels">
                <label className="fiche-check">
                  <input type="checkbox" name="active" defaultChecked={c.active} /> En vente
                </label>
                <label className="fiche-check">
                  <input type="checkbox" name="is_favorite" defaultChecked={c.is_favorite} /> Coup de cœur
                </label>
              </div>
              <p className="muted fiche-note">
                Les réservations déjà faites gardent leur prix. Un membre qui modifie ensuite sa quantité passe au nouveau prix.
              </p>
              <button className="btn" type="submit">
                Enregistrer la vente
              </button>
            </form>
            <p className="fiche-section">Fiche détaillée</p>
            <form action={updateCuveeFiche} className="stack fiche-form">
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="slug" value={slug} />
              <label>
                Accroche (phrase courte affichée sous le nom)
                <textarea name="description" rows={2} defaultValue={c.description || ""} />
              </label>
              <label>
                Cépages
                <input name="cepages" defaultValue={c.cepages || ""} placeholder="ex. Syrah 70 %, grenache 30 %" />
              </label>
              <label>
                Élevage
                <textarea name="elevage" rows={2} defaultValue={c.elevage || ""} placeholder="ex. 12 mois en fûts de chêne" />
              </label>
              <label>
                Accords
                <textarea name="accords" rows={2} defaultValue={c.accords || ""} placeholder="ex. Agneau rôti, fromages de chèvre" />
              </label>
              <div className="fiche-row">
                <label>
                  Service
                  <input name="service" defaultValue={c.service || ""} placeholder="ex. 16-18 °C" />
                </label>
                <label>
                  Degré (%)
                  <input name="degre" inputMode="decimal" defaultValue={c.degre ?? ""} placeholder="ex. 13,5" />
                </label>
              </div>
              <label>
                Garde
                <input name="garde" defaultValue={c.garde || ""} placeholder="ex. À boire jusqu'en 2032" />
              </label>
              <fieldset className="fiche-labels">
                <legend>Labels</legend>
                {LABELS.map(([v, t]) => (
                  <label key={v} className="fiche-check">
                    <input type="checkbox" name="labels" value={v} defaultChecked={(c.labels || []).includes(v)} /> {t}
                  </label>
                ))}
              </fieldset>
              <label>
                Source (lien de la fiche technique)
                <input name="source_fiche" type="url" defaultValue={c.source_fiche || ""} placeholder="https://…" />
              </label>
              <button className="btn" type="submit">
                Enregistrer la fiche
              </button>
            </form>
          </details>
        ))}
      </div>
    </main>
  );
}
