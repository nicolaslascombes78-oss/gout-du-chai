import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import "@/app/ergonomie.css";
import DomainImage from "@/components/DomainImage";
import InviteForm from "@/components/InviteForm";
import Seal from "@/components/Seal";
import { LegalLinks } from "@/components/LegalLayout";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { closingLabel } from "@/lib/catalogue";

export const dynamic = "force-dynamic";

// Page publique de partage d'une commande : ce que voit un ami qui reçoit le lien.
// Ni prix, ni noms de membres : seulement le domaine et l'avancement de la commande.
async function loadShared(slug) {
  try {
    const db = createAdminClient();
    const { data: d } = await db
      .from("domains")
      .select("id, slug, name, region, appellation, tagline, photos, photo_logo, photo_bg, threshold, deadline, status")
      .eq("slug", slug)
      .maybeSingle();
    if (!d) return null;
    // Avancement calculé directement sur les réservations (la vue domain_progress est réservée aux membres connectés).
    const { data: cuv } = await db.from("cuvees").select("id").eq("domain_id", d.id);
    const ids = (cuv || []).map((c) => c.id);
    const { data: rs } = ids.length
      ? await db
          .from("reservations")
          .select("member_id, quantity")
          .in("cuvee_id", ids)
          .in("status", ["en_attente", "confirmee", "payee"])
      : { data: [] };
    const reserved = (rs || []).reduce((t, r) => t + (r.quantity || 0), 0);
    const participants = new Set((rs || []).map((r) => r.member_id)).size;
    return { ...d, reserved, participants };
  } catch {
    return undefined; // lecture impossible : la page s'affiche sans le détail du domaine
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const d = await loadShared(slug);
  if (!d) return { title: "Le Goût du Chai — Club privé" };
  const missing = d.threshold ? Math.max(0, d.threshold - d.reserved) : 0;
  const description =
    missing > 0
      ? `Il manque ${missing} bouteille${missing > 1 ? "s" : ""} pour lancer la commande. Club privé, sur invitation.`
      : "Club privé de vignerons, sur invitation.";
  return {
    title: `${d.name} — Le Goût du Chai`,
    description,
    openGraph: {
      title: `${d.name} · une commande au Goût du Chai`,
      description,
      images: d.photos?.[0] ? [d.photos[0]] : [],
    },
  };
}

export default async function Partage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const code = (sp?.code || "").toString().trim().toUpperCase();

  // Un membre connecté va directement sur la fiche du domaine.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(`/club/domaine/${slug}`);

  const d = await loadShared(slug);
  if (d === null) notFound();

  const next = `/club/domaine/${slug}`;
  const missing = d?.threshold ? Math.max(0, d.threshold - d.reserved) : 0;
  const close = d ? closingLabel(d.deadline) : null;

  // Invitation jointe au lien : on vérifie le code, l'ami n'a plus qu'à créer son compte.
  let invitationOk = false;
  if (code) {
    const { data } = await supabase.rpc("check_invitation", { p_code: code });
    invitationOk = Boolean(data);
  }

  return (
    <main className="shell share">
      <p className="brand">
        <Link href="/">Le Goût du Chai</Link>
      </p>

      {d ? (
        <>
          <p className="share-kicker">Une commande en cours au club</p>
          <DomainImage domain={d} variant="hero" />
          <p className="eyebrow" style={{ marginTop: 18 }}>
            {d.region}
            {d.appellation ? ` · ${d.appellation}` : ""}
          </p>
          <h1 className="share-title">{d.name}</h1>
          {d.tagline && <p className="sel-intro">{d.tagline}</p>}
          {d.threshold ? (
            <div className="gauge-row share-seal">
              <Seal reserved={d.reserved} threshold={d.threshold} size={96} />
              <div className="gauge-lines">
                <p className="gauge-txt">
                  {missing > 0 ? (
                    <>
                      Il manque <strong>{missing} bouteille{missing > 1 ? "s" : ""}</strong> pour lancer la commande.
                    </>
                  ) : (
                    "Le seuil est atteint : la commande part chez le vigneron."
                  )}
                </p>
                {d.participants > 0 && (
                  <p className="muted gauge-txt">
                    {d.participants} membre{d.participants > 1 ? "s" : ""} y participe{d.participants > 1 ? "nt" : ""}
                  </p>
                )}
                {close && <p className="muted gauge-txt">{close}</p>}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <h1 className="share-title">Une commande vous attend au club</h1>
      )}

      <section className="card stack share-invite">
        <h2 className="home-h2">{invitationOk ? "Vous êtes invité" : "Rejoindre le club"}</h2>
        <p className="muted">
          Le Goût du Chai est un club privé d&apos;amateurs : on y commande ensemble chez des vignerons choisis, au
          prix adhérent.{" "}
          {invitationOk
            ? "Votre invitation est jointe à ce lien : il ne reste qu'à créer votre compte, en une minute."
            : "L'accès se fait sur invitation : demandez votre code à la personne qui vous a envoyé ce lien."}
        </p>
        {invitationOk ? (
          <Link href={`/rejoindre?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`} className="btn">
            Accepter l&apos;invitation
          </Link>
        ) : (
          <>
            {code && (
              <p className="error" role="alert">
                Ce code d&apos;invitation n&apos;est plus valable. Demandez-en un nouveau.
              </p>
            )}
            <InviteForm next={next} />
          </>
        )}
      </section>

      <p className="muted" style={{ textAlign: "center", marginTop: 18 }}>
        Déjà membre ? <Link href={`/connexion?next=${encodeURIComponent(next)}`}>Se connecter</Link>
      </p>

      <LegalLinks />
    </main>
  );
}
