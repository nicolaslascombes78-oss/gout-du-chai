import Link from "next/link";
import LoginForm from "@/components/LoginForm";

export default async function Connexion({ searchParams }) {
  // Page où revenir après la connexion (seulement une page du club).
  const params = await searchParams;
  const n = (params?.next || "").toString();
  const next = n.startsWith("/club") && !n.startsWith("//") ? n : null;

  return (
    <main className="shell">
      <p className="brand">
        <Link href="/">Le Goût du Chai</Link>
      </p>
      <h1>Bon retour parmi nous</h1>
      <p className="lead">Recevez votre code d&apos;accès par e-mail.</p>
      <div className="ornament" />
      <section className="card">
        <LoginForm next={next} />
      </section>
      <section className="section" style={{ textAlign: "center" }}>
        <p className="muted">
          Pas encore membre ? <Link href="/">J&apos;ai un code d&apos;invitation</Link>
        </p>
      </section>
    </main>
  );
}
