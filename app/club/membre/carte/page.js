import Link from "next/link";
import ClubHeader from "@/components/ClubHeader";
import { requireMember } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, nomMarque } from "@/lib/stripe";
import { enregistrerCarte, marquerPaye } from "@/lib/paiements";
import { enregistrerCarteAction, payerCommande } from "./actions";

export const dynamic = "force-dynamic";

const euros = (cents) =>
  (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

const A_REGLER = {
  action_requise: "Votre banque demande une validation.",
  refusee: "Le paiement n'a pas abouti.",
  sans_carte: "Aucune carte n'était enregistrée.",
};

export default async function Carte({ searchParams }) {
  const { supabase, member } = await requireMember();
  const sp = await searchParams;
  let message = null;
  let erreur = sp?.erreur ? "L'opération n'a pas abouti. Réessayez dans un instant." : null;

  // Retour de la page Stripe : on vérifie directement auprès de Stripe avant d'enregistrer.
  if (sp?.session_id || sp?.paiement) {
    try {
      const db = createAdminClient();
      if (sp.session_id) {
        const s = await stripe().checkout.sessions.retrieve(String(sp.session_id), { expand: ["setup_intent"] });
        const pm = s.setup_intent?.payment_method;
        if (s.metadata?.member_id === member.id && s.status === "complete" && pm) {
          await enregistrerCarte(db, member.id, typeof pm === "string" ? pm : pm.id);
          message = "Votre carte est enregistrée. Elle ne sera débitée qu'au lancement d'une commande.";
        }
      } else {
        const s = await stripe().checkout.sessions.retrieve(String(sp.paiement), { expand: ["payment_intent"] });
        const pi = s.payment_intent;
        if (s.metadata?.member_id === member.id && s.payment_status === "paid" && pi) {
          await marquerPaye(db, { domainId: s.metadata.domain_id, memberId: member.id, piId: pi.id });
          if (pi.payment_method) {
            await enregistrerCarte(db, member.id, typeof pi.payment_method === "string" ? pi.payment_method : pi.payment_method.id);
          }
          message = "Paiement reçu, merci. Votre commande est réglée.";
        }
      }
    } catch {
      erreur = "Nous n'avons pas pu confirmer l'opération. Si elle a abouti, elle apparaîtra ici d'ici quelques minutes.";
    }
  }

  const [{ data: carte }, { data: aRegler }] = await Promise.all([
    supabase.from("member_cards").select("brand, last4, exp, payment_method").eq("member_id", member.id).maybeSingle(),
    supabase
      .from("payments")
      .select("id, amount_cents, status, domains(name, slug)")
      .eq("member_id", member.id)
      .in("status", ["action_requise", "refusee", "sans_carte"])
      .order("created_at"),
  ]);
  const aUneCarte = Boolean(carte?.payment_method);

  return (
    <main className="shell">
      <ClubHeader />
      <h1 style={{ fontSize: 32 }}>Paiement</h1>
      <div className="ornament" />

      {sp?.apres === "reservation" && !aUneCarte && (
        <div className="card stack reserve-ok" role="status">
          <p className="reserve-ok-t">C&apos;est réservé !</p>
          <p className="muted">
            Dernière étape : enregistrez votre carte, pour que votre commande puisse partir dès que le seuil est atteint.
            Rien n&apos;est débité aujourd&apos;hui.
          </p>
        </div>
      )}
      {message && (
        <p className="success" role="status">
          {message}
        </p>
      )}
      {sp?.annule && !message && <p className="muted">Opération annulée, rien n&apos;a été modifié.</p>}
      {erreur && (
        <p className="error" role="alert">
          {erreur}
        </p>
      )}

      {(aRegler || []).length > 0 && (
        <section className="section stack">
          <h2>À régler</h2>
          {aRegler.map((p) => (
            <form action={payerCommande} className="card stack" key={p.id}>
              <input type="hidden" name="payment_id" value={p.id} />
              <div className="row">
                <h3>{p.domains?.name}</h3>
                <p className="price">{euros(p.amount_cents)}</p>
              </div>
              <p className="muted">{A_REGLER[p.status]} La commande est lancée : réglez-la pour recevoir vos bouteilles.</p>
              <button className="btn">{p.status === "action_requise" ? "Valider le paiement" : "Régler ma commande"}</button>
            </form>
          ))}
        </section>
      )}

      <section className="section stack">
        <h2>Ma carte</h2>
        <div className="card stack">
          {aUneCarte ? (
            <>
              <div className="row">
                <p>
                  {nomMarque(carte.brand)} •••• {carte.last4}
                </p>
                {carte.exp && <p className="muted">exp. {carte.exp}</p>}
              </div>
              <p className="muted">
                Débitée uniquement quand la commande d&apos;un domaine est lancée, du montant exact de vos bouteilles.
              </p>
            </>
          ) : (
            <p className="muted">
              Aucune carte enregistrée. Elle est nécessaire pour que vos commandes puissent partir. Rien n&apos;est
              débité à l&apos;enregistrement.
            </p>
          )}
          <form action={enregistrerCarteAction}>
            <button className={aUneCarte ? "btn btn-ghost" : "btn"}>
              {aUneCarte ? "Changer de carte" : "Enregistrer ma carte"}
            </button>
          </form>
          <p className="muted">
            Paiement sécurisé par Stripe, avec la validation de votre banque. Le club ne voit jamais votre numéro de
            carte.
          </p>
        </div>
      </section>

      <section className="section">
        <Link href="/club/membre" className="btn btn-ghost">
          Retour à mon espace
        </Link>
      </section>
    </main>
  );
}
