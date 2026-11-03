import Link from "next/link";
import LoginForm from "@/components/LoginForm";

export default function Connexion() {
  return (
    <main className="shell">
      <p className="brand">
        <Link href="/">Le Goût du Chai</Link>
      </p>
      <h1>Bon retour parmi nous</h1>
      <p className="lead">Recevez votre lien d&apos;accès par e-mail.</p>
      <div className="ornament" />
      <section className="card">
        <LoginForm />
      </section>
      <section className="section" style={{ textAlign: "center" }}>
        <p className="muted">
          Pas encore membre ? <Link href="/">J&apos;ai un code d&apos;invitation</Link>
        </p>
      </section>
    </main>
  );
}
