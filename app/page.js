import Link from "next/link";
import { redirect } from "next/navigation";
import InviteForm from "@/components/InviteForm";
import { createClient } from "@/lib/supabase/server";

// Quelques vignerons en vitrine (pas de prix en public).
const VITRINE = [
  { region: "Beaujolais", name: "Domaine Foillard", appellation: "Morgon" },
  { region: "Champagne", name: "Larmandier-Bernier", appellation: "Côte des Blancs" },
  { region: "Roussillon", name: "Clos des Fées", appellation: "Côtes du Roussillon" },
  { region: "Bordeaux", name: "Château Le Puy", appellation: "Francs Côtes de Bordeaux" },
];

export default async function Home({ searchParams }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/club");

  const params = await searchParams;
  const erreur = params?.erreur;

  return (
    <main className="shell">
      <p className="brand">Le Goût du Chai</p>

      <h1>Le club des vignerons confidentiels</h1>
      <p className="lead">
        Des vignerons que vous ne trouverez pas ailleurs, à des prix que vous ne
        trouverez pas ailleurs, dans un cercle où l&apos;on partage la même passion.
      </p>
      <div className="ornament" />

      <section className="card stack">
        <p className="eyebrow">Sur invitation</p>
        <h2>Rejoindre le cercle</h2>
        <p className="muted">
          L&apos;accès au club se fait uniquement par invitation d&apos;un membre.
          Saisissez votre code personnel.
        </p>
        {erreur && <p className="error">{messageErreur(erreur)}</p>}
        <InviteForm />
      </section>

      <section className="section stack">
        <p className="eyebrow">Quelques maisons de la sélection</p>
        <div className="vitrine">
          {VITRINE.map((d) => (
            <div className="card" key={d.name}>
              <p className="muted">{d.region}</p>
              <h3>{d.name}</h3>
              <p className="muted">{d.appellation}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section" style={{ textAlign: "center" }}>
        <p className="muted">
          Déjà membre ? <Link href="/connexion">Se connecter</Link>
        </p>
      </section>

      <footer className="foot">
        L&apos;abus d&apos;alcool est dangereux pour la santé, à consommer avec modération.
        Vente réservée aux personnes majeures.
      </footer>
    </main>
  );
}

function messageErreur(code) {
  switch (code) {
    case "invitation":
      return "Ce code d'invitation n'est plus valable. Demandez un nouveau code à votre parrain.";
    case "lien":
      return "Le lien de connexion a expiré ou a déjà servi. Demandez-en un nouveau.";
    default:
      return "Une erreur est survenue. Merci de réessayer.";
  }
}
